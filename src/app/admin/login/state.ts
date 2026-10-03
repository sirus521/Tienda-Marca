export type LoginState = {
  status: "idle" | "error";
  message?: string;
  fieldErrors?: Record<string, string>;
};

export const initialLoginState: LoginState = { status: "idle" };
