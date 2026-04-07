"use client";

import {
  Box,
  Button,
  CloseButton,
  Collapsible,
  Dialog,
  HStack,
  IconButton,
  Menu,
  Portal,
  Text,
  VStack,
} from "@chakra-ui/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LuChevronDown, LuChevronRight, LuExternalLink, LuMenu } from "react-icons/lu";

type NavItem = {
  label: string;
  description: string;
  href: string;
  external?: boolean;
};

type NavSection = {
  label: string;
  items: NavItem[];
};

const navSections: NavSection[] = [
  {
    label: "Engines",
    items: [
      {
        label: "Playground",
        description: "Run snippets and compare engine output.",
        href: "/playground",
      },
      {
        label: "V8",
        description: "Inspect V8 bytecode and runtime output.",
        href: "/playground",
      },
      {
        label: "SpiderMonkey",
        description: "Compare Mozilla engine behavior.",
        href: "/playground",
      },
      {
        label: "Hermes",
        description: "Check Hermes output for React Native scenarios.",
        href: "/playground",
      },
      {
        label: "JavaScriptCore",
        description: "Review JavaScriptCore execution results.",
        href: "/playground",
      },
    ],
  },
  {
    label: "ECMA Spec",
    items: [
      {
        label: "Abstract Functions",
        description: "Trace ECMAScript abstract operations step by step.",
        href: "/abstract-functions-visualizer",
      },
      {
        label: "ToNumber Visualizer",
        description: "Follow coercion flow for the ToNumber algorithm.",
        href: "/abstract-functions-visualizer",
      },
      {
        label: "ECMA-262",
        description: "Open the official ECMAScript specification.",
        href: "https://tc39.es/ecma262/",
        external: true,
      },
    ],
  },
];

const menuContentStyles = {
  minW: "18rem",
  borderWidth: "1px",
  borderColor: "rgba(255,255,255,0.08)",
  bg: "rgba(35,33,15,0.96)",
  backdropFilter: "blur(18px)",
  borderRadius: "2xl",
  boxShadow: "0 20px 50px -24px rgba(0,0,0,0.65)",
  p: 2,
  animationDuration: "0s",
};

function NavItemBody({ item }: { item: NavItem }) {
  return (
    <VStack align="start" gap={1} width="full">
      <HStack justify="space-between" width="full" gap={3}>
        <Text fontSize="sm" fontWeight="700">
          {item.label}
        </Text>
        {item.external ? <LuExternalLink size={14} /> : null}
      </HStack>
      <Text fontSize="xs" lineHeight="1.6" color="whiteAlpha.600" textAlign="left" whiteSpace="normal">
        {item.description}
      </Text>
    </VStack>
  );
}

function MobileNavSection({
  section,
  isSectionActive,
  onNavigate,
}: {
  section: NavSection;
  isSectionActive: (section: NavSection) => boolean;
  onNavigate: () => void;
}) {
  const [open, setOpen] = useState(isSectionActive(section));

  return (
    <Collapsible.Root open={open} onOpenChange={(details) => setOpen(details.open)}>
      <Box
        borderWidth="1px"
        borderColor="rgba(255,255,255,0.08)"
        borderRadius="xl"
        bg="rgba(255,255,255,0.02)"
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
            _hover={{ bg: "rgba(255,255,255,0.03)" }}
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
                _hover={{ bg: "rgba(249,227,26,0.08)" }}
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
}

const Nav = () => {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActivePath = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  const isSectionActive = (section: NavSection) =>
    section.items.some((item) => !item.external && isActivePath(item.href));

  const handleMobileNavigate = () => {
    setMobileOpen(false);
  };

  return (
    <Box ml={{ base: "auto", md: 0 }}>
      <HStack as="nav" display={{ base: "none", md: "flex" }} gap={{ base: 6, lg: 8 }}>
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
                  variant="plain"
                  h="auto"
                  minW="auto"
                  px={0}
                  fontSize="sm"
                  fontWeight="700"
                  color={active ? "brand.300" : "whiteAlpha.700"}
                  _hover={{ color: "brand.300" }}
                >
                  <Box display="inline-flex" alignItems="center" gap="0.25rem">
                    <Text>{section.label}</Text>
                    <LuChevronDown size={14} />
                  </Box>
                </Button>
              </Menu.Trigger>

              <Portal>
                <Menu.Positioner>
                  <Menu.Content {...menuContentStyles}>
                    <VStack align="stretch" gap={1}>
                      {section.items.map((item) => (
                        <Menu.Item
                          key={`${section.label}-${item.label}`}
                          asChild
                          value={`${section.label}-${item.label}`}
                          borderRadius="xl"
                          px={3}
                          py={3}
                          color="whiteAlpha.900"
                          cursor="pointer"
                          transition="background-color 0.2s ease, color 0.2s ease"
                          _highlighted={{ bg: "rgba(249,227,26,0.1)", color: "white" }}
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
                    </VStack>
                  </Menu.Content>
                </Menu.Positioner>
              </Portal>
            </Menu.Root>
          );
        })}
      </HStack>

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
            variant="outline"
            borderColor="rgba(255,255,255,0.12)"
            color="white"
            bg="rgba(255,255,255,0.03)"
            _hover={{ bg: "rgba(255,255,255,0.08)" }}
          >
            <LuMenu size={18} />
          </IconButton>
        </Dialog.Trigger>

        <Portal>
          <Dialog.Backdrop bg="rgba(0,0,0,0.6)" />
          <Dialog.Positioner px={4} py={4}>
            <Dialog.Content
              maxW="100%"
              borderRadius="2xl"
              borderWidth="1px"
              borderColor="rgba(255,255,255,0.08)"
              bg="rgba(35,33,15,0.98)"
              color="white"
              overflow="hidden"
              animationDuration="0s"
            >
              <Dialog.Header px={4} py={4} borderBottomWidth="1px" borderColor="rgba(255,255,255,0.06)">
                <HStack justify="space-between" width="full">
                  <Dialog.Title fontSize="sm" fontWeight="800" letterSpacing="0.18em" textTransform="uppercase">
                    Navigation
                  </Dialog.Title>
                  <Dialog.CloseTrigger asChild>
                    <CloseButton size="sm" />
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
    </Box>
  );
};

export default Nav;
