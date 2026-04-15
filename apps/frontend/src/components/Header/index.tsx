import { Box, Container, Flex, HStack } from "@chakra-ui/react";
import Logo from "../Logo";
import Nav from "./Nav";

export function Header() {
  return (
    <Box
      as="header"
      position="sticky"
      top={0}
      zIndex={50}
      w="full"
      borderBottomWidth="1px"
      borderColor="rgba(255,255,255,0.1)"
      bg="rgba(35,33,15,0.82)"
      backdropFilter="blur(8px)"
      px={{ base: 6, md: 20 }}
      py={4}
    >
      <Container maxW="7xl" px={0}>
        <Flex align="center" justify="space-between" gap={{ base: 4, md: 8 }}>
          <HStack gap={{ base: 4, md: 12 }} flex="1" minW={0}>
            <Logo />
            <Nav />
          </HStack>
        </Flex>
      </Container>
    </Box>
  );
}
