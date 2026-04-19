"use client";

import { Box, Button, Collapsible, HStack, Text, VStack } from "@chakra-ui/react";
import Link from "next/link";
import { useState } from "react";
import { LuChevronDown, LuChevronRight } from "react-icons/lu";
import type { NavSection } from "./nav.types";
import { NavItemBody } from "./NavItemBody";

type Props = {
  section: NavSection;
  isSectionActive: (section: NavSection) => boolean;
  onNavigate: () => void;
};

export const MobileNavSection: React.FC<Props> = ({ section, isSectionActive, onNavigate }) => {
  const [open, setOpen] = useState(isSectionActive(section));

  return (
    <Collapsible.Root open={open} onOpenChange={(details) => setOpen(details.open)}>
      <Box
        borderWidth="1px"
        borderColor="rgba(255,255,255,0.08)"
        borderRadius="xl"
        bg="surface.100"
        overflow="hidden"
      >
        <Collapsible.Trigger asChild>
          <Button
            variant="plain"
            justifyContent="space-between"
            width="full"
            h="auto"
            px={4}
            py={4}
            color={isSectionActive(section) ? "brand.300" : "white"}
            fontSize="sm"
            fontWeight="800"
            _hover={{ bg: "surface.100" }}
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
            borderColor="rgba(255,255,255,0.06)"
          >
            {section.items.map((item) => (
              <Button
                key={`${section.label}-${item.label}`}
                asChild
                variant="plain"
                justifyContent="space-between"
                alignItems="flex-start"
                width="full"
                h="auto"
                minH="auto"
                borderRadius="lg"
                px={3}
                py={3}
                color="whiteAlpha.900"
                _hover={{ bg: "brandAlpha.100" }}
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
