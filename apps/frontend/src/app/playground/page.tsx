import PlaygroundClient from "@/app/_components/PlaygroundClient";

export const metadata = {
  title: "JavaScript Playground",
  description:
    "Compare JavaScript engines by writing and executing code. View bytecode across V8, SpiderMonkey, Hermes, and JSC.",
};

export default function PlaygroundPage() {
  return <PlaygroundClient />;
}
