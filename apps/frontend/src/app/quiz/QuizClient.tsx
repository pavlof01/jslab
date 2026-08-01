"use client";

import { useCallback, useMemo, useState } from "react";
import { Badge, Box, Button, Flex, Heading, HStack, Link, Text, VStack } from "@chakra-ui/react";
import { LuCheck, LuExternalLink, LuX } from "react-icons/lu";

import { quizzes } from "@/lib/quizzes";
import { EngineKey } from "@/lib/types";
import { buildShareUrl } from "@/lib/shareState";

export default function QuizClient() {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(0);
  const [done, setDone] = useState(false);

  const quiz = quizzes[index];
  const isLast = index === quizzes.length - 1;
  const correct = picked === quiz.answer;

  const playgroundHref = useMemo(() => {
    if (typeof window === "undefined") return "/playground";
    return buildShareUrl(window.location.origin, "/playground", {
      code: quiz.code,
      engines: [EngineKey.v8],
      v8Flags: [],
    });
  }, [quiz.code]);

  const pick = useCallback(
    (i: number) => {
      if (picked !== null) return; // lock after first choice
      setPicked(i);
      setAnswered((a) => a + 1);
      if (i === quiz.answer) setScore((s) => s + 1);
    },
    [picked, quiz.answer],
  );

  const next = useCallback(() => {
    if (isLast) {
      setDone(true);
      return;
    }
    setIndex((i) => i + 1);
    setPicked(null);
  }, [isLast]);

  const restart = useCallback(() => {
    setIndex(0);
    setPicked(null);
    setScore(0);
    setAnswered(0);
    setDone(false);
  }, []);

  if (done) {
    return (
      <Box maxW="2xl" mx="auto" px={{ base: 4, md: 6 }} py={16} textAlign="center">
        <Heading as="h1" size="lg" mb={4}>
          {score} / {quizzes.length}
        </Heading>
        <Text color="whiteAlpha.700" mb={8}>
          {score === quizzes.length
            ? "Flawless — you know your coercion rules."
            : "Open any snippet in the playground or the spec tracer to see exactly why."}
        </Text>
        <Button onClick={restart}>Try again</Button>
      </Box>
    );
  }

  const optionState = (i: number): "idle" | "correct" | "wrong" => {
    if (picked === null) return "idle";
    if (i === quiz.answer) return "correct";
    if (i === picked) return "wrong";
    return "idle";
  };

  const optionColors: Record<"idle" | "correct" | "wrong", { border: string; bg: string }> = {
    idle: { border: "whiteAlpha.300", bg: "transparent" },
    correct: { border: "green.500", bg: "green.950" },
    wrong: { border: "red.500", bg: "red.950" },
  };

  return (
    <Box maxW="2xl" mx="auto" px={{ base: 4, md: 6 }} py={8}>
      <Flex justify="space-between" align="baseline" mb={6}>
        <Heading as="h1" size="md">
          JS Coercion Quiz
        </Heading>
        <HStack gap={3}>
          <Text fontSize="sm" color="whiteAlpha.600">
            {index + 1} / {quizzes.length}
          </Text>
          <Badge colorPalette="brand">
            score {score}/{answered}
          </Badge>
        </HStack>
      </Flex>

      <Text fontSize="sm" color="whiteAlpha.600" mb={2}>
        What does this print?
      </Text>
      <Box
        as="pre"
        fontFamily="mono"
        fontSize="sm"
        bg="background.200"
        border="1px solid"
        borderColor="whiteAlpha.200"
        borderRadius="md"
        p={4}
        mb={5}
        overflowX="auto"
      >
        {quiz.code}
      </Box>

      <VStack align="stretch" gap={2}>
        {quiz.options.map((opt, i) => {
          const state = optionState(i);
          const c = optionColors[state];
          return (
            <Flex
              as="button"
              key={opt}
              onClick={() => pick(i)}
              aria-disabled={picked !== null}
              align="center"
              justify="space-between"
              textAlign="left"
              px={4}
              py={3}
              borderRadius="md"
              border="1px solid"
              borderColor={c.border}
              bg={c.bg}
              cursor={picked === null ? "pointer" : "default"}
              _hover={picked === null ? { borderColor: "brand.400" } : undefined}
              fontFamily="mono"
              fontSize="sm"
            >
              <Text>{opt}</Text>
              {state === "correct" && <LuCheck color="var(--chakra-colors-green-400)" />}
              {state === "wrong" && <LuX color="var(--chakra-colors-red-400)" />}
            </Flex>
          );
        })}
      </VStack>

      {picked !== null && (
        <Box mt={5}>
          <Text fontWeight="700" color={correct ? "green.300" : "red.300"} mb={1}>
            {correct ? "Correct" : "Not quite"}
          </Text>
          <Text fontSize="sm" color="whiteAlpha.800" mb={4}>
            {quiz.explanation}
          </Text>
          <Flex justify="space-between" align="center" wrap="wrap" gap={3}>
            <Link
              href={playgroundHref}
              target="_blank"
              rel="noopener noreferrer"
              fontSize="sm"
              color="brand.300"
              display="inline-flex"
              alignItems="center"
              gap={1}
            >
              Run it in the playground <LuExternalLink />
            </Link>
            <Button onClick={next}>{isLast ? "See score" : "Next question"}</Button>
          </Flex>
        </Box>
      )}
    </Box>
  );
}
