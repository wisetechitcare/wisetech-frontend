import type { ReactNode } from "react"

import { ORGANIZATION_STORE_CONTEXT, useOrganizationStoreState } from "@/ds/prototypes/hooks/organization"
import type { OrganizationData } from "@/ds/prototypes/types/organization/organization"

interface OrganizationStoreProviderProps {
  initial?: Partial<OrganizationData>
  children: ReactNode
}

export function OrganizationStoreProvider({ initial, children }: OrganizationStoreProviderProps) {
  const store = useOrganizationStoreState(initial)
  return <ORGANIZATION_STORE_CONTEXT.Provider value={store}>{children}</ORGANIZATION_STORE_CONTEXT.Provider>
}
