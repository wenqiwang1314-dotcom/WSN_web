import { createContext } from "react";

export type AuthContextValue = {
  token: string | null;
  user: string | null;
  login: (token: string, user: string) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export default AuthContext;
