import { useRef } from "react";

export const useLongPress = ({
  onLongPress,
  delay = 500,
}: {
  onLongPress: () => void;
  delay?: number;
}): [React.HTMLAttributes<HTMLElement>, () => boolean] => {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggeredRef = useRef(false);

  const start = () => {
    triggeredRef.current = false;
    timeoutRef.current = setTimeout(() => {
      triggeredRef.current = true;
      onLongPress();
    }, delay);
  };

  const clear = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const wasTriggered = () => triggeredRef.current;

  return [
    {
      onMouseDown: start,
      onTouchStart: start,
      onMouseUp: clear,
      onMouseLeave: clear,
      onTouchEnd: clear,
    },
    wasTriggered,
  ];
};
