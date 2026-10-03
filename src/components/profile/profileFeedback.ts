export function profileErrorText(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : "";
  return /[ก-๙]/.test(message) ? message : fallback;
}
