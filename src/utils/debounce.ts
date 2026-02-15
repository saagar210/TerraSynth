/**
 * Returns a debounced version of fn that waits `ms` before executing.
 * Subsequent calls cancel previous pending call.
 */
export function debounce<T extends (...args: any[]) => void>(
  fn: T,
  ms: number
): T {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  return ((...args: any[]) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), ms);
  }) as T;
}
