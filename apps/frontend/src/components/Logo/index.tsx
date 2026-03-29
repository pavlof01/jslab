import Link from "next/link";
import Image from "next/image";
import { Box } from "@chakra-ui/react";

export const Logo = () => {
  return (
    <Link href="/">
      <Box cursor="pointer" _hover={{ opacity: 0.9 }}>
        <Image src="/jslab-logo-transparent.png" alt="JSLab" width={40} height={40} priority />
      </Box>
    </Link>
  );
};

export default Logo;
