import { describe, expect, it, vi } from "vitest";
import { mockNavigate, renderWithContext } from "./test-utils";
import { SignInRoute } from "@/routes/signin";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { services } from "@/services";

const setupSignInForm = async () => {
  renderWithContext(SignInRoute);
  const nameInput = await screen.findByLabelText(/enter name/i);
  const emailInput = await screen.findByLabelText(/enter email/i);
  const passwordInput = await screen.findByLabelText(/enter password/i);
  const submitButton = await screen.findByRole("button", { name: /submit/i });
  const alreadyAccountBtn = await screen.findByRole("button", {
    name: /Already have an account/i,
  });

  return {
    nameInput,
    emailInput,
    passwordInput,
    submitButton,
    alreadyAccountBtn,
  };
};

describe("Sign In Page", () => {
  it("Check input and button on the page", () => {
    waitFor(async () => {
      const {
        nameInput,
        emailInput,
        passwordInput,
        submitButton,
        alreadyAccountBtn,
      } = await setupSignInForm();

      expect(nameInput).toBeInTheDocument();
      expect(emailInput).toBeInTheDocument();
      expect(passwordInput).toBeInTheDocument();
      expect(submitButton).toBeInTheDocument();
      expect(alreadyAccountBtn).toBeInTheDocument();
    });
  });

  it("check name input error", () => {
    waitFor(async () => {
      const { nameInput, submitButton } = await setupSignInForm();
      fireEvent.change(nameInput, { target: { value: "h" } });
      await waitFor(() => {
        expect(screen.getByText(/small text/i)).toBeInTheDocument();
        expect(submitButton).toBeDisabled();
      });
    });
  });

  it("check email input error", () => {
    waitFor(async () => {
      const { emailInput, submitButton } = await setupSignInForm();

      fireEvent.change(emailInput, { target: { value: "test" } });
      await waitFor(() => {
        expect(screen.getByText(/invalid email address/i)).toBeInTheDocument();
        expect(submitButton).toBeDisabled();
      });
    });
  });

  it("check password input error", () => {
    waitFor(async () => {
      const { passwordInput, submitButton } = await setupSignInForm();

      fireEvent.change(passwordInput, { target: { value: "test" } });
      await waitFor(() => {
        expect(
          screen.getByText(/password must be at least 8 characters/i)
        ).toBeInTheDocument();
        expect(submitButton).toBeDisabled();
      });
    });
  });

  it("enable submit button", () => {
    waitFor(async () => {
      const { emailInput, passwordInput, nameInput, submitButton } =
        await setupSignInForm();

      fireEvent.change(nameInput, { target: { value: "test" } });
      fireEvent.change(emailInput, { target: { value: "test@test.com" } });
      fireEvent.change(passwordInput, { target: { value: "test@123" } });

      await waitFor(() => {
        expect(submitButton).toBeEnabled();
      });
    });
  });

  it("call api to sign in and success", () => {
    const mockSignIn = vi
      .fn()
      .mockResolvedValue({ token: "token-value", id: 3 });
    services.authServices.signIn = mockSignIn;

    waitFor(async () => {
      const { emailInput, passwordInput, submitButton, nameInput } =
        await setupSignInForm();

      fireEvent.change(nameInput, { target: { value: "test" } });
      fireEvent.change(emailInput, { target: { value: "test@example.com" } });
      fireEvent.change(passwordInput, { target: { value: "password123" } });

      await waitFor(() => {
        expect(submitButton).toBeEnabled();
      });

      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith(
          "test",
          "test@example.com",
          "password123"
        );
        expect(mockNavigate).toHaveBeenCalled();
      });
    });
  });
});
