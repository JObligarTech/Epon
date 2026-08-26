import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Button, Chip, Input, Logo, Segmented, Skeleton, Tag, Toggle } from "./index";

describe("Button", () => {
  it("renders its label and fires onClick", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Connect account</Button>);
    await userEvent.click(screen.getByRole("button", { name: "Connect account" }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("does not fire when disabled", async () => {
    const onClick = vi.fn();
    render(
      <Button onClick={onClick} disabled>
        Connect account
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Connect account" });
    expect(button).toBeDisabled();

    // The disabled style sets pointer-events: none, which user-event honours by
    // refusing the click. Bypass that check so this asserts the stronger thing:
    // even if a click did land, the handler must not fire.
    await userEvent.setup({ pointerEventsCheck: 0 }).click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("has no accessibility violations across variants", async () => {
    const { container } = render(
      <>
        <Button variant="primary">Primary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="quiet">Quiet</Button>
      </>,
    );
    await expect(container).toBeAccessible();
  });
});

describe("Logo", () => {
  it("exposes the product name exactly once", () => {
    render(<Logo />);
    expect(screen.getAllByText(/E-?PON/i)).toHaveLength(1);
  });

  it("still names itself when the wordmark is hidden", () => {
    render(<Logo showWordmark={false} />);
    expect(screen.getByText("E-PON")).toBeInTheDocument();
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<Logo />);
    await expect(container).toBeAccessible();
  });
});

describe("Toggle", () => {
  it("is a labelled switch that reports and changes state", async () => {
    const onChange = vi.fn();
    render(<Toggle checked={false} onChange={onChange} label="Category colours" />);
    const toggle = screen.getByRole("switch", { name: "Category colours" });
    expect(toggle).toHaveAttribute("aria-checked", "false");
    await userEvent.click(toggle);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("has no accessibility violations", async () => {
    const { container } = render(
      <Toggle checked onChange={() => {}} label="Category colours" />,
    );
    await expect(container).toBeAccessible();
  });
});

describe("Chip", () => {
  it("reports its pressed state", () => {
    render(<Chip active>Category colours</Chip>);
    expect(screen.getByRole("button", { name: "Category colours" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<Chip active>Category colours</Chip>);
    await expect(container).toBeAccessible();
  });
});

function SegmentedHarness() {
  const [value, setValue] = useState("all");
  return (
    <Segmented
      label="Status"
      value={value}
      onChange={setValue}
      options={[
        { value: "all", label: "All" },
        { value: "pending", label: "Pending" },
        { value: "posted", label: "Posted" },
      ]}
    />
  );
}

describe("Segmented", () => {
  it("exposes a single-select group with exactly one selection", async () => {
    render(<SegmentedHarness />);
    const group = screen.getByRole("radiogroup", { name: "Status" });
    expect(group).toBeInTheDocument();

    const options = screen.getAllByRole("radio");
    expect(options).toHaveLength(3);
    expect(options.filter((o) => o.getAttribute("aria-checked") === "true")).toHaveLength(1);
  });

  it("moves the selection on click", async () => {
    render(<SegmentedHarness />);
    await userEvent.click(screen.getByRole("radio", { name: "Pending" }));
    expect(screen.getByRole("radio", { name: "Pending" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "All" })).toHaveAttribute("aria-checked", "false");
  });

  it("is operable with arrow keys", async () => {
    render(<SegmentedHarness />);
    await userEvent.tab();
    expect(screen.getByRole("radio", { name: "All" })).toHaveFocus();
    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByRole("radio", { name: "Pending" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "Pending" })).toHaveFocus();
  });

  it("keeps only the selected option in the tab sequence", async () => {
    render(<SegmentedHarness />);
    expect(screen.getByRole("radio", { name: "All" })).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("radio", { name: "Pending" })).toHaveAttribute("tabindex", "-1");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<SegmentedHarness />);
    await expect(container).toBeAccessible();
  });
});

describe("Input", () => {
  it("is reachable by its accessible name", async () => {
    render(<Input aria-label="Email" placeholder="you@example.com" />);
    await userEvent.type(screen.getByRole("textbox", { name: "Email" }), "a@b.co");
    expect(screen.getByRole("textbox", { name: "Email" })).toHaveValue("a@b.co");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<Input aria-label="Email" />);
    await expect(container).toBeAccessible();
  });
});

describe("Tag and Skeleton", () => {
  it("render without accessibility violations", async () => {
    const { container } = render(
      <>
        <Tag>24 months</Tag>
        <Tag tone="accent">Soon</Tag>
        <Skeleton width={120} />
      </>,
    );
    await expect(container).toBeAccessible();
  });

  it("hides the skeleton from assistive tech", () => {
    const { container } = render(<Skeleton width={120} />);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });
});
