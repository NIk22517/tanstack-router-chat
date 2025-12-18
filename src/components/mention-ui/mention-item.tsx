import { useMentionContext } from "./context";

// mention-item.tsx
export type MentionItemInjectedProps<T> = {
  index: number;
  data: T;
  value: (item: T) => { id: string; label: string };
};

type MentionItemProps<T> = Partial<MentionItemInjectedProps<T>> & {
  children: (item: T, active: boolean) => React.ReactNode;
};

export function MentionItem<T>(props: MentionItemProps<T>) {
  const { state, dispatch } = useMentionContext();

  const { data, index, value, children } = props;

  if (!data || index == null || !value) return null;

  const active = state.highlighted === index;

  const onSelect = () => {
    const { id, label } = value(data);
    dispatch({ type: "INSERT_MENTION", payload: { id, label } });
  };

  return (
    <div
      onMouseDown={(e) => e.preventDefault()}
      onClick={onSelect}
      className={`px-2 py-1 cursor-pointer ${
        active ? "bg-blue-100" : "hover:bg-slate-100"
      }`}
    >
      {children(data, active)}
    </div>
  );
}
