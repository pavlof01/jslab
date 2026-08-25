import { Box } from "@chakra-ui/react";

export type DefaultEmptyCodeBlockStateProps = {
  title?: string;
  description?: string;
};

const DefaultEmptyCodeBlockState: React.FC<DefaultEmptyCodeBlockStateProps> = ({
  title = "⌘↵ to run",
  description,
}) => {
  return (
    <Box textStyle="code" px="12px" py="10px" lineHeight="21px" color="ink.5">
      <Box>{title}</Box>
      {description ? <Box color="ink.6">{description}</Box> : null}
    </Box>
  );
};

export default DefaultEmptyCodeBlockState;
