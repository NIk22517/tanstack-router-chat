import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useChatSummaryStream, useLocalStorage } from "@/hooks";
import { Copy } from "lucide-react";

interface ChatSummaryProps {
  open: boolean;
  chat_id: number;
  onClose: () => void;
}

export const ChatSummary = ({ open, chat_id, onClose }: ChatSummaryProps) => {
  const { getItem } = useLocalStorage("auth");
  const userDetail = getItem();

  const { summary, isStreaming, error } = useChatSummaryStream({
    chat_id,
    token: userDetail?.token,
    enabled: open,
  });

  if (!userDetail) return null;
  const renderContent = () => {
    if (error) {
      return <span className="text-red-500">{error}</span>;
    }
    if (summary) {
      return (
        <span>
          {summary}
          {isStreaming && <span className="animate-blink">|</span>}
        </span>
      );
    }
    return <span className="text-muted-foreground">Generating summary...</span>;
  };

  return (
    <Dialog open={open}>
      <DialogContent className="w-1xl">
        <DialogHeader>
          <DialogTitle>
            Chat Summary
            <DialogClose onClick={onClose} />
          </DialogTitle>
          <DialogDescription>
            This is a summary of the chat with ID: {chat_id}
          </DialogDescription>
        </DialogHeader>

        <div className="relative px-4 pt-2 pb-4 bg-muted rounded border font-mono text-sm whitespace-pre-wrap min-h-[150px] max-h-60 overflow-y-auto">
          {!isStreaming && summary && (
            <Button
              variant={"ghost"}
              size="icon"
              onClick={() => navigator.clipboard.writeText(summary)}
              className="absolute top-2 right-2 h-auto hover:bg-gray-300"
            >
              <Copy />
            </Button>
          )}
          {renderContent()}
        </div>

        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
