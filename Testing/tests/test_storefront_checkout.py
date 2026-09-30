from urllib.parse import urlparse

import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as expected
from selenium.webdriver.support.ui import WebDriverWait

from conftest import enabled, env, require_env
from pages import Page


def storefront_origin(base_url: str, slug: str) -> str:
    configured = env("BUSOS_E2E_STOREFRONT_URL")
    if configured:
        return configured.rstrip("/")

    parsed = urlparse(base_url)
    if parsed.hostname in {"localhost", "127.0.0.1"}:
        port = f":{parsed.port}" if parsed.port else ""
        return f"{parsed.scheme}://{slug}.localhost{port}"

    pytest.skip("Set BUSOS_E2E_STOREFRONT_URL to the canonical seeded storefront origin.")


@pytest.mark.storefront
@pytest.mark.mutation
def test_customer_can_place_cash_on_delivery_order(browser, base_url, timeout):
    if not enabled("BUSOS_E2E_MUTATIONS"):
        pytest.skip("Set BUSOS_E2E_MUTATIONS=true to run seeded write-flow tests.")
    slug = require_env("BUSOS_E2E_STOREFRONT_SLUG")[0]
    page = Page(browser, storefront_origin(base_url, slug), timeout).open("/catalog")

    product_urls = [
        element.get_attribute("href")
        for element in page.all_visible(By.CSS_SELECTOR, "a[href*='/product/']")
    ]
    add_button = None
    for product_url in product_urls:
        browser.get(product_url)
        candidates = browser.find_elements(By.XPATH, "//button[normalize-space()='Add to cart']")
        if candidates and candidates[0].is_enabled():
            add_button = candidates[0]
            break
    assert add_button, "The seeded storefront has no available product"

    add_button.click()
    WebDriverWait(browser, timeout).until(
        expected.url_matches(r"/cart/?$")
    )
    browser.find_element(By.LINK_TEXT, "Checkout").click()
    WebDriverWait(browser, timeout).until(expected.url_matches(r"/checkout/?$"))

    fields = {
        "name": "Selenium Customer",
        "phone": "01700000000",
        "address": "Seeded delivery address",
        "city": "Dhaka",
        "notes": "Created by the opt-in Selenium system test.",
    }
    for name, value in fields.items():
        browser.find_element(By.CSS_SELECTOR, f"[name='{name}']").send_keys(value)
    browser.find_element(By.XPATH, "//button[normalize-space()='Place order']").click()

    confirmation = WebDriverWait(browser, timeout).until(
        expected.visibility_of_element_located((By.TAG_NAME, "h1"))
    )
    assert confirmation.text == "Order received"

