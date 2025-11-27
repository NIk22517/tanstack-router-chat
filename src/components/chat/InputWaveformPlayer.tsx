import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PlayCircle, PauseCircle, Trash2 } from "lucide-react";

interface InputWaveformPlayerProps {
  audioFile: File;
  bars: number[];
  onDelete: () => void;
  recordedDuration: number;
}

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

export const InputWaveformPlayer = ({
  audioFile,
  bars,
  onDelete,
  recordedDuration,
}: InputWaveformPlayerProps) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const animationRef = useRef<number | null>(null);
  const duration = recordedDuration;

  useEffect(() => {
    const url = URL.createObjectURL(audioFile);
    setAudioUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [audioFile]);

  const updateProgress = useCallback(() => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      if (!audioRef.current.paused && !audioRef.current.ended) {
        animationRef.current = requestAnimationFrame(updateProgress);
      }
    }
  }, []);

  const togglePlayPause = async () => {
    if (!audioRef.current || !audioUrl) return;

    if (isPlaying) {
      audioRef.current.pause();
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      setIsPlaying(false);
    } else {
      try {
        await audioRef.current.play();
        animationRef.current = requestAnimationFrame(updateProgress);
        setIsPlaying(true);
      } catch (error) {
        console.error("Error playing audio:", error);
      }
    }
  };

  const handleWaveformClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !duration || duration === Infinity) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * duration;

    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
  };

  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  const progressPercentage =
    duration > 0 && duration !== Infinity ? (currentTime / duration) * 100 : 0;

  if (!audioUrl) return null;

  return (
    <div className="flex items-center space-x-2 w-full">
      <audio
        ref={audioRef}
        src={audioUrl}
        onEnded={handleEnded}
        preload="auto"
      />

      {/* Delete Button */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              onClick={onDelete}
              className="text-red-500 hover:text-red-600"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Delete</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Play / Pause */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              onClick={togglePlayPause}
              className="text-primary"
            >
              {isPlaying ? (
                <PauseCircle className="h-5 w-5" />
              ) : (
                <PlayCircle className="h-5 w-5" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{isPlaying ? "Pause" : "Play"}</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Current Time */}
      <span className="text-[11px] text-muted-foreground w-8 text-right">
        {formatTime(currentTime)}
      </span>

      {/* Waveform */}
      <div className="flex flex-col flex-1">
        <div
          className="flex flex-row items-end h-[24px] cursor-pointer px-1 space-x-[2px] hover:opacity-80 transition"
          onClick={handleWaveformClick}
        >
          {bars.map((value, i) => {
            const barPct = ((i + 1) / bars.length) * 100;
            const isPlayed = barPct <= progressPercentage;

            return (
              <div
                key={i}
                className={`w-[3px] rounded-sm transition-colors duration-100`}
                style={{
                  height: `${4 + value * 15}px`,
                  backgroundColor: isPlayed ? "rgb(59 130 246)" : "#d0d0d0",
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Total Duration */}
      <span className="text-[11px] text-muted-foreground w-8">
        {duration > 0 && duration !== Infinity ? formatTime(duration) : "0:00"}
      </span>
    </div>
  );
};
