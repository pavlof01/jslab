import { Flex } from "@chakra-ui/react";
import { FaLongArrowAltRight } from "react-icons/fa";

const StageArrow: React.FC = () => {
  return (
    <Flex align="center" px={2} aria-hidden="true">
      <FaLongArrowAltRight />
    </Flex>
  );
};

export default StageArrow;
