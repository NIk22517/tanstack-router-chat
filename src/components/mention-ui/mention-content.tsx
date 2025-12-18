// mention-content.tsx
import { Children, cloneElement, isValidElement } from "react";
import type { ReactElement } from "react";
import type { MentionItemInjectedProps } from "./mention-item";
import { useMentionContext } from "./context";

type MentionContentProps<T> = {
  items: T[];
  value: (item: T) => { id: string; label: string };
  children: ReactElement;
};

export function MentionContent<T>({
  items,
  value,
  children,
}: MentionContentProps<T>) {
  const { state } = useMentionContext();

  if (!state.open) return null;

  const child = Children.only(children);

  if (!isValidElement(child)) return null;

  // 🔑 TELL TS WHAT PROPS THIS CHILD ACCEPTS
  const typedChild = child as ReactElement<
    Partial<MentionItemInjectedProps<T>>
  >;

  return (
    <div className="absolute z-50 mt-1 w-64 rounded-md border bg-white shadow">
      {items.map((item, index) =>
        cloneElement(typedChild, {
          key: value(item).id,
          data: item,
          index,
          value,
        })
      )}
    </div>
  );
}
