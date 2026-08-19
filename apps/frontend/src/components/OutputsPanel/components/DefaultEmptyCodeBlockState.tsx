import { Box } from "@chakra-ui/react";
import type React from "react";

export type Props = {
  title?: string;
  description?: string;
};

const DefaultEmptyCodeBlockState: React.FC<Props> = ({ title = "⌘↵ to run", description }) => {
  return (
    <Box textStyle="code" px="12px" py="10px" lineHeight="21px" color="ink.5">
      <Box>{title}</Box>
      {description ? <Box color="ink.6">{description}</Box> : null}
    </Box>
  );
};

export default DefaultEmptyCodeBlockState;
