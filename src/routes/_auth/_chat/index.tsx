import { Label } from "@/components/ui/label";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/_chat/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="w-full h-full hidden sm:flex items-center justify-center">
      <Label className="text-2xl">Select User</Label>
    </div>
  );
}
