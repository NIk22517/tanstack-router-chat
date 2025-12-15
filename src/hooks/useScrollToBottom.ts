import { useCallback, useEffect, useRef, useState } from "react";

interface UseScrollToBottomOptions {
  threshold?: number;
  behavior?: ScrollBehavior;
  debounceDelay?: number;
  dependencies?: any[];
}

interface UseScrollToBottomReturn {
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  scrollToBottom: () => void;
  isAtBottom: boolean;
}

export const useScrollToBottom = (
  options: UseScrollToBottomOptions = {}
): UseScrollToBottomReturn => {
  const {
    threshold = 100,
    behavior = "smooth",
    debounceDelay = 200,
    dependencies = [],
  } = options;

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasAtBottomRef = useRef(true);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const isColumnReverse = useCallback((el: HTMLDivElement) => {
    const style = window.getComputedStyle(el);
    return style.flexDirection === "column-reverse";
  }, []);

  const checkIfAtBottom = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return false;
    const reverse = isColumnReverse(el);
    let atBottom: boolean;
    if (reverse) {
      atBottom = el.scrollTop >= -threshold;
    } else {
      const scrollBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      atBottom = scrollBottom < threshold;
    }
    setIsAtBottom(atBottom);
    wasAtBottomRef.current = atBottom;
    return atBottom;
  }, [threshold, isColumnReverse]);

  const scrollToBottom = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) {
      console.warn("scrollContainerRef is null");
      return;
    }
    const reverse = isColumnReverse(el);
    if (reverse) {
      el.scrollTo({
        top: 0,
        behavior,
      });
    } else {
      el.scrollTo({
        top: el.scrollHeight,
        behavior,
      });
    }
  }, [behavior, isColumnReverse]);

  const handleScroll = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      checkIfAtBottom();
    }, debounceDelay);
  }, [checkIfAtBottom, debounceDelay]);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) {
      console.warn("scrollContainerRef is null in scroll effect");
      return;
    }

    el.addEventListener("scroll", handleScroll, { passive: true });
    checkIfAtBottom();

    return () => {
      el.removeEventListener("scroll", handleScroll);
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [checkIfAtBottom, handleScroll, ...dependencies]);
  return {
    isAtBottom,
    scrollContainerRef,
    scrollToBottom,
  };
};
