import { describe, expect, it } from "@jest/globals";
import { render, screen } from "@testing-library/react";

import Providers from "@/app/providers";

import { STAGES } from "../lib/stages";
import StageContent from "./StageContent";

const bytecode = STAGES.find((stage) => stage.id === "bytecode")!;

describe("StageContent", () => {
  it("annotates bytecode output with directives from the code that was run", async () => {
    render(
      <StageContent
        stage={bytecode}
        output={{ loading: false, stdout: "header\nLdaSmi [1]\nReturn", stderr: "" }}
        tokens={[]}
        hasRun
        source={"/* @annotation\nmatch: LdaSmi [1]\nhighlight: LdaSmi\ntext: Loads one.\n*/"}
      />,
      { wrapper: Providers },
    );

    expect(await screen.findByRole("button", { name: "LdaSmi" })).toBeVisible();
  });
});
