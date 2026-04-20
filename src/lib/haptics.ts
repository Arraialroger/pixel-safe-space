/**
 * Subtle haptic feedback helper.
 * Safe no-op on browsers without the Vibration API (e.g. iOS Safari).
 */
export function haptic(pattern: number | number[] = 10): void {
  if (typeof navigator === "undefined") return;
  if (typeof navigator.vibrate !== "function") return;
  try {
    navigator.vibrate(pattern);
  } catch {
    // ignore
  }
}
