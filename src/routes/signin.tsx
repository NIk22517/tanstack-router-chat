import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/signin")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="h-screen flex items-center justify-center">
      <div className="w-[20vw] flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">Enter Name</Label>
          <Input
            type="text"
            id="name"
            placeholder="Enter Name"
            maxLength={50}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Enter Email</Label>
          <Input type="email" id="email" placeholder="Enter Email" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="password">Enter Password</Label>
          <Input placeholder="Enter Password" type="password" id="password" />
        </div>

        <Button variant={"outline"}>Sign In</Button>
      </div>
    </div>
  );
}
