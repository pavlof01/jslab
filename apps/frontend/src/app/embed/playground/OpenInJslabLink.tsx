"use client";

import { Link } from "@chakra-ui/react";
import { useMemo } from "react";
import { LuExternalLink } from "react-icons/lu";

import { buildShareUrl } from "@/lib/shareState";
import { enabledEngines } from "@/lib/types";
import { useCode, useEngineFlags, useEngineSelection } from "@/store/engineOutputsSelectors";

const OpenInJslabLink: React.FC = () => {
  const code = useCode();
  const { engines } = useEngineSelection();
  const { flags } = useEngineFlags();

  const href = useMemo(
    () => buildShareUrl("", "/playground", { code, engines: enabledEngines(engines), flags }),
    [code, engines, flags],
  );

  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      fontSize="xs"
      color="accent"
      display="inline-flex"
      alignItems="center"
      gap={1}
    >
      Open in JSLab <LuExternalLink />
    </Link>
  );
};

export default OpenInJslabLink;
