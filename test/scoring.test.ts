import { describe, expect, it } from "vitest";

import { calculateResults, findDominantTendencies } from "../src/scoring";

describe("calculateResults", () => {
  it("normalizes positive answers to exactly 100 percent", () => {
    const results = calculateResults([
      { tendency: "upholder", isYes: true },
      { tendency: "upholder", isYes: true },
      { tendency: "obliger", isYes: true },
      { tendency: "questioner", isYes: true },
      { tendency: "rebel", isYes: false },
    ]);

    expect(results).toEqual({
      upholder: 50,
      obliger: 25,
      questioner: 25,
      rebel: 0,
    });
    expect(Object.values(results).reduce((sum, score) => sum + score, 0)).toBe(100);
  });

  it("splits an all-negative result evenly", () => {
    expect(calculateResults([])).toEqual({
      upholder: 25,
      obliger: 25,
      questioner: 25,
      rebel: 25,
    });
  });
});

describe("findDominantTendencies", () => {
  it("returns tied leaders in tendency order", () => {
    expect(
      findDominantTendencies({
        upholder: 40,
        obliger: 10,
        questioner: 40,
        rebel: 10,
      }),
    ).toEqual(["upholder", "questioner"]);
  });
});
