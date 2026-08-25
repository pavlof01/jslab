import { Box, Container, HStack, Link } from "@chakra-ui/react";

import { REPO_URL } from "@/lib/site";

import Logo from "../Logo";
import MobileNav from "./MobileNav";
import Nav from "./Nav";

const Header: React.FC = () => {
  return (
    <Box
      as="header"
      position="sticky"
      top={0}
      zIndex={50}
      w="full"
      h="header"
      display="flex"
      alignItems="center"
      bg="surface.base"
      borderBottomWidth="1px"
      borderColor="rule.list"
      px={{ base: 6, md: 20 }}
    >
      <Container maxW="7xl" px={0}>
        <Box
          display="grid"
          gridTemplateColumns="minmax(0,1fr) auto minmax(0,1fr)"
          alignItems="center"
          gap={{ base: 4, md: 8 }}
        >
          <Box justifySelf="start">
            <Logo />
          </Box>

          <Nav />

          <HStack justifySelf="end" gap={{ base: 3, md: 5 }}>
            <Link
              href={REPO_URL}
              target="_blank"
              rel="noreferrer"
              textStyle="label"
              display={{ base: "none", sm: "inline-flex" }}
              alignItems="baseline"
              gap="7px"
              flexShrink={0}
              color="ink.label"
              borderBottomWidth={0}
              _hover={{ color: "accent" }}
              transitionProperty="color"
              transitionDuration="hover"
            >
              github
              <Box as="span" aria-hidden="true" fontSize="11px" color="ink.5">
                ↗
              </Box>
            </Link>
            <MobileNav />
          </HStack>
        </Box>
      </Container>
    </Box>
  );
};

export default Header;
