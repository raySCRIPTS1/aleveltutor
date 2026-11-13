export type Band = { label: string; color: string };

export function bandFor(score: number, attempts: number): Band {
  if (attempts === 0 || score <= 0) return { label: "Not started", color: "#6c7596" };
  if (score <= 40) return { label: "Learning", color: "#f0a35e" };
  if (score <= 70) return { label: "Developing", color: "#4fd6e8" };
  if (score <= 90) return { label: "Strong", color: "#6d8cff" };
  return { label: "Mastered", color: "#a07bff" };
}

/**
 * Score is an evidence-weighted moving average (0-100).
 * Correct answers that show real understanding count fully; correct answers that look memorised
 * count about half; wrong answers pull the score down. Early attempts move it faster.
 */
export function nextScore(prev: number, attempts: number, correct: boolean, understanding: "concept" | "memorised" | "unclear") {
  const evidence = !correct ? 0 : understanding === "concept" ? 100 : understanding === "memorised" ? 55 : 75;
  const weight = Math.max(0.15, 1 / (attempts + 1.5));
  return Math.round(Math.min(100, Math.max(0, prev * (1 - weight) + evidence * weight)) * 10) / 10;
}
