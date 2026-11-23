import type { ReactNode } from "react";
import { Context, useClientState } from "./useClient";
export function ClientProvider({ children }: { children: ReactNode }) {
  const state = useClientState();
  return <Context.Provider value={state}>{children}</Context.Provider>;
}
