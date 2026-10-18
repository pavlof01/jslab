import { Box, Code, Link, Tabs, Text } from "@chakra-ui/react";

import { V8_RUNTIME_INTRINSICS_URL } from "@/lib/links";
import { INTRINSIC_CATEGORIES, V8_NATIVES_FLAG } from "@/lib/v8Intrinsics";

import IntrinsicsTable from "./IntrinsicsTable";
import V8IntrinsicsDialog from "./V8IntrinsicsDialog";

const V8Intrinsics: React.FC = () => {
  return (
    <V8IntrinsicsDialog>
      <Box mb={5} color="ink.2" fontSize="sm" lineHeight="tall">
        <Text mb={1}>
          V8&apos;s own test hooks, grouped by purpose. Every one of them needs{" "}
          <Code>{V8_NATIVES_FLAG}</Code>, which the flag selector next door turns on.
        </Text>
        <Link
          data-jsl="link"
          fontSize="sm"
          href={V8_RUNTIME_INTRINSICS_URL}
          target="_blank"
          rel="noreferrer"
        >
          Full list in runtime.h ↗
        </Link>
      </Box>

      <Tabs.Root defaultValue={INTRINSIC_CATEGORIES[0]} lazyMount>
        <Tabs.List mb={4} overflowX="auto">
          {INTRINSIC_CATEGORIES.map((category) => (
            <Tabs.Trigger key={category} value={category}>
              {category}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        {INTRINSIC_CATEGORIES.map((category) => (
          <Tabs.Content key={category} value={category}>
            <IntrinsicsTable category={category} />
          </Tabs.Content>
        ))}
      </Tabs.Root>
    </V8IntrinsicsDialog>
  );
};

export default V8Intrinsics;
