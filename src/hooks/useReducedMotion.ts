import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

/** Keep custom motion in step with the device's Reduce Motion setting. */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => { if (mounted) setReduced(enabled); })
      .catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduced);
    return () => { mounted = false; subscription.remove(); };
  }, []);

  return reduced;
}
