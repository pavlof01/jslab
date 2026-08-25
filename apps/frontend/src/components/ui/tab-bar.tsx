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

const TabBar: React.FC<TabBarProps> = ({ items, value, onChange, underline = false, ...rest }) => {
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
};

type TabMetaProps = { text: string; color?: string };

const TabMeta: React.FC<TabMetaProps> = ({ text, color }) => {
  return (
    <Span textStyle="labelSm" color={color ?? "ink.6"}>
      {text}
    </Span>
  );
};

export default TabBar;
