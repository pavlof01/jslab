"use client";

import { Button, Menu, Portal } from "@chakra-ui/react";

import { type CopyTarget, useShareActions } from "./useShareActions";

const COPIED_LABEL: Record<CopyTarget, string> = {
  link: "link copied",
  embed: "embed copied",
  snapshot: "snapshot link copied",
  interactive: "interactive link copied",
};

const IDLE_LABEL = "share";

const ShareButton: React.FC = () => {
  const {
    copied,
    canCopySnapshotLink,
    copyLink,
    copyEmbed,
    copyInteractiveLink,
    copySnapshotLink,
  } = useShareActions();

  return (
    <Menu.Root>
      <Menu.Trigger asChild>
        <Button size="sm" active={copied !== null} aria-label="Share this snippet">
          {copied ? COPIED_LABEL[copied] : IDLE_LABEL}
        </Button>
      </Menu.Trigger>
      <Portal>
        <Menu.Positioner>
          <Menu.Content>
            <Menu.Item value="copy-link" onSelect={copyLink}>
              Copy link
            </Menu.Item>
            <Menu.Item value="copy-embed" onSelect={copyEmbed}>
              Copy embed code
            </Menu.Item>
            <Menu.Item value="copy-interactive" onSelect={copyInteractiveLink}>
              Copy interactive embed link
            </Menu.Item>
            <Menu.Item
              value="copy-snapshot"
              onSelect={copySnapshotLink}
              disabled={!canCopySnapshotLink}
            >
              Copy output snapshot link
            </Menu.Item>
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  );
};

export default ShareButton;
