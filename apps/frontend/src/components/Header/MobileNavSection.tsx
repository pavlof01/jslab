"use client";

import { Box, Button, Collapsible, HStack, Text, VStack } from "@chakra-ui/react";
import Link from "next/link";
import { useState } from "react";
import { LuChevronDown, LuChevronRight } from "react-icons/lu";
import { NavItemBody } from "./NavItemBody";
import type { NavSection } from "./nav.types";

type Props = {
  section: NavSection;
  isSectionActive: (section: NavSection) => boolean;
  onNavigate: () => void;
};

export const MobileNavSection: React.FC<Props> = ({ section, isSectionActive, onNavigate }) => {
  const [open, setOpen] = useState(isSectionActive(section));

  return (
    <Collapsible.Root open={open} onOpenChange={(details) => setOpen(details.open)}>
      <Box borderWidth="1px" borderColor="rule.structural" bg="surface.band" overflow="hidden">
        <Collapsible.Trigger asChild>
          <Button
            variant="quiet"
            typeface="prose"
            justifyContent="space-between"
            width="full"
            h="auto"
            px={4}
            py={4}
            color={isSectionActive(section) ? "accent" : "ink.1"}
            fontSize="11.5px"
            fontWeight="400"
            _hover={{ bg: "surface.hover" }}
          >
            <HStack justify="space-between" width="full">
              <Text>{section.label}</Text>
              {open ? <LuChevronDown size={16} /> : <LuChevronRight size={16} />}
            </HStack>
          </Button>
        </Collapsible.Trigger>

        <Collapsible.Content>
          <VStack
            align="stretch"
            gap={2}
            px={3}
            pb={3}
            pt={1}
            borderTopWidth="1px"
            borderColor="rule.list"
          >
            {section.items.map((item) => (
              <Button
                key={`${section.label}-${item.label}`}
                asChild
                variant="quiet"
                typeface="prose"
                justifyContent="space-between"
                alignItems="flex-start"
                width="full"
                h="auto"
                minH="auto"
                px={3}
                py={3}
                color="ink.code"
                _hover={{ bg: "surface.hover" }}
              >
                {item.external ? (
                  <a href={item.href} target="_blank" rel="noreferrer" onClick={onNavigate}>
                    <NavItemBody item={item} />
                  </a>
                ) : (
                  <Link href={item.href} onClick={onNavigate}>
                    <NavItemBody item={item} />
                  </Link>
                )}
              </Button>
            ))}
          </VStack>
        </Collapsible.Content>
      </Box>
    </Collapsible.Root>
  );
};
