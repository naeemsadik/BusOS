import pytest
from selenium.common.exceptions import InvalidSessionIdException
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as expected
from selenium.webdriver.support.ui import WebDriverWait

from conftest import enabled, require_env
from pages import LoginPage, Page


OWNER_ROUTES = (
    "/dashboard",
    "/pos",
    "/inventory",
    "/orders",
    "/customers",
    "/suppliers",
    "/expenses",
    "/reports",
    "/delivery",
    "/hrm",
    "/loyalty",
    "/sms",
    "/social-content",
    "/website",
    "/subscription",
    "/profile",
    "/settings",
)


def sign_in(browser, base_url, timeout, role="owner") -> Page:
    prefix = "BUSOS_E2E_OWNER" if role == "owner" else "BUSOS_E2E_STAFF"
    email, password = require_env(f"{prefix}_EMAIL", f"{prefix}_PASSWORD")
    LoginPage(browser, base_url, timeout).login(email, password)
    return Page(browser, base_url, timeout)


@pytest.mark.owner
def test_owner_can_open_every_application_module(browser, base_url, timeout):
    page = sign_in(browser, base_url, timeout)
    failures = []

    for path in OWNER_ROUTES:
        try:
            page.open(path)
            page.assert_path(path)
            heading = page.heading()
            assert heading.text.strip(), "Page heading is empty"
            page.assert_no_next_error()
        except InvalidSessionIdException as exception:
            pytest.fail(f"Chrome disconnected while checking {path}: {exception.msg}")
        except Exception as exception:
            failures.append(f"{path}: {exception}")

    assert not failures, "Module smoke failures:\n" + "\n".join(failures)


@pytest.mark.owner
def test_owner_hrm_workspace_has_all_management_tabs(browser, base_url, timeout):
    page = sign_in(browser, base_url, timeout)
    page.open("/hrm")

    page.heading()
    tabs = page.all_visible(By.CSS_SELECTOR, "[role='tablist'] [role='tab']")
    assert len(tabs) == 4


@pytest.mark.staff
def test_staff_attendance_hides_compensation_details(browser, base_url, timeout):
    page = sign_in(browser, base_url, timeout, role="staff")
    page.open("/hrm/my-attendance")

    page.heading()
    assert browser.find_element(By.CSS_SELECTOR, "button").is_displayed()
    body = browser.find_element(By.TAG_NAME, "body").text.lower()
    assert "salary" not in body
    assert "payroll" not in body


@pytest.mark.owner
@pytest.mark.mutation
def test_pos_can_add_a_seeded_product_to_cart(browser, base_url, timeout):
    if not enabled("BUSOS_E2E_MUTATIONS"):
        pytest.skip("Set BUSOS_E2E_MUTATIONS=true to run seeded write-flow tests.")
    page = sign_in(browser, base_url, timeout)
    page.open("/pos")

    add = WebDriverWait(browser, timeout).until(
        expected.element_to_be_clickable(
            (By.XPATH, "//button[.//*[contains(concat(' ', normalize-space(@class), ' '), ' lucide-plus ')]]")
        )
    )
    add.click()
    WebDriverWait(browser, timeout).until(
        expected.presence_of_element_located((By.CSS_SELECTOR, "button[aria-label^='Remove ']"))
    )


@pytest.mark.owner
@pytest.mark.mutation
def test_inventory_seed_can_open_product_editor(browser, base_url, timeout):
    if not enabled("BUSOS_E2E_MUTATIONS"):
        pytest.skip("Set BUSOS_E2E_MUTATIONS=true to run seeded write-flow tests.")
    page = sign_in(browser, base_url, timeout)
    page.open("/inventory")

    actions = WebDriverWait(browser, timeout).until(
        expected.element_to_be_clickable((By.CSS_SELECTOR, "table button[aria-haspopup='menu']"))
    )
    actions.click()
    edit = WebDriverWait(browser, timeout).until(
        expected.element_to_be_clickable((By.XPATH, "//*[@role='menuitem' and normalize-space()='Edit']"))
    )
    edit.click()
    assert WebDriverWait(browser, timeout).until(
        expected.visibility_of_element_located((By.CSS_SELECTOR, "[role='dialog']"))
    )


@pytest.mark.owner
@pytest.mark.mutation
def test_owner_can_publish_storefront(browser, base_url, timeout):
    if not enabled("BUSOS_E2E_MUTATIONS"):
        pytest.skip("Set BUSOS_E2E_MUTATIONS=true to run seeded write-flow tests.")
    page = sign_in(browser, base_url, timeout)
    page.open("/website")

    publish = WebDriverWait(browser, timeout).until(
        expected.element_to_be_clickable((By.XPATH, "//button[normalize-space()='Publish']"))
    )
    publish.click()
    WebDriverWait(browser, timeout).until(
        lambda driver: "Published" in driver.find_element(By.TAG_NAME, "body").text
    )

