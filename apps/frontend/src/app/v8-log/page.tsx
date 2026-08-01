import type { Metadata } from "next";
import V8LogClient from "./V8LogClient";

export const metadata: Metadata = {
  title: "v8.log Profiler Viewer",
  description:
    "Upload a v8.log (d8 --prof / node --prof) and see the hottest functions by sampled ticks, largest generated code, and deopt count — parsed entirely in your browser.",
  alternates: { canonical: "/v8-log" },
};

export default function V8LogPage() {
  return <V8LogClient />;
}
