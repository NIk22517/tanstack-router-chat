import {
  createContext,
  useContext,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";

export type MentionToken =
  | { type: "text"; value: string }
  | { type: "mention"; id: string; label: string };

export type MentionState = {
  tokens: MentionToken[];
  open: boolean;
  query: string;
  highlighted: number;
  trigger: "@" | "#" | null;
};

const initialState: MentionState = {
  tokens: [{ type: "text", value: "" }],
  open: false,
  query: "",
  highlighted: 0,
  trigger: null,
};

export type MentionAction =
  | { type: "SET_TOKENS"; payload: MentionToken[] }
  | { type: "INSERT_MENTION"; payload: { id: string; label: string } }
  | { type: "SET_OPEN"; payload: boolean }
  | { type: "SET_QUERY"; payload: string }
  | { type: "SET_HIGHLIGHTED"; payload: number }
  | { type: "RESET_MENTION" };

const MentionContext = createContext<{
  state: MentionState;
  dispatch: React.Dispatch<MentionAction>;
} | null>(null);

const mentionReducer = (
  state: MentionState,
  action: MentionAction
): MentionState => {
  switch (action.type) {
    case "SET_TOKENS":
      return { ...state, tokens: action.payload };

    case "INSERT_MENTION":
      return {
        ...state,
        tokens: [
          ...state.tokens,
          { type: "mention", ...action.payload },
          { type: "text", value: " " },
        ],
        open: false,
        query: "",
        trigger: null,
      };

    case "SET_OPEN":
      return { ...state, open: action.payload };

    case "SET_QUERY":
      return { ...state, query: action.payload };

    case "SET_HIGHLIGHTED":
      return { ...state, highlighted: action.payload };

    case "RESET_MENTION":
      return {
        ...state,
        open: false,
        query: "",
        highlighted: 0,
        trigger: null,
      };

    default:
      return state;
  }
};

const MentionProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(mentionReducer, initialState);
  const value = useMemo(() => ({ state, dispatch }), [state, dispatch]);
  return (
    <MentionContext.Provider value={value}>{children}</MentionContext.Provider>
  );
};

export const useMentionContext = () => {
  const ctx = useContext(MentionContext);
  if (!ctx) {
    throw new Error("useMentionContext must be used inside MentionProvider");
  }
  return ctx;
};

export default MentionProvider;
