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
  { path: "/", name: "placeholder" },
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
