import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "@tanstack/react-form";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { logSchema } from "./login";
import { useMutation } from "@tanstack/react-query";
import { services } from "@/services";
import { useLocalStorage } from "@/hooks";

export const Route = createFileRoute("/signin")({
  component: SignInRoute,
});

const signinSchema = z
  .object({
    name: z.string().min(3).max(50),
  })
  .merge(logSchema);

export type SignSchema = z.infer<typeof signinSchema>;

export function SignInRoute() {
  const { setItem } = useLocalStorage("auth");
  const navigate = Route.useNavigate();
  const { mutate } = useMutation({
    mutationFn: async (value: SignSchema) => {
      const res = await services.authServices.signIn({ data: value });
      if (res.status === 200) {
        return res.data.data;
      }
      throw new Error(res?.data?.message);
    },
    onSettled: (data, error) => {
      if (error) {
        console.log(error);
      } else {
        setItem(data);
        navigate({
          to: "/",
          reloadDocument: true,
          replace: true,
        });
      }
    },
  });
  const form = useForm({
    defaultValues: {
      name: "",
      email: "",
      password: "",
    } as SignSchema,
    validators: {
      onChange: signinSchema,
    },
    onSubmit: (props) => {
      mutate(props.value);
    },
  });
  return (
    <div className="h-screen flex items-center justify-center">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        className="flex flex-col gap-4 w-full max-w-lg bg-white p-6 rounded-lg shadow-md"
      >
        <form.Field name="name">
          {({ state, handleChange }) => {
            return (
              <div className="flex flex-col gap-2">
                <Label htmlFor="name">Enter Name</Label>
                <Input
                  value={state.value}
                  type="text"
                  id="name"
                  placeholder="Enter Name"
                  maxLength={50}
                  aria-invalid={state.meta.errors.length > 0}
                  onChange={(e) => handleChange(e.target.value)}
                />
              </div>
            );
          }}
        </form.Field>
        <form.Field name="email">
          {({ state, handleChange }) => {
            return (
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">Enter Email</Label>
                <Input
                  type="email"
                  id="email"
                  placeholder="Enter Email"
                  value={state.value}
                  aria-invalid={state.meta.errors.length > 0}
                  onChange={(e) => handleChange(e.target.value)}
                />
              </div>
            );
          }}
        </form.Field>
        <form.Field name="password">
          {({ state, handleChange }) => {
            return (
              <div className="flex flex-col gap-2">
                <Label htmlFor="password">Enter Password</Label>
                <Input
                  placeholder="Enter Password"
                  type="password"
                  id="password"
                  value={state.value}
                  aria-invalid={state.meta.errors.length > 0}
                  onChange={(e) => handleChange(e.target.value)}
                />
              </div>
            );
          }}
        </form.Field>

        <form.Subscribe
          selector={(state) => [state.canSubmit, state.isValidating]}
        >
          {([canSubmit, isValidating]) => {
            return (
              <Button
                type="submit"
                disabled={!canSubmit || isValidating}
                onClick={form.handleSubmit}
                variant={"outline"}
              >
                Submit
              </Button>
            );
          }}
        </form.Subscribe>

        <Button
          variant={"link"}
          className="flex items-end justify-end"
          onClick={() => {
            navigate({
              to: "/login",
            });
          }}
        >
          Already have an account
        </Button>
      </form>
    </div>
  );
}
