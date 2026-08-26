import { useCallback, useRef, useState } from "react";

/** يمنع النقرات المتكررة من تشغيل عملية حفظ أو حذف متزامنة لنفس الواجهة. */
export function useSingleFlight() {
  const inFlight = useRef(false);
  const [isRunning, setIsRunning] = useState(false);

  const run = useCallback(async <T,>(operation: () => Promise<T>): Promise<T | undefined> => {
    if (inFlight.current) return undefined;
    inFlight.current = true;
    setIsRunning(true);
    try {
      return await operation();
    } finally {
      inFlight.current = false;
      setIsRunning(false);
    }
  }, []);

  return { isRunning, run };
}
