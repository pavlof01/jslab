import { Link, Text } from "@chakra-ui/react";

import type { Inline } from "@/lib/articles/blocks";
import { SITE_HOST } from "@/lib/site";

type Props = { nodes: Inline[] };

const isExternal = (href: string) => /^https?:\/\//.test(href) && new URL(href).host !== SITE_HOST;

const MarkdownInline: React.FC<Props> = ({ nodes }) => (
  <>
    {nodes.map((node) => {
      switch (node.kind) {
        case "text":
          return (
            <Text as="span" key={node.key}>
              {node.text}
            </Text>
          );
        case "strong":
          return (
            <Text as="strong" key={node.key} fontWeight="600" color="ink.1">
              <MarkdownInline nodes={node.children} />
            </Text>
          );
        case "em":
          return (
            <Text as="em" key={node.key} fontStyle="italic">
              <MarkdownInline nodes={node.children} />
            </Text>
          );
        case "del":
          return (
            <Text as="del" key={node.key}>
              <MarkdownInline nodes={node.children} />
            </Text>
          );
        case "code":
          return (
            <Text as="code" key={node.key} textStyle="codeInline" color="ink.code">
              {node.text}
            </Text>
          );
        case "link":
          return (
            <Link
              key={node.key}
              href={node.href}
              fontSize="inherit"
              {...(isExternal(node.href) ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            >
              <MarkdownInline nodes={node.children} />
            </Link>
          );
        case "break":
          return <br key={node.key} />;
      }
    })}
  </>
);

export default MarkdownInline;
