import axios from "axios";
import type { AxiosResponse } from "axios";
import type {
  AuthCredentials,
  AuthProfileInput,
  AuthTokenDto,
  AuthUserDto,
  PasswordResetInput,
} from "../types/authApi";
import { invalidateSession } from "../auth/authSession";

// A separate instance keeps authentication errors and Bearer headers out of catalog requests.
const client = axios.create({ baseURL: "/api/auth", timeout: 15000 });

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isToken(value: unknown): value is AuthTokenDto {
  return (
    isRecord(value) &&
    typeof value.access_token === "string" &&
    value.access_token.trim().length > 0 &&
    value.token_type === "bearer" &&
    typeof value.expires_in === "number" &&
    Number.isInteger(value.expires_in) &&
    value.expires_in > 0
  );
}

function isUser(value: unknown): value is AuthUserDto {
  return (
    isRecord(value) &&
    isRecord(value.role) &&
    typeof value.id === "string" &&
    /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(value.id) &&
    typeof value.email === "string" &&
    value.email.trim().length > 0 &&
    (value.name === null || typeof value.name === "string") &&
    (value.phone === null || typeof value.phone === "string") &&
    typeof value.role.id === "number" &&
    Number.isInteger(value.role.id) &&
    value.role.id > 0 &&
    (value.role.name === "client" || value.role.name === "admin")
  );
}

type Operation =
  | "register"
  | "login"
  | "user"
  | "profile"
  | "change-password"
  | "recovery-request"
  | "recovery-confirm";

export class AuthApiError extends Error {
  readonly status?: number;
  readonly retryAfterSeconds?: number;

