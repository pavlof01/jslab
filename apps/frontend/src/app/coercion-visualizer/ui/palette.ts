import type { SpecValue } from "@/app/coercion-visualizer/spec-runner";

export const SPEC_VALUE_TYPE_PALETTE: Record<SpecValue["type"], string> = {
  Undefined: "gray",
  Null: "gray",
  Boolean: "purple",
  Number: "blue",
  BigInt: "teal",
  String: "green",
  Symbol: "cyan",
  Object: "orange",
  TypeTag: "gray",
};

