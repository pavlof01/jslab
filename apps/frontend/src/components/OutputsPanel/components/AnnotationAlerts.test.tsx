import { describe, expect, it } from "@jest/globals";
import { render, screen } from "@testing-library/react";

import Providers from "@/app/providers";

import AnnotationAlerts from "./AnnotationAlerts";

describe("AnnotationAlerts", () => {
  it("renders nothing when the directives are valid", () => {
    render(<AnnotationAlerts diagnostics={[]} />, { wrapper: Providers });
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("announces each complaint with the source line it came from", () => {
    render(
      <AnnotationAlerts
        diagnostics={[
          { line: 1, message: "A non-empty `match` is required." },
          { line: 7, message: "Unknown annotation field `show`." },
        ]}
      />,
      { wrapper: Providers },
    );
    const banner = screen.getByRole("status");
    expect(banner).toHaveTextContent(
      "Annotation at source line 1: A non-empty `match` is required.",
    );
    expect(banner).toHaveTextContent(
      "Annotation at source line 7: Unknown annotation field `show`.",
    );
  });
});
