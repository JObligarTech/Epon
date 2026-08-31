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
  { path: "/transactions?status=pending", name: "transactions (filtered)" },
  { path: "/transactions?q=zzzz&range=all", name: "transactions (empty)" },
  { path: "/budgeting", name: "budgeting" },
  { path: "/settings", name: "settings" },
  { path: "/styleguide", name: "styleguide" },
  { path: "/sign-in", name: "sign in" },
  { path: "/create-account", name: "create account" },
  { path: "/reset-password", name: "reset password" },
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

test("filters live in the URL, so a filtered view can be linked to", async ({ page }) => {
  await page.goto("/transactions");
  await page.getByRole("radio", { name: "Pending" }).click();

  await expect(page).toHaveURL(/status=pending/);
  await expect(page.getByRole("region", { name: "Today" })).toBeVisible();

  // And the back button walks filter changes like any other navigation.
  await page.goBack();
  await expect(page).not.toHaveURL(/status=pending/);
});

test("a deep link from an account arrives pre-filtered", async ({ page }) => {
  await page.goto("/accounts/acc_horizon_card");
  await page.getByRole("link", { name: "Open in Transactions" }).click();

  await expect(page).toHaveURL(/account=acc_horizon_card/);
  await expect(page.getByRole("combobox", { name: "Account" })).toHaveValue(
    "acc_horizon_card",
  );
});

test("an empty result explains itself and offers a way out", async ({ page }) => {
  await page.goto("/transactions?q=nothingmatchesthis&range=all");

  await expect(page.getByText("No transactions match")).toBeVisible();
  await page.getByRole("button", { name: "Clear all filters" }).click();

  await expect(page).toHaveURL(/\/transactions$/);
  await expect(page.getByText("No transactions match")).toBeHidden();
});

test("a transaction opens its detail, with the pending stage shown as unfinished", async ({
  page,
}) => {
  await page.goto("/transactions?status=pending");
  await page.getByRole("button", { name: /Starbucks/ }).first().click();

  const sheet = page.getByRole("dialog", { name: "Transaction" });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByText("Held against available balance")).toBeVisible();
  await expect(sheet.getByText("Usually 1–3 business days")).toBeVisible();
});

test("category colours can be turned off and stay off across a filter change", async ({ page }) => {
  await page.goto("/transactions");
  await page.getByRole("button", { name: /Category colours/ }).click();
  await expect(page).toHaveURL(/plain=1/);

  await page.getByRole("radio", { name: "Posted" }).click();
  await expect(page).toHaveURL(/plain=1/);
  await expect(page).toHaveURL(/status=posted/);
});

test("the auth screens link to each other in both directions", async ({ page }) => {
  await page.goto("/sign-in");

  await page.getByRole("link", { name: "Create an account" }).click();
  await expect(page).toHaveURL(/\/create-account$/);

  await page.getByRole("link", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/sign-in$/);

  await page.getByRole("link", { name: "Forgot password?" }).click();
  await expect(page).toHaveURL(/\/reset-password$/);
});

test("every auth field has a real label, not just a placeholder", async ({ page }) => {
  await page.goto("/create-account");

  // A placeholder disappears the moment you type; a label does not.
  await expect(page.getByLabel("Full name")).toBeVisible();
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();
});

test("the app still works with no Supabase configured, rather than locking everyone out", async ({
  page,
}) => {
  // Nothing is configured yet, so the proxy must not redirect anyone.
  await page.goto("/");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText("Net position")).toBeVisible();
});
