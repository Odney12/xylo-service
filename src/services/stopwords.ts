const STOP_WORDS = ["human", "stop", "coach"];

export function isStopWord(text: string): boolean {
  const lower = text.toLowerCase();
  return STOP_WORDS.some((word) => lower.includes(word));
}