// mention-input.tsx
import { forwardRef } from "react";
import { useMentionContext } from "./context";

type MentionInputProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const MentionInput = forwardRef<HTMLTextAreaElement, MentionInputProps>(
  ({ className, ...props }, ref) => {
    const { state, dispatch } = useMentionContext();

    const value = state.tokens
      .map((t) => (t.type === "text" ? t.value : `@${t.label}`))
      .join("");

    const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const v = e.target.value;
      const cursor = e.target.selectionStart;

      dispatch({
        type: "SET_TOKENS",
        payload: [{ type: "text", value: v }],
      });

      const before = v.slice(0, cursor);
      const at = before.lastIndexOf("@");

      if (at !== -1) {
        const query = before.slice(at + 1);
        if (!query.includes(" ") && !query.includes("\n")) {
          dispatch({ type: "SET_QUERY", payload: query });
          dispatch({ type: "SET_OPEN", payload: true });
          return;
        }
      }

      dispatch({ type: "RESET_MENTION" });
    };

    return (
      <textarea
        ref={ref}
        value={value}
        onChange={onChange}
        className={className}
        {...props}
      />
    );
  }
);

MentionInput.displayName = "MentionInput";
