import type { IconType } from "react-icons";
import { FaBolt, FaGithub, FaProjectDiagram } from "react-icons/fa";
import { FaRegCirclePlay } from "react-icons/fa6";
import { PiBracketsCurlyBold } from "react-icons/pi";
import { BsRocketTakeoff } from "react-icons/bs";
import {
  Box,
  Button,
  Container,
  Flex,
  Grid,
  GridItem,
  Heading,
  HStack,
  IconButton,
  SimpleGrid,
  Text,
  VStack,
} from "@chakra-ui/react";
import { LuGlobe } from "react-icons/lu";
import { MdMailOutline } from "react-icons/md";
import Link from "next/link";
import Logo from "@/components/Logo";

const SITE_URL = "https://jslab.su";
const REPO_URL = "https://github.com/pavlof01/js-engines";
const PROFILE_URL = "https://github.com/pavlof01";
const MAILTO_URL = "mailto:pavlof01@gmail.com";

type FooterLink = {
  label: string;
  href: string;
  external?: boolean;
};

const methodologySteps: Array<{
  icon: IconType;
  title: string;
  description: string;
}> = [
  {
    icon: PiBracketsCurlyBold,
    title: "1. Specification Parsing",
    description: "Automated ingestion of ECMA-262 standards into machine-readable data structures.",
  },
  {
    icon: FaProjectDiagram,
    title: "2. Logic Mapping",
    description: "Translating abstract prose into high-fidelity reactive flowcharts and state machines.",
  },
  {
    icon: FaRegCirclePlay,
    title: "3. Runtime Tracing",
    description: "Real-time tracking of internal method calls, environment records, and memory states.",
  },
];

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

const displayFont = "'Plus Jakarta Sans', Inter, var(--font-sans), sans-serif";
const bodyFont = "Inter, var(--font-sans), sans-serif";
const subtleBorder = "rgba(255,255,255,0.08)";
const cardBorder = "rgba(255,255,255,0.1)";
const mutedText = "rgba(255,255,255,0.62)";

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

