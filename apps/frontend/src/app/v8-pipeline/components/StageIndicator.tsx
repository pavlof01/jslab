import { Status } from "@chakra-ui/react";

import { LogoLoader } from "@/components/ui";

import type { StageStatus } from "../lib/usePipelineRun";

const STATUS_COLOR: Partial<Record<StageStatus, string>> = {
  ok: "status.ok",
  error: "status.error",
};

type Props = { status: StageStatus };

const StageIndicator: React.FC<Props> = ({ status }) => {
  const color = STATUS_COLOR[status];

  return (
    <Status.Root>
      {status === "loading" ? <LogoLoader size={14} /> : null}
      {color ? <Status.Indicator bg={color} /> : null}
    </Status.Root>
  );
};

export default StageIndicator;
