import { Button } from "@/components/ui/button";
import { useLocalStorage } from "@/hooks";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/user/$user_id")({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = Route.useNavigate();
  const { removeItem } = useLocalStorage("auth");
  return (
    <div>
      <Button
        onClick={() => {
          removeItem();
          navigate({
            to: "/login",
          });
        }}
      >
        Log Out
      </Button>
    </div>
  );
}
