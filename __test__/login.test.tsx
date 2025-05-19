import { beforeEach, describe, expect, vi, it } from "vitest";
import { renderWithContext } from "./test-utils";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { RouteLogIn } from "@/routes/login";
import { services } from "@/services";

const setupLoginForm = async () => {
  renderWithContext(RouteLogIn);
  const emailInput = await screen.findByLabelText(/enter email/i);
  const passwordInput = await screen.findByLabelText(/enter password/i);
  const submitButton = await screen.findByRole("button", { name: /submit/i });
  return { emailInput, passwordInput, submitButton };
};

const mockNavigate = vi.fn();

vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-router")>(
    "@tanstack/react-router"
  );
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("Log In Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders email and password fields and buttons", () => {
    waitFor(async () => {
      const { emailInput, passwordInput, submitButton } =
        await setupLoginForm();
      expect(emailInput).toBeInTheDocument();
      expect(passwordInput).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
      expect(
        screen.getByRole("button", { name: /create a new account/i })
      ).toBeInTheDocument();
    });
  });

  it("shows validation errors on invalid input", () => {
    renderWithContext(RouteLogIn);
    waitFor(async () => {
      const { emailInput } = await setupLoginForm();
      fireEvent.change(emailInput, { target: { value: "not-an-email" } });
      fireEvent.blur(emailInput);

      await waitFor(() => {
        expect(screen.getByText(/invalid email address/i)).toBeInTheDocument();
      });
    });

    waitFor(async () => {
      const { passwordInput } = await setupLoginForm();
      fireEvent.change(passwordInput, { target: { value: "short" } });
      fireEvent.blur(passwordInput);

      await waitFor(() => {
        expect(
          screen.getByText(/password must be at least 8 characters/i)
        ).toBeInTheDocument();
      });
    });
  });

  it("enables submit button when form is valid", () => {
    waitFor(async () => {
      const { passwordInput, emailInput, submitButton } =
        await setupLoginForm();
      fireEvent.change(emailInput, { target: { value: "test@example.com" } });
      fireEvent.change(passwordInput, { target: { value: "password123" } });

      await waitFor(() => {
        expect(submitButton).toBeEnabled();
      });
    });
  });

  it("calls login mutation and navigates on success", async () => {
    const mockLogin = vi.fn().mockResolvedValue({ token: "fake-token", id: 1 });
    services.authServices.logIn = mockLogin;

    waitFor(async () => {
      const { emailInput, passwordInput, submitButton } =
        await setupLoginForm();
      fireEvent.change(emailInput, { target: { value: "test@example.com" } });
      fireEvent.change(passwordInput, { target: { value: "password123" } });

      await waitFor(() => {
        expect(submitButton).toBeEnabled();
      });

      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith(
          "test@example.com",
          "password123"
        );
        expect(mockNavigate).toHaveBeenCalled();
      });
    });
  });
});
