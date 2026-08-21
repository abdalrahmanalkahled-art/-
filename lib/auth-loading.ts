/**
 * Resolves a promise within a bounded time and returns a fallback when storage
 * or another platform service does not respond. This prevents the app from
 * remaining on the loading screen indefinitely.
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  fallback: T,
): Promise<T> {
  return new Promise<T>((resolve) => {
    let settled = false;

    const finish = (value: T) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    const timer = setTimeout(() => finish(fallback), timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timer);
        finish(value);
      })
      .catch(() => {
        clearTimeout(timer);
        finish(fallback);
      });
  });
}

export const AUTH_CHECK_TIMEOUT_MS = 1500;

export function shouldShowLoading(
  platform: string,
  isLoading: boolean,
  authCheckTimedOut: boolean,
): boolean {
  // The web preview can render the route while AsyncStorage rehydrates. Do not
  // cover the usable preview with a native-style full-screen overlay.
  return platform !== "web" && isLoading && !authCheckTimedOut;
}