  constructor(message: string, status?: number, retryAfterSeconds?: number) {
    super(message);
    this.name = "AuthApiError";
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

function validationMessage(data: unknown, operation: Operation): string {
  const labels: Record<string, string> = {
    email: "Email",
    password: "Пароль",
    name: "Имя",
    phone: "Телефон",
    code: "Код",
    new_password: "Новый пароль",
  };
  if (
    typeof data === "object" &&
    data !== null &&
    "detail" in data &&
    Array.isArray(data.detail)
  ) {
    const fields = data.detail.flatMap((detail: unknown) => {
      if (
        typeof detail !== "object" ||
        detail === null ||
        !("loc" in detail) ||
        !Array.isArray(detail.loc)
      )
        return [];
      const field: unknown = detail.loc[detail.loc.length - 1];
      return typeof field === "string" && Object.hasOwn(labels, field)
        ? [labels[field]]
        : [];
    });
    if (fields.length)
      return `Проверьте поля: ${[...new Set(fields)].join(", ")}.`;
  }
  if (operation === "profile") return "Проверьте имя и телефон.";
  if (operation === "recovery-request") return "Проверьте email.";
  if (operation === "recovery-confirm")
    return "Проверьте email, код и новый пароль.";
  return "Проверьте email и пароль.";
}

function toAuthError(error: unknown, operation: Operation): unknown {
  if (axios.isCancel(error) || error instanceof AuthApiError) return error;
  if (!axios.isAxiosError(error))
    return new AuthApiError("Не удалось выполнить запрос. Повторите попытку.");

  const status = error.response?.status;
  if (status === 400 && operation === "change-password")
    return new AuthApiError("Неверный текущий пароль.", status);
  if (status === 400 && operation === "recovery-confirm")
    return new AuthApiError(
      "Неверный или просроченный код. Проверьте код или запросите новый.",
      status,
    );
  if (status === 401)
    return new AuthApiError(
      operation === "login"
        ? "Неверный email или пароль."
        : "Не удалось подтвердить вход. Попробуйте ещё раз.",
      status,
    );
  if (status === 403)
    return new AuthApiError(
      "Недостаточно прав для выполнения действия.",
      status,
    );
  if (status === 409 && operation === "register")
    return new AuthApiError(
      "Пользователь с таким email уже зарегистрирован.",
      status,
    );
  if (status === 422)
    return new AuthApiError(
      validationMessage(error.response?.data, operation),
      status,
    );
  if (status === 429) {
    const header = error.response?.headers["retry-after"];
    const seconds = Number(header);
    const retryAfter =
      Number.isFinite(seconds) && seconds > 0 ? Math.ceil(seconds) : 60;
    return new AuthApiError(
      operation === "recovery-request"
        ? "Повторный запрос кода пока недоступен. Попробуйте позже."
        : "Слишком много попыток. Попробуйте позже.",
      status,
      retryAfter,
    );
  }
  if (status && status >= 500)
    return new AuthApiError(
      "Сервис временно недоступен. Попробуйте позже.",
      status,
    );
  if (status)
    return new AuthApiError(
      "Не удалось выполнить запрос. Повторите попытку.",
      status,
    );
  if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT")
    return new AuthApiError("Сервер не ответил вовремя. Повторите попытку.");
  return new AuthApiError(
    "Не удалось связаться с сервером. Проверьте соединение и повторите попытку.",
  );
}

async function request<T>(
  operation: Operation,
  send: () => Promise<AxiosResponse<unknown>>,
  isValid: (value: unknown) => value is T,
  token?: string,
): Promise<T> {
  try {
    const response = await send();
    if (!isValid(response.data))
      throw new AuthApiError(
        "Сервер вернул некорректный ответ. Повторите попытку.",
      );
    return response.data;
  } catch (error) {
    if (token && axios.isAxiosError(error) && error.response?.status === 401)
      invalidateSession(token);
    throw toAuthError(error, operation);
  }
}

function credentialsBody(values: AuthCredentials): AuthCredentials {
  return {
    email: values.email.trim().toLowerCase(),
    password: values.password,
  };
}

export const authApi = {
  register(
    values: AuthCredentials,
    signal?: AbortSignal,
  ): Promise<AuthUserDto> {
    return request(
      "register",
      () => client.post("/register", credentialsBody(values), { signal }),
      isUser,
    );
  },

  login(values: AuthCredentials, signal?: AbortSignal): Promise<AuthTokenDto> {
    return request(
      "login",
      () => client.post("/login", credentialsBody(values), { signal }),
      isToken,
    );
  },

  getCurrentUser(token: string, signal?: AbortSignal): Promise<AuthUserDto> {
    return request(
      "user",
      () =>
        client.get("/me", {
          headers: { Authorization: `Bearer ${token}` },
          signal,
        }),
      isUser,
      token,
    );
  },

  updateProfile(
    token: string,
    values: AuthProfileInput,
    signal?: AbortSignal,
  ): Promise<AuthUserDto> {
    const body = {
      name: values.name.trim() || null,
      phone: values.phone.trim() || null,
    };
    return request(
      "profile",
      () =>
        client.patch("/me", body, {
          headers: { Authorization: `Bearer ${token}` },
          signal,
        }),
      isUser,
      token,
    );
  },

  async changePassword(
    token: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    try {
      const response = await client.post(
        "/change-password",
        { current_password: currentPassword, new_password: newPassword },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (response.status !== 204)
        throw new AuthApiError(
          "Сервер вернул некорректный ответ. Повторите попытку.",
        );
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401)
        invalidateSession(token);
      throw toAuthError(error, "change-password");
    }
  },

  async requestPasswordReset(
    email: string,
    signal?: AbortSignal,
  ): Promise<void> {
    await request(
      "recovery-request",
      () =>
        client.post(
          "/forgot-password",
          { email: email.trim().toLowerCase() },
          { signal },
        ),
      (data): data is { detail: string } =>
        isRecord(data) &&
        typeof data.detail === "string" &&
        data.detail.trim().length > 0,
    );
  },

  async resetPassword(
    values: PasswordResetInput,
    signal?: AbortSignal,
  ): Promise<void> {
    try {
      const response = await client.post(
        "/reset-password",
        {
          email: values.email.trim().toLowerCase(),
          code: values.code,
          new_password: values.new_password,
        },
        { signal },
      );
      if (response.status !== 204)
        throw new AuthApiError(
          "Сервер вернул некорректный ответ. Повторите попытку.",
        );
    } catch (error) {
      throw toAuthError(error, "recovery-confirm");
    }
  },
};
