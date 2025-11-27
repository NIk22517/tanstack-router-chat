import { useAudioRecorder } from "@/hooks";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square } from "lucide-react";
import { ActionTooltip } from "../action-tooltip";
import { InputWaveformPlayer } from "./InputWaveformPlayer";

export const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

interface RecordingType {
  onAudioReady: (blob: File | null) => void;
  recordedAudio: File | null;
  disabled: boolean;
}

export const RecordPreview = ({
  onAudioReady,
  recordedAudio,
  disabled,
}: Omit<RecordingType, "from">) => {
  const {
    start,
    stop,
    bars,
    isRecording,
    duration,
    clear,
    generateWaveformBars,
  } = useAudioRecorder();

  const [waveformBars, setWaveformBars] = useState<number[]>([]);

  const handleStop = async () => {
    try {
      const blob = await stop();
      const newBars = await generateWaveformBars(blob);

      const audioFile = new File([blob], `voice-message-${Date.now()}.webm`, {
        type: "audio/wav",
        lastModified: Date.now(),
      });

      onAudioReady(audioFile);
      setWaveformBars(newBars);
    } catch (error) {
      console.error("Error stopping recording:", error);
    }
  };

  const handleDelete = () => {
    setWaveformBars([]);
    onAudioReady(null);
    clear();
  };

  return (
    <div className="flex flex-row items-center space-x-2">
      {isRecording && (
        <>
          {/* Timer + Waveform */}
          <div className="flex flex-row items-center space-x-2 flex-1 overflow-hidden">
            {/* Duration */}
            <span className="text-sm font-medium">
              {formatDuration(duration)}
            </span>

            {/* Live waveform */}
            <div className="flex flex-row items-end space-x-1 h-6 flex-1 overflow-hidden px-1">
              {bars.map((value, i) => (
                <div
                  key={i}
                  className="w-[3px] bg-gray-400 rounded-sm transition-all duration-100"
                  style={{
                    height: `${4 + value * 15}px`,
                  }}
                />
              ))}
            </div>

            {/* Recording Red Dot */}
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
          </div>

          <ActionTooltip content="Stop">
            <Button
              size="icon"
              variant="ghost"
              onClick={handleStop}
              className="text-primary"
            >
              <Square className="h-5 w-5" />
            </Button>
          </ActionTooltip>
        </>
      )}

      {/* Waveform Player After Stop */}
      {!isRecording && recordedAudio && waveformBars.length > 0 && (
        <InputWaveformPlayer
          audioFile={recordedAudio}
          bars={waveformBars}
          onDelete={handleDelete}
          recordedDuration={duration}
        />
      )}

      {/* Start Recording */}

      {!isRecording && (
        <ActionTooltip content="Record">
          <Button size="icon" disabled={disabled} onClick={start}>
            <Mic className="h-5 w-5" />
          </Button>
        </ActionTooltip>
      )}
    </div>
  );
};
