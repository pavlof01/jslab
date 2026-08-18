import Link from "next/link";
import Image from "next/image";
import { Box } from "@chakra-ui/react";

export const Logo = () => {
  return (
    <Link href="/">
      <Box cursor="pointer" _hover={{ opacity: 0.9 }}>
        {/*
          The file is 963×1085, not square. Declaring 40×40 squashed it, and
          Chakra's preflight (`img { height: auto }`) overrode the height while
          the width stood — which is what Next was warning about. Declare the
          real ratio and pin the height the bar actually gives it.
        */}
        <Image
          src="/jslab-logo-transparent.png"
          alt="JSLab"
          width={36}
          height={40}
          style={{ width: "auto", height: 32 }}
          priority
        />
      </Box>
    </Link>
  );
};

export default Logo;
