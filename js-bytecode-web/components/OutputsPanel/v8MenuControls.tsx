import { Stack, HStack, Text } from "@chakra-ui/react";
import React, { Dispatch, SetStateAction } from "react";
import V8FlagSelector from "../V8FlagSelector";
import V8Intrinsics from "../V8Intrinsics";
import { useColorModeValue } from "../ui/color-mode";

type Props = {
  selectedV8Flags?: string[];
  setSelectedV8Flags?: Dispatch<SetStateAction<string[]>>;
};

const V8MenuControls: React.FC<Props> = ({ selectedV8Flags, setSelectedV8Flags }) => {
  const subTextColor = useColorModeValue("#64748b", "#cbd5f5");
  return (
    <Stack gap={2}>
      <HStack align="center" gap={2} flexWrap="wrap">
        <V8FlagSelector selectedV8Flags={selectedV8Flags!} setSelectedV8Flags={setSelectedV8Flags!} />
        <V8Intrinsics />
      </HStack>
      <Text fontSize="sm" color={subTextColor}>
        {selectedV8Flags?.length ? `Selected: ${selectedV8Flags.join(", ")}` : "Selected: None"}
      </Text>
    </Stack>
  );
};

export default V8MenuControls;
