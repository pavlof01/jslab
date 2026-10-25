import type { AlgoCategory } from "../model";

export const PRESETS: Record<AlgoCategory, string[]> = {
  equality: ["[] == ![]", '"0" == false', "null == undefined", "NaN === NaN", "[] + {}"],
  typeConversion: ['{ valueOf: () => "1" }', '"42"', "[]", "true", '" "'],
};
