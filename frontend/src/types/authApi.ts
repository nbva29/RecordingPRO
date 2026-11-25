export type AuthRole = "client" | "admin";

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface AuthTokenDto {
  access_token: string;
  token_type: "bearer";
  expires_in: number;
}

export interface AuthUserDto {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  organization_id: number | null;
  role: { id: number; name: AuthRole };
}

export interface AuthProfileInput {
  name: string;
  phone: string;
}

export interface PasswordResetInput {
  email: string;
  code: string;
  new_password: string;
}
