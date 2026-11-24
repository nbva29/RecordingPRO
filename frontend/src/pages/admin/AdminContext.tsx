import type { ReactNode } from "react";
import { AdminContext, useAdminState } from "./useAdmin";

export function AdminProvider({ children }: { children: ReactNode }) {
  const state = useAdminState();
  return (
    <AdminContext.Provider value={state}>{children}</AdminContext.Provider>
  );
}