export default function LandingPage() {
  return (
    <Box
      as="main"
      bg="brand.800"
      color="white"
      fontFamily={bodyFont}
      overflow="hidden"
      position="relative"
    >
      <Box
        aria-hidden="true"
        inset={0}
        pointerEvents="none"
        position="absolute"
      >
        <Box
          position="absolute"
          top="-10rem"
          left="-8rem"
          h="26rem"
          w="26rem"
          borderRadius="full"
          bg="rgba(249,227,26,0.12)"
          filter="blur(110px)"
        />
        <Box
          position="absolute"
          top="18rem"
          right="-10rem"
          h="24rem"
          w="24rem"
          borderRadius="full"
          bg="rgba(255,255,255,0.05)"
          filter="blur(140px)"
        />
      </Box>

      <Box
        as="section"
        position="relative"
        px={{ base: 4, sm: 6, md: 20 }}
        pt={{ base: 12, sm: 16, md: 24 }}
        pb={{ base: 16, sm: 20, md: 24 }}
        textAlign="center"
      >
        <Container maxW="4xl" px={0}>
          <VStack gap={{ base: 8, md: 10 }}>
            <Box
              borderWidth="1px"
              borderColor="rgba(255,255,255,0.12)"
              bg="rgba(255,255,255,0.04)"
              borderRadius="full"
              px={4}
              py={2}
              backdropFilter="blur(16px)"
            >
              <Text
                color="whiteAlpha.800"
                fontSize="xs"
                fontWeight="700"
                letterSpacing="0.28em"
                textTransform="uppercase"
              >
                Interactive ECMAScript Explorer
              </Text>
            </Box>

            <Heading
              as="h1"
              fontFamily={displayFont}
              fontSize={{ base: "2.75rem", sm: "3.5rem", md: "5.5rem", xl: "6.25rem" }}
              fontWeight="900"
              letterSpacing="-0.05em"
              lineHeight={{ base: "0.98", md: "1.02" }}
              maxW="5xl"
            >
              Understand the Engine.
              <br />
              <Text as="span" color="brand.300">
                Explore the Spec.
              </Text>
            </Heading>

            <Text
              color={mutedText}
              fontSize={{ base: "sm", sm: "md", md: "lg" }}
              lineHeight="1.8"
              maxW="2xl"
            >
              Move from ECMA prose to visual execution traces, inspect abstract operations,
              and see how runtime behavior unfolds step by step.
            </Text>

            <Button
              asChild
              colorPalette="brand"
              variant="solid"
              h="auto"
              borderRadius="xl"
              boxShadow="0 10px 40px -10px rgba(249,227,26,0.3)"
              width={{ base: "full", sm: "auto" }}
              fontSize={{ base: "md", sm: "lg", md: "xl" }}
              fontWeight="800"
              px={{ base: 6, sm: 8, md: 12 }}
              py={{ base: 4, md: 5 }}
              transition="transform 0.2s ease, opacity 0.2s ease"
              _hover={{ opacity: 0.92, transform: "translateY(-2px)" }}
            >
              <Link
                href="/playground"
                style={{ display: "inline-flex", alignItems: "center", gap: "0.75rem" }}
              >
                Get Started Free
                <BsRocketTakeoff />
              </Link>
            </Button>
          </VStack>
        </Container>
      </Box>

      <Box
        as="section"
        position="relative"
        borderTopWidth="1px"
        borderColor={subtleBorder}
        bg="rgba(255,255,255,0.02)"
        px={{ base: 4, sm: 6, md: 20 }}
        py={{ base: 12, sm: 16, md: 20 }}
      >
        <Container maxW="7xl" px={0}>
          <VStack gap={{ base: 10, md: 12 }} align="stretch">
            <VStack gap={4} textAlign="center">
              <Text
                color="brand.300"
                fontSize="xs"
                fontWeight="700"
                letterSpacing="0.3em"
                textTransform="uppercase"
              >
                The Methodology
              </Text>
              <Heading
                as="h2"
                fontFamily={displayFont}
                fontSize={{ base: "2xl", md: "4xl" }}
                fontWeight="900"
                letterSpacing="-0.04em"
              >
                From Spec Text to Visual Flow
              </Heading>
              <Text color={mutedText} fontSize="base" lineHeight="1.8" maxW="2xl">
                We transform complex ECMAScript prose into executable models that reveal
                internal JavaScript behavior.
              </Text>
            </VStack>

            <SimpleGrid columns={{ base: 1, md: 3 }} gap={6}>
              {methodologySteps.map((step) => (
                <Box
                  key={step.title}
                  display="flex"
                  minH="100%"
                  flexDirection="column"
                  borderWidth="1px"
                  borderColor={cardBorder}
                  borderRadius="2xl"
                  bg="rgba(255,255,255,0.02)"
                  p={{ base: 6, md: 8 }}
                  transition="transform 0.2s ease, border-color 0.2s ease"
                  _hover={{
                    borderColor: "rgba(249,227,26,0.3)",
                    transform: "translateY(-4px)",
                  }}
                >
                  <Flex
                    mb={6}
                    h={12}
                    w={12}
                    align="center"
                    justify="center"
                    borderRadius="xl"
                    bg="rgba(249,227,26,0.1)"
                    color="brand.300"
                  >
                    <step.icon size={24} />
                  </Flex>

                  <Heading
                    as="h3"
                    fontFamily={displayFont}
                    fontSize="xl"
                    fontWeight="800"
                    mb={2}
                  >
                    {step.title}
                  </Heading>

                  <Text color={mutedText} fontSize="sm" lineHeight="1.75" mb={6}>
                    {step.description}
                  </Text>
                </Box>
              ))}
            </SimpleGrid>
          </VStack>
        </Container>
      </Box>

      <Box as="section" px={{ base: 4, sm: 6, md: 20 }} py={{ base: 16, sm: 20, md: 24 }}>
        <Container maxW="4xl" px={0}>
          <Box
            position="relative"
            overflow="hidden"
            borderRadius={{ base: "2rem", md: "2.5rem" }}
            bg="brand.300"
            color="brand.800"
            px={{ base: 6, sm: 8, md: 16 }}
            py={{ base: 8, sm: 10, md: 16 }}
            textAlign="center"
            boxShadow="0 30px 60px -15px rgba(249,227,26,0.3)"
          >
            <Box
              aria-hidden="true"
              position="absolute"
              top="-5rem"
              right="-3rem"
              h="14rem"
              w="14rem"
              borderRadius="full"
              bg="rgba(35,33,15,0.08)"
              filter="blur(48px)"
            />

            <VStack gap={6} position="relative">
              <Heading
                as="h2"
                fontFamily={displayFont}
                fontSize={{ base: "1.9rem", sm: "2.2rem", md: "3.5rem" }}
                fontWeight="900"
                letterSpacing="-0.05em"
                lineHeight="1.05"
              >
                Ready to debug the specification?
              </Heading>

              <Text maxW="xl" fontSize={{ base: "md", md: "lg" }} fontWeight="600" opacity={0.72}>
                Join developers and engine contributors using JSLab to master the language.
              </Text>

              <Flex
                direction={{ base: "column", sm: "row" }}
                gap={4}
                justify="center"
                w="full"
              >
                <Button
                  asChild
                  h="auto"
                  width={{ base: "full", sm: "auto" }}
                  borderRadius="xl"
                  bg="brand.800"
                  color="white"
                  fontSize="md"
                  fontWeight="800"
                  px={{ base: 6, md: 8 }}
                  py={4}
                  _hover={{ opacity: 0.92 }}
                >
                  <Link
                    href="/abstract-functions-visualizer"
                    style={{ display: "inline-flex", alignItems: "center", gap: "0.75rem" }}
                  >
                    Launch Explorer
                    <FaBolt />
                  </Link>
                </Button>
              </Flex>
            </VStack>
          </Box>
        </Container>
      </Box>

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
                An open-source project dedicated to making the ECMAScript standard accessible
                to every developer.
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
    </Box>
  );
}
