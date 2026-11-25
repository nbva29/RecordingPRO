import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { authApi, AuthApiError } from "../api/authApi";
import { AuthForm } from "../components/auth/AuthForm";
import type { AuthFormValues } from "../components/auth/AuthForm";
import type { AuthRole } from "../types/authApi";
import { useAuthSession } from "../auth/authSession";
import { safeReturnTo } from "../auth/navigation";
import { PasswordRecoveryDialog } from "../components/auth/PasswordRecoveryDialog";
import type { RecoveryValues } from "../components/auth/authValidation";

export function LoginPage({ audience = "client" }: { audience?: AuthRole }) {
  return <LoginRequestForm key={audience} audience={audience} />;
}

function LoginRequestForm({ audience }: { audience: AuthRole }) {
  const { state } = useLocation();
  const navigate = useNavigate();
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const notice =
    state?.registrationComplete === true && typeof state.email === "string";
  const [successMessage, setSuccessMessage] = useState(
    notice
      ? "Аккаунт создан. Войдите с вашим email и паролем."
      : state?.sessionEnded === true
        ? "Сеанс завершён. Войдите снова."
        : "",
  );
  const pendingRequest = useRef<AbortController | null>(null);

  useEffect(() => () => pendingRequest.current?.abort(), []);

  async function handleSubmit(values: AuthFormValues) {
    const controller = new AbortController();
    pendingRequest.current = controller;
    setSuccessMessage("");
    try {
      const token = await authApi.login(values, controller.signal);
      const user = await authApi.getCurrentUser(
        token.access_token,
        controller.signal,
      );
      if (user.role.name !== audience) {
        throw new AuthApiError(
          audience === "admin"
            ? "Для входа администратора нужен аккаунт администратора."
            : "Это аккаунт администратора. Воспользуйтесь входом администратора.",
          403,
        );
      }
      if (!controller.signal.aborted) {
        useAuthSession.getState().startSession(token, user);
        navigate(safeReturnTo(user.role.name, state?.from), { replace: true });
      }
    } finally {
      if (pendingRequest.current === controller) pendingRequest.current = null;
    }
  }

  function confirmRecovery(values: RecoveryValues, signal?: AbortSignal) {
    return authApi.resetPassword(
      {
        email: values.email,
        code: values.code,
        new_password: values.newPassword,
      },
      signal,
    );
  }

  return (
    <>
      <AuthForm
        mode="login"
        audience={audience}
        initialEmail={notice ? state.email : undefined}
        onSubmit={handleSubmit}
        successMessage={successMessage}
        onValuesChange={() => setSuccessMessage("")}
        onForgotPassword={() => {
          setSuccessMessage("");
          setRecoveryOpen(true);
        }}
      />
      {recoveryOpen && (
        <PasswordRecoveryDialog
          onClose={() => setRecoveryOpen(false)}
          onRequestCode={authApi.requestPasswordReset}
          onConfirm={confirmRecovery}
        />
      )}
    </>
  );
}
