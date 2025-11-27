import { useRef, useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { PauseCircle, PlayCircle } from "lucide-react";

interface AudioPlayerProps {
  audioUrl: string;
  duration: number;
}

export const AudioPlayer = ({ audioUrl, duration }: AudioPlayerProps) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [bars, setBars] = useState<number[]>([]);

  // Generate dummy waveform bars based on duration
  useEffect(() => {
    const count = 30; // number of bars
    const newBars = Array.from(
      { length: count },
      () => Math.random() * 1 // values 0-1 for height
    );
    setBars(newBars);
  }, [audioUrl]);

  const progress = duration ? (currentTime / duration) * 100 : 0;

  const updateProgress = useCallback(() => {
    if (!audioRef.current) return;

    setCurrentTime(audioRef.current.currentTime);

    if (!audioRef.current.paused && !audioRef.current.ended) {
      requestAnimationFrame(updateProgress);
    }
  }, []);

  const togglePlay = async () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }

    try {
      await audioRef.current.play();
      setIsPlaying(true);
      requestAnimationFrame(updateProgress);
    } catch (err) {
      console.error("Error playing audio:", err);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !duration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;

    audioRef.current.currentTime = percent * duration;
    setCurrentTime(percent * duration);
  };

  return (
    <div className="flex items-center gap-3 w-full">
      <audio
        ref={audioRef}
        src={audioUrl}
        onEnded={handleEnded}
        preload="auto"
      />

      <Button size="icon" onClick={togglePlay}>
        {isPlaying ? <PauseCircle /> : <PlayCircle />}
      </Button>

      <span className="text-xs text-gray-500 w-10">
        {formatTime(currentTime)}
      </span>

      <div
        className="flex items-end gap-[2px] h-10 flex-1 cursor-pointer px-1"
        onClick={seek}
      >
        {bars.map((v, i) => {
          const barPercent = ((i + 1) / bars.length) * 100;
          const isPlayed = barPercent <= progress;

          return (
            <div
              key={i}
              className="w-[3px] rounded-sm transition-colors"
              style={{
                height: `${5 + v * 20}px`,
                backgroundColor: isPlayed ? "#2563eb" : "#d1d5db",
              }}
            />
          );
        })}
      </div>

      <span className="text-xs text-gray-500 w-10">{formatTime(duration)}</span>
    </div>
  );
};

function formatTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}
