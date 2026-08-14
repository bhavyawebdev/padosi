import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge } from "@/components/ui/badge";

describe("Badge", () => {
  it("renders with default variant", () => {
    render(<Badge>Test Badge</Badge>);
    expect(screen.getByText("Test Badge")).toBeInTheDocument();
  });

  it("renders with nearby variant", () => {
    render(<Badge variant="nearby">Nearby</Badge>);
    const badge = screen.getByText("Nearby");
    expect(badge).toBeInTheDocument();
    expect(badge.tagName).toBe("SPAN");
  });

  it("renders with help variant", () => {
    render(<Badge variant="help">Help</Badge>);
    expect(screen.getByText("Help")).toBeInTheDocument();
  });

  it("renders with need variant", () => {
    render(<Badge variant="need">Need</Badge>);
    expect(screen.getByText("Need")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    render(<Badge className="test-class">Custom</Badge>);
    expect(screen.getByText("Custom")).toHaveClass("test-class");
  });
});
