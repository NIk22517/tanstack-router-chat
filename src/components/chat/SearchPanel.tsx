import { X } from "lucide-react";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { useMemo, useState } from "react";
import { useDebounce } from "@/hooks";
import { useSearchMessages } from "./apiCalls";
import { Route } from "@/routes/_auth/_chat/$chat_id.index";
import { useNavigate } from "@tanstack/react-router";

export const SearchPanel = () => {
  const { userDetail } = Route.useRouteContext();
  const { chat_id } = Route.useParams();
  const navigate = useNavigate({ from: Route.fullPath });
  const [search, setSearch] = useState("");
  const debounceSearch = useDebounce(search, 500);

  const { data, isLoading, fetchNextPage, hasNextPage } = useSearchMessages({
    chat_id,
    search_text: debounceSearch,
    token: userDetail?.token,
  });

  const searchData = useMemo(() => {
    if (!data || data.pages.length === 0) return [];
    return data.pages.flatMap((el) => el.data);
  }, [data]);

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden">
      <div className="flex justify-between items-center border-b border-gray-400 p-2">
        <Label>Find in chat</Label>
        <Button
          variant="ghost"
          onClick={() => {
            navigate({});
            setSearch("");
          }}
        >
          <X />
        </Button>
      </div>

      <div className="flex flex-col gap-1 border-b border-gray-200 p-2">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Enter a search keyword..."
        />
        <Button variant="secondary" className="rounded-2xl">
          Has Attachment
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-2 flex flex-col gap-2">
        {isLoading && <Label>Loading...</Label>}

        {!isLoading && searchData.length === 0 && search && (
          <Label>No messages found</Label>
        )}

        {searchData.map((el) => (
          <div
            key={el.id}
            className="p-2 border rounded break-words whitespace-pre-wrap cursor-pointer"
            onClick={() => {
              navigate({
                search: (prev) => {
                  return {
                    ...prev,
                    message_search_id: el.id,
                  };
                },
              });
            }}
          >
            <Label className="text-sm">
              <span
                dangerouslySetInnerHTML={{ __html: el.highlighted_message }}
                className="inline rounded px-[2px] leading-normal"
              />
            </Label>
          </div>
        ))}
        {hasNextPage && (
          <Button onClick={() => fetchNextPage()}>Load More</Button>
        )}
      </div>
    </div>
  );
};
