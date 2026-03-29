"use client";

import { Button, Drawer, CloseButton } from "@chakra-ui/react";
import { IoMenu } from "react-icons/io5";
import { useState } from "react";

import Logo from "../Logo";
import Nav from "./Nav";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-background-dark/80 backdrop-blur-md px-4 sm:px-6 md:px-20 py-4">
      <div className="flex items-center justify-between gap-4 max-w-4xl mx-auto">
        <Logo />

        <Nav />
      </div>
    </header>
  );
}
