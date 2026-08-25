"use client";

import { createRecipeContext, type HTMLChakraProps, type RecipeProps } from "@chakra-ui/react";

const { withContext } = createRecipeContext({ key: "band" });

export type BandProps = HTMLChakraProps<"div", RecipeProps<"band">>;

export const Band = withContext<HTMLDivElement, BandProps>("div");
