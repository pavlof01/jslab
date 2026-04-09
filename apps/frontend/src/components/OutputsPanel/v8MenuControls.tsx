import { Stack, HStack, Text } from "@chakra-ui/react";
import React, { Dispatch, SetStateAction } from "react";
import V8FlagSelector from "../V8FlagSelector";
import V8Intrinsics from "../V8Intrinsics";

type Props = {
  selectedV8Flags?: string[];
  setSelectedV8Flags?: Dispatch<SetStateAction<string[]>>;
};

const V8MenuControls: React.FC<Props> = ({ selectedV8Flags, setSelectedV8Flags }) => {
  return (
    <Stack gap={2}>
      <HStack align="center" gap={2} flexWrap="wrap">
        <V8FlagSelector selectedV8Flags={selectedV8Flags!} setSelectedV8Flags={setSelectedV8Flags!} />
        <V8Intrinsics />
      </HStack>
      <Text fontSize="sm" color="#cbd5f5">
        {selectedV8Flags?.length ? `Selected: ${selectedV8Flags.join(", ")}` : "Selected: None"}
      </Text>
    </Stack>
  );
};

export default V8MenuControls;
