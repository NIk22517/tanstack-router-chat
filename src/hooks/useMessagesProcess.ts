import { useMemo } from "react";
import moment from "moment";

type MessageProcessorParams<
  T extends { created_at: string | Date },
  K extends string,
> = {
  data: T[];
  groupTemplate: Record<K, T[]>;
  getMessageType: (message: T) => K | null;
};

type FlatMessage<T, K extends string> =
  | { date: string }
  | (K extends any ? { [P in K]: T } : never);

export function useMessageProcessor<
  T extends { created_at: string | Date },
  K extends string,
>({ data, groupTemplate, getMessageType }: MessageProcessorParams<T, K>) {
  const groupedMessages = useMemo(() => {
    const grouped: Record<string, Record<K, T[]>> = {};

    data.forEach((message) => {
      const date = moment(message.created_at).format("MMM DD, YYYY");

      if (!grouped[date]) {
        grouped[date] = Object.fromEntries(
          Object.keys(groupTemplate).map((key) => [key, [] as T[]])
        ) as Record<K, T[]>;
      }

      const messageType = getMessageType(message);
      if (messageType) {
        grouped[date][messageType].push(message);
      }
    });

    return Object.keys(grouped).map((date) => {
      const dynamicGroup = Object.fromEntries(
        Object.keys(groupTemplate).map((key) => [key, grouped[date][key as K]])
      ) as Record<K, T[]>;

      return {
        date,
        ...dynamicGroup,
      };
    });
  }, [data, groupTemplate, getMessageType]);

  const flatMessages = useMemo(() => {
    if (!groupedMessages || groupedMessages.length === 0) return [];

    const sortedGroupedData = groupedMessages
      .slice()
      .sort(
        (a, b) =>
          moment(a.date, "MMM DD, YYYY").valueOf() -
          moment(b.date, "MMM DD, YYYY").valueOf()
      );

    const sortMessage = (a: FlatMessage<T, K>, b: FlatMessage<T, K>) => {
      const itemA = Object.values(a)[0] as T;
      const itemB = Object.values(b)[0] as T;

      const dateA = moment(itemA.created_at);
      const dateB = moment(itemB.created_at);

      if (dateA.isValid() && dateB.isValid()) return dateA.diff(dateB);
      if (!dateA.isValid() && dateB.isValid()) return 1;
      if (dateA.isValid() && !dateB.isValid()) return -1;
      return 0;
    };

    return sortedGroupedData
      .flatMap((group) => {
        const groupDate = moment(group.date, "MMM DD, YYYY");
        let displayDate: string;

        if (groupDate.isSame(moment(), "day")) {
          displayDate = "Today";
        } else if (groupDate.isSame(moment().subtract(1, "day"), "day")) {
          displayDate = "Yesterday";
        } else {
          displayDate = group.date;
        }

        const groupItems = Object.entries(group)
          .filter(([key]) => key !== "date")
          .flatMap(([key, value]) =>
            Array.isArray(value)
              ? value.map((item) => ({ [key]: item }) as FlatMessage<T, K>)
              : []
          )
          .sort(sortMessage);

        const result: FlatMessage<T, K>[] = [
          { date: displayDate },
          ...groupItems,
        ];
        return result;
      })
      .reverse();
  }, [groupedMessages]);

  return { groupedMessages, flatMessages };
}
