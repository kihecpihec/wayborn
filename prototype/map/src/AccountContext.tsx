import React, { createContext, useContext } from "react";

const AccountContext = createContext<string | null>(null);

export function AccountProvider({ userId, children }: { userId: string; children: React.ReactNode }) {
  return <AccountContext.Provider value={userId}>{children}</AccountContext.Provider>;
}

/** The authenticated user's ID. Storage is partitioned by this and never by anything typed or submitted. */
export function useAccountId() {
  const userId = useContext(AccountContext);
  if (!userId) throw new Error("A signed-in account is required");
  return userId;
}
