from __future__ import annotations

from urllib.parse import urljoin, urlparse

from selenium.common.exceptions import TimeoutException
from selenium.webdriver.common.by import By
from selenium.webdriver.remote.webdriver import WebDriver
from selenium.webdriver.support import expected_conditions as expected
from selenium.webdriver.support.ui import WebDriverWait


class Page:
    def __init__(self, driver: WebDriver, base_url: str, timeout: float = 15):
        self.driver = driver
        self.base_url = f"{base_url.rstrip('/')}/"
        self.wait = WebDriverWait(driver, timeout)

    def open(self, path: str = "/") -> "Page":
        self.driver.get(urljoin(self.base_url, path.lstrip("/")))
        self.wait.until(lambda driver: driver.execute_script("return document.readyState") == "complete")
        return self

    def visible(self, by: str, value: str):
        return self.wait.until(expected.visibility_of_element_located((by, value)))

    def all_visible(self, by: str, value: str):
        return self.wait.until(expected.visibility_of_all_elements_located((by, value)))

    def heading(self):
        return self.visible(By.TAG_NAME, "h1")

    def assert_path(self, expected_path: str) -> None:
        actual = urlparse(self.driver.current_url).path.rstrip("/") or "/"
        assert actual == (expected_path.rstrip("/") or "/")

    def assert_no_horizontal_overflow(self, tolerance: int = 1) -> None:
        overflow = self.driver.execute_script(
            "return document.documentElement.scrollWidth - document.documentElement.clientWidth"
        )
        assert overflow <= tolerance, f"Page overflows horizontally by {overflow}px"

    def assert_no_next_error(self) -> None:
        overlays = [
            self.driver.execute_script(
                "return arguments[0].shadowRoot && "
                "arguments[0].shadowRoot.querySelector('[data-nextjs-dialog-overlay]')",
                portal,
            )
            for portal in self.driver.find_elements(By.CSS_SELECTOR, "nextjs-portal")
        ]
        assert not any(overlays), "Next.js error overlay is visible"


class LoginPage(Page):
    def login(self, email: str, password: str) -> None:
        self.open("/auth/login")
        self.visible(By.ID, "email").send_keys(email)
        self.visible(By.ID, "password").send_keys(password)
        self.driver.find_element(By.CSS_SELECTOR, "form button[type='submit']").click()
        self.wait.until(lambda driver: "/auth/login" not in driver.current_url)


class AdminLoginPage(Page):
    def login(self, username: str, password: str) -> None:
        self.open("/login")
        self.visible(By.ID, "username").send_keys(username)
        self.visible(By.ID, "password").send_keys(password)
        self.driver.find_element(By.CSS_SELECTOR, "form button[type='submit']").click()
        try:
            self.wait.until(lambda driver: urlparse(driver.current_url).path != "/login")
        except TimeoutException as exception:
            alerts = self.driver.find_elements(By.CSS_SELECTOR, "[role='alert']")
            detail = alerts[0].text if alerts else "Admin login did not navigate away from /login"
            raise AssertionError(detail) from exception
