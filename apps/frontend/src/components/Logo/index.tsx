import Link from "next/link";
import Image from "next/image";
import { Box } from "@chakra-ui/react";

export const Logo = () => {
  return (
    <Link href="/">
      <Box cursor="pointer" _hover={{ opacity: 0.9 }}>
        {/*
          Animated SVG mark (SMIL) — it animates inside a plain <img>, and
          `unoptimized` keeps the Next image optimizer from touching the SVG.
          The mark is 1000×1010; pin the height the bar gives it.
        */}
        <Image
          src="/jslab-logo.svg"
          alt="JSLab"
          width={99}
          height={100}
          unoptimized
          style={{ width: "auto", height: 32 }}
          priority
        />
      </Box>
    </Link>
  );
};

export default Logo;
