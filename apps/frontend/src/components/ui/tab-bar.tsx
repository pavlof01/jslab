"use client";

import { Span, Tabs } from "@chakra-ui/react";

export type TabItem = {
  value: string;
  label: string;
  meta?: string;
  metaColor?: string;
};

export type TabBarProps = {
  items: TabItem[];
  value: string;
  onChange?: (value: string) => void;
  underline?: boolean;
} & Omit<Tabs.RootProps, "value" | "onValueChange" | "children" | "onChange">;

export function TabBar({ items, value, onChange, underline = false, ...rest }: TabBarProps) {
  return (
    <Tabs.Root
      value={value}
      onValueChange={(event) => onChange?.(event.value)}
      variant={underline ? "underline" : "panes"}
      {...rest}
    >
      <Tabs.List>
        {items.map((item) => (
          <Tabs.Trigger key={item.value} value={item.value}>
            {item.label}
            {item.meta ? <TabMeta text={item.meta} color={item.metaColor} /> : null}
          </Tabs.Trigger>
        ))}
      </Tabs.List>
    </Tabs.Root>
  );
}

function TabMeta({ text, color }: { text: string; color?: string }) {
  return (
    <Span textStyle="labelSm" color={color ?? "ink.6"}>
      {text}
    </Span>
  );
}
