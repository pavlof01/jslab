import type { IconType } from "react-icons";
import { FaGithub } from "react-icons/fa";
import { Box, Button, Container, Flex, Grid, GridItem, HStack, IconButton, Text, VStack } from "@chakra-ui/react";
import { LuGlobe } from "react-icons/lu";
import { MdMailOutline } from "react-icons/md";
import Link from "next/link";
import Logo from "@/components/Logo";

const displayFont = "'Plus Jakarta Sans', Inter, var(--font-sans), sans-serif";

const SITE_URL = "https://jslab.su";
const REPO_URL = "https://github.com/pavlof01/js-engines";
const PROFILE_URL = "https://github.com/pavlof01";
const MAILTO_URL = "mailto:pavlof01@gmail.com";

type FooterLink = { label: string; href: string; external?: boolean };

const platformLinks: FooterLink[] = [
  { label: "Interactive Trace", href: "/playground" },
  { label: "Spec Visualizer", href: "/abstract-functions-visualizer" },
  { label: "Repository", href: REPO_URL, external: true },
  { label: "Infra Notes", href: `${REPO_URL}/blob/main/docs/infra.md`, external: true },
];

const communityLinks: FooterLink[] = [
  { label: "Contributing", href: REPO_URL, external: true },
  { label: "Issues", href: `${REPO_URL}/issues`, external: true },
  { label: "Author Profile", href: PROFILE_URL, external: true },
  { label: "Contact Us", href: MAILTO_URL, external: true },
];

const socialLinks: Array<{ label: string; href: string; icon: IconType }> = [
  { label: "Website", href: SITE_URL, icon: LuGlobe },
  { label: "GitHub", href: PROFILE_URL, icon: FaGithub },
  { label: "Email", href: MAILTO_URL, icon: MdMailOutline },
];

function WipFooterList({ items }: { items: FooterLink[] }) {
  return (
    <VStack align="start" gap={{ base: 3, md: 4 }}>
      {items.map((item) => (
        <Flex
          key={item.label}
          align={{ base: "flex-start", sm: "center" }}
          gap={2}
          wrap="wrap"
          width="full"
          color="whiteAlpha.500"
          cursor="not-allowed"
          opacity={0.6}
          pointerEvents="none"
          userSelect="none"
        >
          <Text fontSize="sm" fontWeight="500">
            {item.label}
          </Text>
          <Box
            borderRadius="md"
            bg="rgba(249,227,26,0.2)"
            px={2}
            py={1}
            color="brand.300"
            fontSize="xs"
            fontWeight="700"
            lineHeight="1"
          >
            WIP
          </Box>
        </Flex>
      ))}
    </VStack>
  );
}

export function FooterSection() {
  return (
    <Box
      as="footer"
      bg="brand.800"
      borderTopWidth="1px"
      borderColor="rgba(255,255,255,0.05)"
      px={{ base: 4, sm: 6, md: 20 }}
      pt={{ base: 12, md: 16 }}
      pb={{ base: 8, md: 10 }}
    >
      <Container maxW="7xl" px={0}>
        <Grid
          templateColumns={{ base: "1fr", md: "repeat(4, 1fr)" }}
          gap={{ base: 8, md: 12 }}
          mb={{ base: 10, md: 16 }}
        >
          <GridItem colSpan={{ base: 1, md: 2 }}>
            <Box mb={6}>
              <Logo />
            </Box>
            <Text color="whiteAlpha.500" fontSize="sm" lineHeight="1.8" maxW="sm" mb={8}>
              An open-source project dedicated to making the ECMAScript standard accessible to every developer.
            </Text>
            <HStack gap={3} wrap="wrap">
              {socialLinks.map((item) => (
                <IconButton
                  key={item.label}
                  asChild
                  aria-label={item.label}
                  bg="transparent"
                  borderWidth="1px"
                  borderColor="rgba(255,255,255,0.08)"
                  color="whiteAlpha.700"
                  transition="color 0.2s ease, border-color 0.2s ease"
                  _hover={{ color: "brand.300", borderColor: "rgba(249,227,26,0.3)" }}
                >
                  <Link href={item.href} target="_blank" rel="noreferrer">
                    <item.icon />
                  </Link>
                </IconButton>
              ))}
            </HStack>
          </GridItem>

          <GridItem>
            <Text
              mb={6}
              color="rgba(249,227,26,0.8)"
              fontFamily={displayFont}
              fontSize="sm"
              fontWeight="800"
              letterSpacing="0.22em"
              textTransform="uppercase"
            >
              Platform
            </Text>
            <WipFooterList items={platformLinks} />
          </GridItem>

          <GridItem>
            <Text
              mb={6}
              color="rgba(249,227,26,0.8)"
              fontFamily={displayFont}
              fontSize="sm"
              fontWeight="800"
              letterSpacing="0.22em"
              textTransform="uppercase"
            >
              Community
            </Text>
            <WipFooterList items={communityLinks} />
          </GridItem>
        </Grid>

        <Flex
          borderTopWidth="1px"
          borderColor="rgba(255,255,255,0.05)"
          pt={8}
          direction={{ base: "column", md: "row" }}
          justify="space-between"
          align={{ base: "flex-start", md: "center" }}
          gap={4}
          color="whiteAlpha.400"
          fontSize="10px"
          fontWeight="700"
          letterSpacing="0.2em"
          textTransform="uppercase"
        >
          <Text maxW={{ base: "full", md: "2xl" }}>
            © {new Date().getFullYear()} JSLab Project. Not affiliated with ECMA International.
          </Text>
          <HStack gap={{ base: 4, md: 8 }} wrap="wrap">
            <Button
              asChild
              variant="plain"
              px={0}
              h="auto"
              minW="auto"
              color="whiteAlpha.400"
              _hover={{ color: "white" }}
            >
              <Link href={REPO_URL} target="_blank" rel="noreferrer">
                Repository
              </Link>
            </Button>
            <Button
              asChild
              variant="plain"
              px={0}
              h="auto"
              minW="auto"
              color="whiteAlpha.400"
              _hover={{ color: "white" }}
            >
              <Link href={MAILTO_URL}>Contact</Link>
            </Button>
          </HStack>
        </Flex>
      </Container>
    </Box>
  );
}
