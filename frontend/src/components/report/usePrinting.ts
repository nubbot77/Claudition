import { useEffect, useState } from "react";
import { flushSync } from "react-dom";

/**
 * True while the browser prepares a print. Collapsed sections read this to open themselves, so a printed report
 * always carries every round's rubric and model answer. flushSync makes the re-render land before the print
 * snapshot is taken.
 */
export function usePrinting(): boolean {
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    const before = () => flushSync(() => setPrinting(true));
    const after = () => setPrinting(false);
    window.addEventListener("beforeprint", before);
    window.addEventListener("afterprint", after);
    return () => {
      window.removeEventListener("beforeprint", before);
      window.removeEventListener("afterprint", after);
    };
  }, []);

  return printing;
}
