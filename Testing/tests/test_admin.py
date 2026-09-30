import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as expected
from selenium.webdriver.support.ui import WebDriverWait

from conftest import env, require_env
from pages import AdminLoginPage, Page


ADMIN_ROUTES = (
    "/dashboard",
    "/organizations",
    "/subscriptions",
    "/payments",
    "/dashboard/sms",
    "/dashboard/users",
)


def sign_in(browser, admin_url, timeout) -> Page:
    username, password = require_env("BUSOS_E2E_ADMIN_USERNAME", "BUSOS_E2E_ADMIN_PASSWORD")
    AdminLoginPage(browser, admin_url, timeout).login(username, password)
    return Page(browser, admin_url, timeout)


@pytest.mark.admin
def test_admin_can_open_every_platform_module(browser, admin_url, timeout):
    page = sign_in(browser, admin_url, timeout)
    failures = []

    for path in ADMIN_ROUTES:
        try:
            page.open(path)
            page.assert_path(path)
            heading = page.heading()
            assert heading.text.strip(), "Page heading is empty"
            page.assert_no_next_error()
        except Exception as exception:
            failures.append(f"{path}: {exception}")

    assert not failures, "Admin module smoke failures:\n" + "\n".join(failures)


@pytest.mark.admin
def test_admin_can_search_seeded_organizations(browser, admin_url, timeout):
    page = sign_in(browser, admin_url, timeout)
    page.open("/organizations")

    search = page.visible(By.CSS_SELECTOR, "input[placeholder='Search organizations...']")
    search.send_keys(env("BUSOS_E2E_ORGANIZATION_QUERY", "a"))
    assert WebDriverWait(browser, timeout).until(
        expected.visibility_of_element_located((By.TAG_NAME, "table"))
    )

