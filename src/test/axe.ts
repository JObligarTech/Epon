import axe, { type AxeResults, type RunOptions } from "axe-core";

/**
 * A jsdom axe run. This catches roles, names, ARIA relationships, focus order
 * and duplicate labelling — the majority of real accessibility bugs.
 *
 * It cannot catch colour contrast: jsdom does no layout or painting, so
 * axe skips those rules entirely. Contrast is checked in a real browser by
 * the Playwright suite instead. Anything relying on geometry (target size,
 * overlap) is the same story.
 */
export async function runAxe(element: Element, options: RunOptions = {}): Promise<AxeResults> {
  return axe.run(element, {
    ...options,
    resultTypes: ["violations"],
    rules: {
      // jsdom has no layout, so these produce noise rather than signal here.
      "color-contrast": { enabled: false },
      "target-size": { enabled: false },
      ...options.rules,
    },
  });
}

function formatViolations(results: AxeResults): string {
  return results.violations
    .map((violation) => {
      const nodes = violation.nodes
        .map((node) => `      ${node.html}\n      ${node.failureSummary?.replace(/\n/g, "\n      ")}`)
        .join("\n\n");
      return `  [${violation.impact ?? "unknown"}] ${violation.id}: ${violation.help}\n    ${violation.helpUrl}\n\n${nodes}`;
    })
    .join("\n\n");
}

export async function toBeAccessible(received: Element, options: RunOptions = {}) {
  const results = await runAxe(received, options);
  const pass = results.violations.length === 0;

  return {
    pass,
    message: () =>
      pass
        ? "expected element to have accessibility violations, but none were found"
        : `expected element to have no accessibility violations, found ${results.violations.length}:\n\n${formatViolations(results)}`,
  };
}
