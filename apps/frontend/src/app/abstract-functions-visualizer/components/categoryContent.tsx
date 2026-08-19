import { Text } from "@chakra-ui/react";

import type { AlgoCategory } from "../model";

export const PRESETS: Record<AlgoCategory, string[]> = {
  equality: [
    "[] == ![]",
    '"0" == false',
    "null == undefined",
    "NaN === NaN",
    '{} == "[object Object]"',
  ],
  typeConversion: ['{ valueOf: () => "1" }', '"42"', "[]", "true", '" "'],
};

export const HINTS: Record<AlgoCategory, React.ReactNode> = {
  equality: (
    <>
      two literals and an equality operator —{" "}
      <Text as="span" color="ink.4">
        == != === !==
      </Text>{" "}
      over numbers, strings, booleans, null, undefined, arrays, objects
    </>
  ),
  typeConversion: (
    <>
      one literal to convert — a number, string, boolean, null, undefined, array, or an object
      literal (methods like{" "}
      <Text as="span" color="ink.4">
        valueOf
      </Text>{" "}
      /{" "}
      <Text as="span" color="ink.4">
        toString
      </Text>{" "}
      included)
    </>
  ),
};
