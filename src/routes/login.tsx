import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { services } from "@/services";
import { useLocalStorage } from "@/hooks";

export const Route = createFileRoute("/login")({
  beforeLoad: (ctx) => {
    if (ctx.context.userDetail?.token) {
      throw redirect({
        to: "/user/$user_id",
        params: { user_id: "3" },
      });
    }
  },
  component: RouteComponent,
});

export const logSchema = z.object({
  email: z.string().email({
    message: "Invalid email address",
  }),
  password: z
    .string()
    .min(8, {
      message: "Password must be at least 8 characters",
    })
    .max(16, {
      message: "Password must be at most 16 characters",
    }),
});

type LogSchema = z.infer<typeof logSchema>;

function RouteComponent() {
  const navigate = Route.useNavigate();
  const { setItem } = useLocalStorage("auth");
  const { mutate } = useMutation({
    mutationFn: async ({ value }: { value: LogSchema }) => {
      const res = await services.authServices.logIn({
        data: { ...value },
      });

      if (res.status === 200) {
        return res.data.data;
      }
      throw new Error(res?.data?.message);
    },
    onSettled: (data, error) => {
      if (error) {
        console.log("error", error);
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
      email: "",
      password: "",
    } as LogSchema,
    validators: {
      onChange: logSchema,
    },
    onSubmit: (props) => {
      mutate({
        value: props.value,
      });
    },
  });

  return (
    <div className="h-screen flex items-center justify-center p-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        className="flex flex-col gap-4 w-full max-w-lg bg-white p-6 rounded-lg shadow-md"
      >
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
                  onChange={(e) => handleChange(e.target.value)}
                  aria-invalid={state.meta.errors.length > 0}
                />
                {state.meta.errors.length > 0 && (
                  <Label className="text-red-500 text-sm font-light">
                    {typeof state.meta.errors[0] === "string"
                      ? state.meta.errors[0]
                      : ((state.meta.errors[0] as { message?: string })
                          ?.message ?? "Invalid input")}
                  </Label>
                )}
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
                  value={state.value}
                  placeholder="Enter Password"
                  type="password"
                  id="password"
                  aria-invalid={state.meta.errors.length > 0}
                  onChange={(e) => handleChange(e.target.value)}
                />
                {state.meta.errors.length > 0 && (
                  <Label className="text-red-500 text-sm font-light">
                    {typeof state.meta.errors[0] === "string"
                      ? state.meta.errors[0]
                      : (state.meta.errors[0]?.message ?? "Invalid input")}
                  </Label>
                )}
              </div>
            );
          }}
        </form.Field>

        <form.Subscribe
          selector={(state) => [state.canSubmit, state.isValidating]}
        >
          {([canSubmit, isValidating]) => (
            <Button
              type="submit"
              disabled={!canSubmit || isValidating}
              onClick={form.handleSubmit}
              variant={"outline"}
            >
              Submit
            </Button>
          )}
        </form.Subscribe>

        <Button
          variant={"link"}
          className="flex items-end justify-end cursor-pointer"
          onClick={() => {
            navigate({
              to: "/signin",
            });
          }}
        >
          Create a new account
        </Button>
      </form>
    </div>
  );
}
