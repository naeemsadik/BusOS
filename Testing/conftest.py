from __future__ import annotations

import os
import re
import time
from pathlib import Path

import pytest
from selenium import webdriver
from selenium.common.exceptions import WebDriverException


ROOT = Path(__file__).parent
ARTIFACTS = ROOT / "artifacts"


def _load_dotenv(path: Path) -> None:
    """Load the small KEY=VALUE subset used by the local test file."""
    if not path.exists():
        return
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


_load_dotenv(ROOT / ".env")


def env(name: str, default: str = "") -> str:
    return os.getenv(name, default).strip()


def enabled(name: str) -> bool:
    return env(name).lower() in {"1", "true", "yes", "on"}


def require_env(*names: str) -> list[str]:
    missing = [name for name in names if not env(name)]
    if missing:
        pytest.skip(f"Set {', '.join(missing)} to run this seeded-environment test.")
    return [env(name) for name in names]


def pytest_addoption(parser: pytest.Parser) -> None:
    group = parser.getgroup("selenium")
    group.addoption("--base-url", default=env("BUSOS_E2E_BASE_URL", "http://127.0.0.1:3000"))
    group.addoption("--admin-url", default=env("BUSOS_E2E_ADMIN_URL", "http://127.0.0.1:3001"))
    group.addoption(
        "--busos-browser",
        choices=("chrome", "firefox", "edge"),
        default=env("BUSOS_E2E_BROWSER", "chrome"),
    )
    headless = env("BUSOS_E2E_HEADLESS", "true").lower() in {"1", "true", "yes", "on"}
    group.addoption("--busos-headed", action="store_true", default=not headless)
    group.addoption("--busos-pause", type=float, default=float(env("BUSOS_E2E_PAUSE", "3")))


@pytest.fixture(scope="session")
def base_url(pytestconfig: pytest.Config) -> str:
    return pytestconfig.getoption("--base-url").rstrip("/")


@pytest.fixture(scope="session")
def admin_url(pytestconfig: pytest.Config) -> str:
    return pytestconfig.getoption("--admin-url").rstrip("/")


@pytest.fixture(scope="session")
def timeout() -> float:
    return float(env("BUSOS_E2E_TIMEOUT", "15"))


def _window_size() -> tuple[int, int]:
    match = re.fullmatch(r"(\d+)x(\d+)", env("BUSOS_E2E_WINDOW", "1440x900"))
    if not match:
        raise pytest.UsageError("BUSOS_E2E_WINDOW must look like 1440x900")
    return int(match.group(1)), int(match.group(2))


def _options(browser_name: str, headed: bool):
    if browser_name == "firefox":
        options = webdriver.FirefoxOptions()
        if not headed:
            options.add_argument("-headless")
        options.accept_insecure_certs = True
        return options

    options = webdriver.EdgeOptions() if browser_name == "edge" else webdriver.ChromeOptions()
    if not headed:
        options.add_argument("--headless=new")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-search-engine-choice-screen")
    options.accept_insecure_certs = True
    return options


@pytest.fixture
def browser(request: pytest.FixtureRequest, pytestconfig: pytest.Config):
    browser_name = pytestconfig.getoption("--busos-browser")
    options = _options(browser_name, pytestconfig.getoption("--busos-headed"))
    remote_url = env("SELENIUM_REMOTE_URL")

    if remote_url:
        driver = webdriver.Remote(command_executor=remote_url, options=options)
    elif browser_name == "firefox":
        driver = webdriver.Firefox(options=options)
    elif browser_name == "edge":
        driver = webdriver.Edge(options=options)
    else:
        driver = webdriver.Chrome(options=options)

    width, height = _window_size()
    driver.set_window_size(width, height)
    driver.set_page_load_timeout(float(env("BUSOS_E2E_TIMEOUT", "15")) * 2)
    yield driver

    report = getattr(request.node, "rep_call", None)
    if report and report.failed:
        try:
            ARTIFACTS.mkdir(exist_ok=True)
            name = re.sub(r"[^A-Za-z0-9_.-]+", "_", request.node.nodeid)
            driver.save_screenshot(str(ARTIFACTS / f"{name}.png"))
            (ARTIFACTS / f"{name}.html").write_text(driver.page_source, encoding="utf-8")
        except WebDriverException:
            pass
    if report and not report.skipped and pytestconfig.getoption("--busos-headed"):
        time.sleep(max(0, pytestconfig.getoption("--busos-pause")))
    try:
        driver.quit()
    except WebDriverException:
        pass


@pytest.hookimpl(hookwrapper=True)
def pytest_runtest_makereport(item: pytest.Item, call: pytest.CallInfo):
    outcome = yield
    report = outcome.get_result()
    setattr(item, f"rep_{report.when}", report)

