import "@testing-library/jest-dom/jest-globals";

import { beforeEach, describe, expect, it } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import Providers from "@/app/providers";
import { ANNOTATION_TEMPLATE } from "@/lib/annotations";
import { samples } from "@/lib/samples";
import { ANNOTATIONS_GUIDE_URL } from "@/lib/site";
import { useEngineOutputsStore } from "@/store/useEngineOutputs";

import AnnotationHelp from "./AnnotationHelp";

beforeEach(() => {
  useEngineOutputsStore.getState().reset();
  useEngineOutputsStore.setState({ code: "const answer = 42;" });
});

const openHelp = async () => {
  const user = userEvent.setup();
  render(<AnnotationHelp />, { wrapper: Providers });
  await user.click(screen.getByRole("button", { name: "How to annotate the output" }));
  return user;
};

describe("AnnotationHelp", () => {
  it("shows the directive template and links to the guide", async () => {
    await openHelp();
    expect(await screen.findByText(/match: text to find in the output/)).toBeVisible();
    expect(screen.getByRole("link", { name: "Full guide" })).toHaveAttribute(
      "href",
      ANNOTATIONS_GUIDE_URL,
    );
  });

  it("puts the template above the existing code", async () => {
    const user = await openHelp();
    await user.click(await screen.findByRole("button", { name: "Insert template" }));
    expect(useEngineOutputsStore.getState().code).toBe(
      `${ANNOTATION_TEMPLATE}\nconst answer = 42;`,
    );
  });

  it("loads the annotated example", async () => {
    const user = await openHelp();
    await user.click(await screen.findByRole("button", { name: "Load example" }));
    expect(useEngineOutputsStore.getState().code).toBe(samples.annotations);
  });
});
