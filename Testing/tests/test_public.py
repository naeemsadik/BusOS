from urllib.parse import urlparse

import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as expected
from selenium.webdriver.support.ui import WebDriverWait

from conftest import require_env
from pages import Page


@pytest.mark.smoke
@pytest.mark.parametrize("size", [(360, 800), (768, 1024), (1440, 900)])
def test_landing_page_is_responsive(browser, base_url, timeout, size):
    browser.set_window_size(*size)
    page = Page(browser, base_url, timeout).open("/")

    assert "Run the counter" in page.heading().text
    assert browser.find_element(By.LINK_TEXT, "Create your workspace").is_displayed()
    page.assert_no_horizontal_overflow()
    page.assert_no_next_error()


@pytest.mark.smoke
def test_login_form_reports_client_validation(browser, base_url, timeout):
    page = Page(browser, base_url, timeout).open("/auth/login")
    browser.find_element(By.ID, "email").send_keys("not-an-email")
    browser.find_element(By.CSS_SELECTOR, "form button[type='submit']").click()

    WebDriverWait(browser, timeout).until(
        expected.text_to_be_present_in_element((By.TAG_NAME, "body"), "Please enter a valid email address")
    )
    assert "Password is required" in browser.find_element(By.TAG_NAME, "body").text


@pytest.mark.smoke
def test_registration_form_reports_all_local_validation(browser, base_url, timeout):
    page = Page(browser, base_url, timeout).open("/auth/register")
    values = {
        "firstName": "A",
        "lastName": "Owner",
        "email": "not-an-email",
        "password": "short",
        "confirmPassword": "different",
        "organizationName": "Test Store",
    }
    for field, value in values.items():
        browser.find_element(By.ID, field).send_keys(value)
    browser.find_element(By.CSS_SELECTOR, "form button[type='submit']").click()

    body = WebDriverWait(browser, timeout).until(
        expected.visibility_of_element_located((By.TAG_NAME, "body"))
    )
    WebDriverWait(browser, timeout).until(lambda _: "Please enter a valid email address" in body.text)
    assert "Password must be at least 8 characters" in body.text
    assert "Passwords don't match" in body.text
    page.assert_no_next_error()


@pytest.mark.smoke
def test_guest_is_redirected_from_protected_area(browser, base_url, timeout):
    Page(browser, base_url, timeout).open("/dashboard")
    WebDriverWait(browser, timeout).until(
        lambda driver: urlparse(driver.current_url).path == "/auth/login"
    )
    assert browser.find_element(By.ID, "email").is_displayed()


@pytest.mark.storefront
def test_published_storefront_and_catalog_are_browsable(browser, base_url, timeout):
    slug = require_env("BUSOS_E2E_STOREFRONT_SLUG")[0]
    page = Page(browser, base_url, timeout).open(f"/store/{slug}")

    assert browser.find_element(By.CSS_SELECTOR, "header nav[aria-label='Store navigation']").is_displayed()
    assert browser.find_element(By.TAG_NAME, "main").is_displayed()
    page.assert_no_horizontal_overflow()

    page.open(f"/store/{slug}/catalog")
    assert "products" in browser.find_element(By.TAG_NAME, "body").text.lower()
    assert browser.find_element(By.CSS_SELECTOR, "header nav[aria-label='Store navigation']").is_displayed()

    language_links = browser.find_elements(By.CSS_SELECTOR, "a[hreflang='bn']")
    if language_links:
        page.open(f"/store/{slug}/bn")
        assert browser.find_element(By.CSS_SELECTOR, "header nav[aria-label='Store navigation']").is_displayed()

