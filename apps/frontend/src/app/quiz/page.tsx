import type { Metadata } from "next";
import QuizClient from "./QuizClient";

export const metadata: Metadata = {
  title: "JavaScript Coercion Quiz",
  description:
    "Predict what tricky JavaScript expressions print — [] + {}, 0.1 + 0.2, [] == ![] and more — then see the step-by-step coercion in the playground.",
  alternates: { canonical: "/quiz" },
};

export default function QuizPage() {
  return <QuizClient />;
}
