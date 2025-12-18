// mention-root.tsx
import { type ReactNode } from "react";
import MentionProvider from "./context";

export function MentionRoot({ children }: { children: ReactNode }) {
  return (
    <MentionProvider>
      <div className="relative w-full">{children}</div>
    </MentionProvider>
  );
}
