import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/**
 * The real-browser half of the accessibility check. jsdom cannot compute
 * colour contrast — it does no layout or painting — so these rules only ever
 * run here, against a production build.
 *
 * Every route is audited in both themes, because the two palettes are separate
 * designs and a token that passes in one can fail in the other.
 */

const ROUTES = [
  { path: "/", name: "home" },
  { path: "/accounts", name: "accounts" },
  // A credit account, so utilisation and the owed treatment are covered too.
  { path: "/accounts/acc_horizon_card", name: "account detail (credit)" },
  { path: "/accounts/acc_northstar_savings", name: "account detail (savings)" },
  { path: "/transactions", name: "transactions" },
  { path: "/budgeting", name: "budgeting" },
  { path: "/settings", name: "settings" },
  { path: "/styleguide", name: "styleguide" },
];

const THEMES = ["light", "dark"] as const;

async function gotoWithTheme(page: Page, path: string, theme: (typeof THEMES)[number]) {
  await page.emulateMedia({ colorScheme: theme });
  await page.addInitScript((value) => {
    window.localStorage.setItem("epon.theme", value);
  }, theme);
  await page.goto(path);
  // Webfonts change metrics, and axe measures rendered text.
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator("body")).toBeVisible();
}

function audit(page: Page) {
  return new AxeBuilder({ page }).withTags([
    "wcag2a",
    "wcag2aa",
    "wcag21a",
    "wcag21aa",
  ]);
}

for (const route of ROUTES) {
  for (const theme of THEMES) {
    test(`${route.name} has no accessibility violations in ${theme}`, async ({ page }) => {
      await gotoWithTheme(page, route.path, theme);
      const results = await audit(page).analyze();

      // Report every violation at once rather than dying on the first.
      const summary = results.violations
        .map(
          (v) =>
            `[${v.impact}] ${v.id}: ${v.help}\n${v.nodes
              .map((n) => `    ${n.html}\n    ${n.failureSummary}`)
              .join("\n")}`,
        )
        .join("\n\n");

      expect(summary, summary || "no violations").toBe("");
    });
  }
}

/**
 * Nothing above reads the console, so a page can be perfectly accessible and
 * still be logging errors — hydration mismatches especially, which are silent
 * to axe but mean React threw away the server HTML for that subtree.
 */
for (const route of ROUTES) {
  test(`${route.name} loads without console errors`, async ({ page }) => {
    const problems: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") problems.push(message.text());
    });
    page.on("pageerror", (error) => problems.push(String(error)));

    await gotoWithTheme(page, route.path, "dark");
    await page.waitForLoadState("networkidle");

    expect(problems.join("\n")).toBe("");
  });
}

test("the theme choice survives a reload without flashing the other theme", async ({ page }) => {
  await page.goto("/styleguide");
  await page.getByRole("radio", { name: "Dark" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  await page.reload();
  // Stamped by the pre-paint script, so it is already correct on first paint
  // rather than corrected afterwards.
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("the segmented control is fully keyboard operable", async ({ page }) => {
  await gotoWithTheme(page, "/styleguide", "light");

  const status = page.getByRole("radiogroup", { name: "Status" });
  await status.getByRole("radio", { name: "All" }).focus();
  await page.keyboard.press("ArrowRight");

  await expect(status.getByRole("radio", { name: "Pending" })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await expect(status.getByRole("radio", { name: "Pending" })).toBeFocused();
});

test("the skip link is the first thing the keyboard reaches", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");

  const skip = page.getByRole("link", { name: "Skip to content" });
  await expect(skip).toBeFocused();
  await expect(skip).toBeVisible();

  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#main$/);
});

test("navigation moves between sections and marks the current one", async ({ page }) => {
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Main" });

  await nav.getByRole("link", { name: /Transactions/ }).click();
  await expect(page).toHaveURL(/\/transactions$/);
  await expect(nav.getByRole("link", { name: /Transactions/ })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(nav.getByRole("link", { name: /Home/ })).not.toHaveAttribute("aria-current", "page");
});

test("only one navigation is exposed at a time", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  await expect(page.getByRole("navigation", { name: "Main" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Sections" })).toBeHidden();

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("navigation", { name: "Main" })).toBeHidden();
  await expect(page.getByRole("navigation", { name: "Sections" })).toBeVisible();
});

test("the mobile More sheet reaches the sections the rail holds", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await page.getByRole("navigation", { name: "Sections" }).getByRole("button", { name: /More/ }).click();

  const sheet = page.getByRole("dialog", { name: "More" });
  await expect(sheet).toBeVisible();
  await sheet.getByRole("link", { name: /Settings/ }).click();
  await expect(page).toHaveURL(/\/settings$/);
});

test("an account row opens that account", async ({ page }) => {
  await page.goto("/accounts");
  await page.getByRole("link", { name: /Reserve Savings/ }).click();

  await expect(page).toHaveURL(/\/accounts\/acc_northstar_savings$/);
  await expect(page.getByRole("heading", { name: "Reserve Savings" })).toBeVisible();
});

test("an unknown account is a 404, not an empty account screen", async ({ page }) => {
  const response = await page.goto("/accounts/acc_does_not_exist");
  expect(response?.status()).toBe(404);
});

test("reconnect explains itself without leaving the page", async ({ page }) => {
  await page.goto("/accounts");
  await page.getByRole("button", { name: "Reconnect" }).click();

  const sheet = page.getByRole("dialog", { name: "Reconnect" });
  await expect(sheet).toBeVisible();
  await expect(sheet).toContainText("Summit Financial");

  await page.keyboard.press("Escape");
  await expect(sheet).toBeHidden();
});
