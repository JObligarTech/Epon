import "vitest";
import type { RunOptions } from "axe-core";

declare module "vitest" {
  interface Matchers<T = unknown> {
    toBeAccessible: (options?: RunOptions) => Promise<T>;
  }
}
