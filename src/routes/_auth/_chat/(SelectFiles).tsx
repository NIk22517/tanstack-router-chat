import { ActionTooltip } from "@/components/action-tooltip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Paperclip } from "lucide-react";
import { useRef } from "react";

export const SelectFiles = ({
  selectFiles,
}: {
  selectFiles: (files: File[]) => void;
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
      ? Array.from(event.target.files)
      : undefined;
    console.log(files, "files");
    if (!files || files.length === 0) return;
    selectFiles(files);
  };

  return (
    <>
      <ActionTooltip content={"Select Files"}>
        <Button type="button" onClick={handleClick}>
          <Paperclip className="w-4 h-4" />
        </Button>
      </ActionTooltip>
      <Input
        ref={inputRef}
        type="file"
        className="hidden"
        multiple
        onChange={handleChange}
      />
    </>
  );
};
