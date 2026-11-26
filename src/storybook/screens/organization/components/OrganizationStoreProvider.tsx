import type { ReactNode } from "react"

import { ORGANIZATION_STORE_CONTEXT, useOrganizationStoreState } from "@/storybook/screens/organization/hooks"
import type { OrganizationData } from "@/storybook/screens/organization/types/organization"

interface OrganizationStoreProviderProps {
  initial?: Partial<OrganizationData>
  children: ReactNode
}

export function OrganizationStoreProvider({ initial, children }: OrganizationStoreProviderProps) {
  const store = useOrganizationStoreState(initial)
  return <ORGANIZATION_STORE_CONTEXT.Provider value={store}>{children}</ORGANIZATION_STORE_CONTEXT.Provider>
}
