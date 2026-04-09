import { defineRecipe } from "@chakra-ui/react";

export const buttonRecipe = defineRecipe({
  variants: {
    variant: {
      solid: {
        bg: "brand.300",
        color: "black",
        _hover: {
          bg: "brand.300/70",
        },
        _active: {
          bg: "brand.contrast",
        },
      },
    },
  },
});