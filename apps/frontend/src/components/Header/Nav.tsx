"use client";

import { Box, Button, HStack, Menu, Portal, Text } from "@chakra-ui/react";
import Link from "next/link";

import { NavItemBody } from "./NavItemBody";
import { navSections } from "./nav.types";
import { useSectionActive } from "./useSectionActive";

const menuContentStyles = {
  minW: "300px",
  p: "0",
};

const Nav: React.FC = () => {
  const isSectionActive = useSectionActive();

  return (
    <Box>
      <HStack
        as="nav"
        display={{ base: "none", md: "flex" }}
        gap={{ base: 6, lg: 8 }}
        justify="center"
      >
        {navSections.map((section) => {
          const active = isSectionActive(section);

          return (
            <Menu.Root
              key={section.label}
              lazyMount
              unmountOnExit
              positioning={{
                placement: "bottom-start",
                gutter: 12,
                strategy: "fixed",
                sizeMiddleware: false,
              }}
            >
              <Menu.Trigger asChild>
                <Button
                  variant="quiet"
                  typeface="prose"
                  h="auto"
                  minW="auto"
                  px={0}
                  fontSize="11.5px"
                  fontWeight="400"
                  color={active ? "accent" : "ink.label"}
                  _hover={{ color: "accent" }}
                >
                  <Box display="inline-flex" alignItems="baseline" gap="7px">
                    <Text as="span">{section.label}</Text>
                    {/* The design marks a dropdown with the glyph, not an icon. */}
                    <Box as="span" aria-hidden="true" fontSize="8px" color="ink.5">
                      ▼
                    </Box>
                  </Box>
                </Button>
              </Menu.Trigger>

              <Portal>
                <Menu.Positioner>
                  <Menu.Content {...menuContentStyles}>
                    {section.items.map((item, index) => (
                      <Menu.Item
                        key={`${section.label}-${item.label}`}
                        asChild
                        value={`${section.label}-${item.label}`}
                        px="14px"
                        py="10px"
                        borderTopWidth={index ? "1px" : "0"}
                        borderTopColor="rule.list"
                      >
                        {item.external ? (
                          <a href={item.href} target="_blank" rel="noreferrer">
                            <NavItemBody item={item} />
                          </a>
                        ) : (
                          <Link href={item.href}>
                            <NavItemBody item={item} />
                          </Link>
                        )}
                      </Menu.Item>
                    ))}
                  </Menu.Content>
                </Menu.Positioner>
              </Portal>
            </Menu.Root>
          );
        })}
      </HStack>
    </Box>
  );
};

export default Nav;
