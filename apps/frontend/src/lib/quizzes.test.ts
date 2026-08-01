import { describe, it, expect } from "@jest/globals";
import { quizzes } from "./quizzes";

describe("quizzes data integrity", () => {
  it("has a non-empty, unique-id set", () => {
    expect(quizzes.length).toBeGreaterThan(0);
    expect(new Set(quizzes.map((q) => q.id)).size).toBe(quizzes.length);
  });

  it("every quiz has a valid answer index and >= 2 options", () => {
    for (const q of quizzes) {
      expect(q.options.length).toBeGreaterThanOrEqual(2);
      expect(q.answer).toBeGreaterThanOrEqual(0);
      expect(q.answer).toBeLessThan(q.options.length);
      expect(q.code.trim().length).toBeGreaterThan(0);
      expect(q.explanation.trim().length).toBeGreaterThan(0);
    }
  });

  it("has no duplicate options within a quiz", () => {
    for (const q of quizzes) {
      expect(new Set(q.options).size).toBe(q.options.length);
    }
  });
});
