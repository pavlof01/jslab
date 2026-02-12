import { createListCollection } from "@chakra-ui/react";

import type { SpecValue } from "@/app/coercion-visualizer/spec-runner";

export const VALUE_TYPES = ["Number", "BigInt", "String", "Boolean", "Null", "Undefined", "Symbol", "Object"] as const;
export type EditableType = (typeof VALUE_TYPES)[number];

export type ObjectPreset = { label: string; value: SpecValue & { type: "Object" } };
export const OBJECT_PRESETS: readonly ObjectPreset[] = [
  { label: "[]", value: { type: "Object", value: { id: "arr1", class: "Array", preview: "[]" } } },
  { label: "{}", value: { type: "Object", value: { id: "obj1", class: "Object", preview: "{}" } } },
  { label: "Date", value: { type: "Object", value: { id: "date1", class: "Date", preview: "new Date()" } } },
] as const;

export const typeCollection = createListCollection({
  items: VALUE_TYPES.map((t) => ({ label: t, value: t })),
});

export const objectPresetCollection = createListCollection({
  items: OBJECT_PRESETS.map((p) => ({ label: p.label, value: p.label })),
});

let symbolIdCounter = 0;
export function newSymbolId(): string {
  symbolIdCounter += 1;
  return `sym${symbolIdCounter}`;
}

export function toEditableType(value: SpecValue): EditableType {
  if ((VALUE_TYPES as readonly string[]).includes(value.type)) return value.type as EditableType;
  return "String";
}

export function defaultValueForType(type: EditableType): SpecValue {
  switch (type) {
    case "Number":
      return { type: "Number", value: 0 };
    case "BigInt":
      return { type: "BigInt", value: "0" };
    case "String":
      return { type: "String", value: "" };
    case "Boolean":
      return { type: "Boolean", value: false };
    case "Null":
      return { type: "Null", value: null };
    case "Undefined":
      return { type: "Undefined", value: undefined };
    case "Symbol":
      return { type: "Symbol", value: { id: newSymbolId(), description: "" } };
    case "Object":
      return OBJECT_PRESETS[0].value;
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

export function findPresetLabel(value: SpecValue): string | undefined {
  if (value.type !== "Object") return undefined;
  const match = OBJECT_PRESETS.find(
    (p) =>
      p.value.value.class === value.value.class &&
      (p.value.value.preview ?? "") === (value.value.preview ?? "") &&
      p.value.value.id === value.value.id,
  );
  return match?.label;
}
