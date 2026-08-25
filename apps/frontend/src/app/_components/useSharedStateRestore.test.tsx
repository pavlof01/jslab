import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";
import { renderHook, waitFor } from "@testing-library/react";

import { encodeShareState } from "@/lib/shareState";
import { createEngineSelection, EngineKey } from "@/lib/types";
import { useEngineOutputsStore } from "@/store/useEngineOutputs";

import { useSharedStateRestore } from "./useSharedStateRestore";

function setSearch(search: string) {
  window.history.replaceState(null, "", `/playground${search}`);
}

beforeEach(() => {
  useEngineOutputsStore.getState().reset();
});
afterEach(() => {
  setSearch("");
});

describe("useSharedStateRestore", () => {
  it("restores code, engines and flags from a ?s= link", async () => {
    const param = encodeShareState({
      code: "const x = 1;",
      engines: [EngineKey.v8, EngineKey.hermes],
      flags: { [EngineKey.v8]: ["--print-bytecode"] },
    });
    setSearch(`?s=${param}`);

    renderHook(() => useSharedStateRestore());

    await waitFor(() => {
      const state = useEngineOutputsStore.getState();
      expect(state.code).toBe("const x = 1;");
      expect(state.engines[EngineKey.v8]).toBe(true);
      expect(state.engines[EngineKey.hermes]).toBe(true);
      expect(state.engines[EngineKey.jsc]).toBe(false);
      expect(state.flags[EngineKey.v8]).toEqual(["--print-bytecode"]);
    });
  });

  it("leaves the store untouched when there is no share param", () => {
    setSearch("");
    useEngineOutputsStore.setState({
      code: "original",
      engines: createEngineSelection([EngineKey.v8]),
    });

    renderHook(() => useSharedStateRestore());

    expect(useEngineOutputsStore.getState().code).toBe("original");
  });

  it("ignores a corrupt share param instead of throwing", () => {
    setSearch("?s=%%%not-base64%%%");
    useEngineOutputsStore.setState({ code: "original" });

    expect(() => renderHook(() => useSharedStateRestore())).not.toThrow();
    expect(useEngineOutputsStore.getState().code).toBe("original");
  });
});
