import { describe, expect, it } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

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

  it("annotates machine code with the same directives", async () => {
    const machineCode = STAGES.find((stage) => stage.view === "machineCode")!;
    render(
      <StageContent
        stage={machineCode}
        output={{ loading: false, stdout: "0x1  movq rax,[rbp-0x8]\n0x5  ret", stderr: "" }}
        tokens={[]}
        hasRun
        source={"/* @annotation\nmatch: movq rax\nhighlight: movq\ntext: Loads a slot.\n*/"}
      />,
      { wrapper: Providers },
    );

    expect(await screen.findByRole("button", { name: "movq" })).toBeVisible();
  });

  it("explains deopt events whose trace line matches a directive", async () => {
    const deopt = STAGES.find((stage) => stage.view === "deoptEvents")!;
    const user = userEvent.setup();
    render(
      <StageContent
        stage={deopt}
        output={{
          loading: false,
          stdout:
            "[bailout (kind: deopt-eager, reason: wrong map): begin. deoptimizing 0x1 <JSFunction add (sfi = 0x2)>]",
          stderr: "",
        }}
        tokens={[]}
        hasRun
        source={
          "/* @annotation\nmatch: wrong map\ntitle: Map check\ntext: The object shape changed.\n*/"
        }
      />,
      { wrapper: Providers },
    );

    await user.click(screen.getByRole("button", { name: "wrong map" }));
    expect(await screen.findByRole("dialog", { name: /Map check/ })).toHaveTextContent(
      "The object shape changed.",
    );
  });
});
