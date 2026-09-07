import { Box, type BoxProps } from "@chakra-ui/react";

export type CalloutTone = "error" | "warn";

export type CalloutProps = BoxProps & {
  tone?: CalloutTone;
  typeface?: "prose" | "code";
  children: React.ReactNode;
};

const toneStyles = {
  error: { color: "status.error", bg: "status.errorSoft", borderColor: "status.errorRule" },
  warn: { color: "status.warn", bg: "status.warnSoft", borderColor: "status.warnRule" },
} as const;

const Callout: React.FC<CalloutProps> = ({
  tone = "error",
  typeface = "prose",
  children,
  ...boxProps
}) => (
  <Box
    role={tone === "error" ? "alert" : "status"}
    px={4}
    py={2}
    borderBottom="1px solid"
    textStyle={typeface === "code" ? "codeSm" : "bodySm"}
    flexShrink={0}
    {...toneStyles[tone]}
    {...boxProps}
  >
    {children}
  </Box>
);

export default Callout;
