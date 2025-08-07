"use client";

import * as React from "react";
import moment from "moment";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface DateTimePicker24hProps {
  onSchedule?: (date: Date) => void;
  data?: Date;
}

export function DateTimePicker24h({
  onSchedule,
  data,
}: DateTimePicker24hProps) {
  const [date, setDate] = React.useState<Date | undefined>(data);
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      const existing = date || new Date();
      const newDate = new Date(selectedDate);
      newDate.setHours(existing.getHours());
      newDate.setMinutes(existing.getMinutes());
      setDate(newDate);
    }
  };

  const handleTimeChange = (type: "hour" | "minute", value: string) => {
    if (date) {
      const newDate = new Date(date);
      if (type === "hour") {
        newDate.setHours(parseInt(value));
      } else {
        newDate.setMinutes(parseInt(value));
      }
      setDate(newDate);
    }
  };

  const handleScheduleClick = () => {
    if (date && onSchedule) {
      onSchedule(date);
    }
  };

  return (
    <div className="space-y-4 ">
      <div className="sm:flex sm:space-x-4">
        <Calendar mode="single" selected={date} onSelect={handleDateSelect} />

        <div className="flex flex-col sm:flex-row sm:h-[300px] divide-y sm:divide-y-0 sm:divide-x">
          {/* Hours */}
          <ScrollArea className="w-64 sm:w-auto">
            <div className="flex sm:flex-col p-2">
              {hours.map((hour) => (
                <Button
                  key={hour}
                  size="icon"
                  variant={date?.getHours() === hour ? "default" : "ghost"}
                  className="sm:w-full shrink-0 aspect-square"
                  onClick={() => handleTimeChange("hour", hour.toString())}
                >
                  {hour.toString().padStart(2, "0")}
                </Button>
              ))}
            </div>
            <ScrollBar orientation="horizontal" className="sm:hidden" />
          </ScrollArea>

          {/* Minutes */}
          <ScrollArea className="w-64 sm:w-auto">
            <div className="flex sm:flex-col p-2">
              {Array.from({ length: 60 }, (_, i) => i).map((minute) => (
                <Button
                  key={minute}
                  size="icon"
                  variant={date?.getMinutes() === minute ? "default" : "ghost"}
                  className="sm:w-full shrink-0 aspect-square"
                  onClick={() => handleTimeChange("minute", minute.toString())}
                >
                  {minute.toString().padStart(2, "0")}
                </Button>
              ))}
            </div>
            <ScrollBar orientation="horizontal" className="sm:hidden" />
          </ScrollArea>
        </div>
      </div>

      <Button onClick={handleScheduleClick} disabled={!date} className="w-full">
        {date
          ? `Send on ${moment(date).format("MMMM Do, h:mm A")}`
          : "Pick a time"}
      </Button>
    </div>
  );
}
