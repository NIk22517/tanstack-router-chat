import { useEffect, useState, useRef } from "react";

export const useChatSummaryStream = ({
  chat_id,
  token,
  enabled,
}: {
  chat_id: number;
  token: string | undefined;
  enabled: boolean;
}) => {
  const [summary, setSummary] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bufferRef = useRef("");
  const animationFrameId = useRef<number | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!enabled || !chat_id || !token) return;

    const controller = new AbortController();
    const decoder = new TextDecoder("utf-8");

    const flushBuffer = () => {
      if (!isMounted.current) return;
      if (bufferRef.current.length > 0) {
        setSummary((prev) => prev + bufferRef.current);
        bufferRef.current = "";
      }
      animationFrameId.current = requestAnimationFrame(flushBuffer);
    };

    const fetchSummary = async () => {
      setIsStreaming(true);
      setSummary("");
      setError(null);
      bufferRef.current = "";

      try {
        const res = await fetch(`http://localhost:8080/ai/summary/${chat_id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
          signal: controller.signal,
        });

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No response body");

        animationFrameId.current = requestAnimationFrame(flushBuffer);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          bufferRef.current += chunk;
        }
      } catch (err: any) {
        if (err.name !== "AbortError" && isMounted.current) {
          setError(err.message ?? "Streaming failed");
        }
      } finally {
        setIsStreaming(false);
        if (animationFrameId.current) {
          cancelAnimationFrame(animationFrameId.current);
          animationFrameId.current = null;

          if (bufferRef.current.length > 0) {
            setSummary((prev) => prev + bufferRef.current);
            bufferRef.current = "";
          }
        }
      }
    };

    fetchSummary();

    return () => {
      controller.abort();
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = null;
      }
    };
  }, [chat_id, token, enabled]);

  return { summary, isStreaming, error };
};
