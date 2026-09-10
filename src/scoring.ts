import { TENDENCIES, type Answer, type Results, type Tendency } from "./types";

export function calculateResults(answers: readonly Answer[]): Results {
  const yesCounts: Results = { upholder: 0, obliger: 0, questioner: 0, rebel: 0 };
  for (const answer of answers) {
    if (answer.isYes) yesCounts[answer.tendency] += 1;
  }

  const totalYes = Object.values(yesCounts).reduce((sum, count) => sum + count, 0);
  if (totalYes === 0) {
    return { upholder: 25, obliger: 25, questioner: 25, rebel: 25 };
  }

  const raw = Object.fromEntries(
    TENDENCIES.map((tendency) => [tendency, (yesCounts[tendency] * 100) / totalYes]),
  ) as Record<Tendency, number>;
  const results = Object.fromEntries(
    TENDENCIES.map((tendency) => [tendency, Math.floor(raw[tendency])]),
  ) as Results;
  let remaining = 100 - Object.values(results).reduce((sum, score) => sum + score, 0);
  const byRemainder = [...TENDENCIES].sort(
    (left, right) => raw[right] - results[right] - (raw[left] - results[left]),
  );
  for (const tendency of byRemainder) {
    if (remaining === 0) break;
    results[tendency] += 1;
    remaining -= 1;
  }
  return results;
}

export function findDominantTendencies(results: Results): Tendency[] {
  const highest = Math.max(...Object.values(results));
  return TENDENCIES.filter((tendency) => results[tendency] === highest);
}
