import { Box } from "@chakra-ui/react";
import { ENGINES } from "@/lib/engines";
import type { EngineKey } from "@/lib/types";
import { engineNote } from "./playground.styles";

export function EngineNote({
  engine,
  detail = "first-quirk",
}: {
  engine: EngineKey;
  detail?: "first-quirk" | "full";
}) {
  const { executes, summary, quirks } = ENGINES[engine];
  const lead = executes ? "executes · " : "compile-only · ";

  if (detail === "first-quirk") {
    return (
      <Box css={engineNote}>
        {lead}
        {quirks[0]}
      </Box>
    );
  }

  return (
    <Box css={engineNote}>
      <span>
        {lead}
        {summary}
      </span>
      {quirks.map((quirk) => (
        <Box as="span" key={quirk} display="block" mt="4px" color="ink.5">
          {quirk}
        </Box>
      ))}
    </Box>
  );
}
