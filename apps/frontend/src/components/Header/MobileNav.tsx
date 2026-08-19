"use client";

import { CloseButton, Dialog, HStack, IconButton, Portal, VStack } from "@chakra-ui/react";
import { useState } from "react";
import { LuMenu } from "react-icons/lu";

import { MobileNavSection } from "./MobileNavSection";
import { navSections } from "./nav.types";
import { useSectionActive } from "./useSectionActive";

export const MobileNav: React.FC = () => {
  const isSectionActive = useSectionActive();
  const [mobileOpen, setMobileOpen] = useState(false);
  const handleMobileNavigate = () => {
    setMobileOpen(false);
  };

  return (
    <Dialog.Root
      open={mobileOpen}
      onOpenChange={(details) => setMobileOpen(details.open)}
      placement="top"
      lazyMount
      unmountOnExit
    >
      <Dialog.Trigger asChild>
        <IconButton
          display={{ base: "inline-flex", md: "none" }}
          aria-label="Open navigation"
          size="sm"
          variant="ghost"
        >
          <LuMenu size={16} />
        </IconButton>
      </Dialog.Trigger>

      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner px={4} py={4}>
          <Dialog.Content maxW="100%" overflow="hidden">
            <Dialog.Header px={4} py={3}>
              <HStack justify="space-between" width="full">
                <Dialog.Title>Navigation</Dialog.Title>
                <Dialog.CloseTrigger asChild>
                  <CloseButton size="sm" variant="ghost" />
                </Dialog.CloseTrigger>
              </HStack>
            </Dialog.Header>

            <Dialog.Body px={4} py={4}>
              <VStack align="stretch" gap={3}>
                {navSections.map((section) => (
                  <MobileNavSection
                    key={section.label}
                    section={section}
                    isSectionActive={isSectionActive}
                    onNavigate={handleMobileNavigate}
                  />
                ))}
              </VStack>
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
};
