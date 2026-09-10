import { describe, expect, it } from "vitest";

import { QUESTIONS } from "../src/questions";

describe("question bank", () => {
  it("serves the complete test with the corrected rules question", () => {
    expect(QUESTIONS).toHaveLength(22);
    expect(QUESTIONS.find((question) => question.id === 16)?.text).toBe(
      "Я не приймаю правила заради правил.",
    );
  });
});
