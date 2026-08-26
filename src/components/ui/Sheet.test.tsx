import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { Sheet } from "./Sheet";

function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="More">
        <a href="/settings">Settings</a>
      </Sheet>
    </>
  );
}

describe("Sheet", () => {
  it("is hidden from assistive tech until opened", () => {
    render(<Harness />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens as a modal dialog named by its title", async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: "Open" }));

    const dialog = screen.getByRole("dialog", { name: "More" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveFocus();
  });

  it("closes on Escape and gives focus back to whatever opened it", async () => {
    render(<Harness />);
    const trigger = screen.getByRole("button", { name: "Open" });

    await userEvent.click(trigger);
    await userEvent.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("closes from its labelled close button", async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: "Open" }));
    await userEvent.click(screen.getByRole("button", { name: "Close More" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("stops the page behind it from scrolling, and restores that on close", async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: "Open" }));
    expect(document.body.style.overflow).toBe("hidden");

    await userEvent.keyboard("{Escape}");
    expect(document.body.style.overflow).toBe("");
  });

  it("has no accessibility violations when open", async () => {
    const { container } = render(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: "Open" }));
    await expect(container).toBeAccessible();
  });
});
