// mention-portal.tsx
import { createPortal } from "react-dom";
import { type ReactNode } from "react";

export function MentionPortal({ children }: { children: ReactNode }) {
  if (typeof document === "undefined") return null;
  return createPortal(children, document.body);
}
