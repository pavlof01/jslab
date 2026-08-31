import { CodeBlock, Flex, Float, IconButton } from "@chakra-ui/react";

import { MACHINE_CODE_LANG } from "@/lib/shiki";
import { sourceShikiAdapter } from "@/lib/shiki-adapter";

import DefaultEmptyCodeBlockState, {
  type DefaultEmptyCodeBlockStateProps,
} from "./components/DefaultEmptyCodeBlockState";

type Props = {
  code: string;
  EmptyCodeBlockState?: React.ComponentType<DefaultEmptyCodeBlockStateProps>;
};

const CodeBlockShiki: React.FC<Props> = ({
  code,
  EmptyCodeBlockState = DefaultEmptyCodeBlockState,
}) => {
  if (!code || code.length === 0) return <EmptyCodeBlockState />;

  return (
    <Flex flex={1}>
      <CodeBlock.AdapterProvider value={sourceShikiAdapter}>
        <CodeBlock.Root code={code} language={MACHINE_CODE_LANG}>
          <CodeBlock.Content>
            <Float placement="top-end" offset="5" zIndex="1">
              <CodeBlock.CopyTrigger asChild>
                <IconButton variant="ghost" size="2xs">
                  <CodeBlock.CopyIndicator />
                </IconButton>
              </CodeBlock.CopyTrigger>
            </Float>
            <CodeBlock.Code>
              <CodeBlock.CodeText />
            </CodeBlock.Code>
          </CodeBlock.Content>
        </CodeBlock.Root>
      </CodeBlock.AdapterProvider>
    </Flex>
  );
};

export default CodeBlockShiki;
