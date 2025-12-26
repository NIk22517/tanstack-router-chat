import { X } from "lucide-react";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Input } from "../ui/input";

export const SearchPanel = () => {
  return (
    <div className="relative w-full h-full overflow-hidden">
      <div className="flex flex-row justify-between items-center border-b-1 border-gray-400 p-2">
        <Label>Find in chat</Label>
        <Button variant={"ghost"}>
          <X />
        </Button>
      </div>
      <div className="flex flex-col items-start gap-1 border-b-1 border-gray-200 p-2">
        <Input placeholder="Enter a search keyword..." />
        <Button variant={"secondary"} className="rounded-2xl">
          Has Attachment
        </Button>
      </div>
    </div>
  );
};
