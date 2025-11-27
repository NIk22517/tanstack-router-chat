import { useEffect, useRef, useState } from "react";

export interface UseAudioRecorderReturn {
  isRecording: boolean;
  bars: number[];
  start: () => Promise<void>;
  stop: () => Promise<Blob>;
  clear: () => void;
  audioBlob: Blob | null;
  duration: number;
  generateWaveformBars: (
    blob: Blob,
    numberOfBars?: number
  ) => Promise<number[]>;
}

export const useAudioRecorder = (): UseAudioRecorderReturn => {
  const [isRecording, setIsRecording] = useState(false);
  const [bars, setBars] = useState<number[]>([]);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [duration, setDuration] = useState(0);

  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const analyser = useRef<AnalyserNode | null>(null);
  const audioCtx = useRef<AudioContext | null>(null);
  const animationId = useRef<number | null>(null);
  const isRecordingRef = useRef(false);
  const startTime = useRef<number>(0);
  const durationInterval = useRef<number | null>(null);
  const stopResolverRef = useRef<((blob: Blob) => void) | null>(null);

  const MAX_BARS = 50;
  const BAR_UPDATE_INTERVAL = 100;
  const lastBarTime = useRef<number>(0);

  const visualize = () => {
    if (!analyser.current || !isRecordingRef.current) return;

    const dataArray = new Uint8Array(analyser.current.frequencyBinCount);
    analyser.current.getByteFrequencyData(dataArray);

    const average =
      dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
    const normalized = Math.min(average / 255, 1);

    const now = Date.now();

    if (now - lastBarTime.current >= BAR_UPDATE_INTERVAL) {
      setBars((prev) => {
        const updated = [...prev, normalized];
        return updated.length > MAX_BARS ? updated.slice(-MAX_BARS) : updated;
      });
      lastBarTime.current = now;
    }

    animationId.current = requestAnimationFrame(visualize);
  };

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Create audio context
      audioCtx.current = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      const source = audioCtx.current.createMediaStreamSource(stream);

      // Setup analyser
      analyser.current = audioCtx.current.createAnalyser();
      analyser.current.fftSize = 2048;
      analyser.current.smoothingTimeConstant = 0.85;
      source.connect(analyser.current);

      // Reset state
      chunks.current = [];
      setBars([]);
      setAudioBlob(null);
      setDuration(0);
      isRecordingRef.current = true;
      startTime.current = Date.now();
      lastBarTime.current = Date.now();

      // Setup media recorder
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      mediaRecorder.current = new MediaRecorder(stream, { mimeType });

      mediaRecorder.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.current.push(e.data);
        }
      };

      mediaRecorder.current.onstop = () => {
        const blob = new Blob(chunks.current, { type: mimeType });
        setAudioBlob(blob);

        // Stop all media tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }

        // Cleanup audio context
        if (audioCtx.current?.state !== "closed") {
          audioCtx.current?.close();
        }

        // Clear duration interval
        if (durationInterval.current) {
          clearInterval(durationInterval.current);
          durationInterval.current = null;
        }

        // Resolve the promise if stop was called
        if (stopResolverRef.current) {
          stopResolverRef.current(blob);
          stopResolverRef.current = null;
        }
      };

      mediaRecorder.current.start(100);
      setIsRecording(true);

      // Update duration every second
      durationInterval.current = window.setInterval(() => {
        setDuration(Math.floor((Date.now() - startTime.current) / 1000));
      }, 1000);

      // Start visualization
      visualize();
    } catch (error) {
      console.error("Error starting recording:", error);
      isRecordingRef.current = false;
      throw error;
    }
  };

  const stop = (): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      if (
        !mediaRecorder.current ||
        mediaRecorder.current.state === "inactive"
      ) {
        reject(new Error("No active recording"));
        return;
      }

      // Store the resolver to be called in onstop
      stopResolverRef.current = resolve;

      // Update state and refs
      isRecordingRef.current = false;
      setIsRecording(false);

      // Cancel animation frame
      if (animationId.current) {
        cancelAnimationFrame(animationId.current);
        animationId.current = null;
      }

      // Stop the recorder - this will trigger onstop
      mediaRecorder.current.stop();
    });
  };

  const clear = () => {
    // Stop recording if active
    if (isRecordingRef.current) {
      isRecordingRef.current = false;

      if (animationId.current) {
        cancelAnimationFrame(animationId.current);
        animationId.current = null;
      }

      if (durationInterval.current) {
        clearInterval(durationInterval.current);
        durationInterval.current = null;
      }

      if (mediaRecorder.current && mediaRecorder.current.state !== "inactive") {
        mediaRecorder.current.stop();
      }
    }

    // Stop media tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    // Clear all state
    setIsRecording(false);
    setBars([]);
    setAudioBlob(null);
    setDuration(0);

    // Clear refs
    chunks.current = [];
    mediaRecorder.current = null;
    analyser.current = null;
    stopResolverRef.current = null;

    // Close audio context
    if (audioCtx.current?.state !== "closed") {
      audioCtx.current?.close();
      audioCtx.current = null;
    }
  };

  // Helper function to generate waveform bars from audio blob
  const generateWaveformBars = async (
    blob: Blob,
    numberOfBars: number = 50
  ): Promise<number[]> => {
    return new Promise((resolve, reject) => {
      const fileReader = new FileReader();

      fileReader.onloadend = async () => {
        try {
          const arrayBuffer = fileReader.result as ArrayBuffer;
          const audioContext = new (window.AudioContext ||
            (window as any).webkitAudioContext)();

          // Decode audio data
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

          // Get raw PCM data from first channel
          const rawData = audioBuffer.getChannelData(0);
          const blockSize = Math.floor(rawData.length / numberOfBars);
          const bars: number[] = [];

          // Calculate average amplitude for each bar
          for (let i = 0; i < numberOfBars; i++) {
            const start = i * blockSize;
            const end = start + blockSize;
            let sum = 0;

            for (let j = start; j < end && j < rawData.length; j++) {
              sum += Math.abs(rawData[j]);
            }

            const average = sum / blockSize;
            bars.push(average);
          }

          // Normalize bars to 0-1 range
          const maxBar = Math.max(...bars);
          const normalizedBars = bars.map((bar) => bar / maxBar);

          audioContext.close();
          resolve(normalizedBars);
        } catch (error) {
          reject(error);
        }
      };

      fileReader.onerror = reject;
      fileReader.readAsArrayBuffer(blob);
    });
  };

  useEffect(() => {
    return () => {
      if (animationId.current) {
        cancelAnimationFrame(animationId.current);
      }
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioCtx.current?.state !== "closed") {
        audioCtx.current?.close();
      }
      if (mediaRecorder.current && mediaRecorder.current.state !== "inactive") {
        mediaRecorder.current.stop();
      }
    };
  }, []);

  return {
    isRecording,
    bars,
    start,
    stop,
    audioBlob,
    duration,
    clear,
    generateWaveformBars,
  };
};
