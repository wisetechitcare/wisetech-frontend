import { useState } from "react"

import { OrganizationDetailScreen } from "./OrganizationDetailScreen"
import { OrganizationStoreProvider } from "./OrganizationStoreProvider"
import { OrganizationsScreen } from "./OrganizationsScreen"

import { OrgDetailTab, type OrganizationData, type OrgListTab } from "@/ds/prototypes/types/organization/organization"

interface Route {
  orgId: string | null
  tab: OrgDetailTab
}

export interface OrganizationProfileAppProps {
  /** Open straight on this organization's page; omit for the Organizations list. */
  initialOrgId?: string
  initialTab?: OrgDetailTab
  initialListTab?: OrgListTab
  /** Replace the demo data, e.g. empty lists for the first-run state. */
  data?: Partial<OrganizationData>
}

/** The Organization Profile prototype: the Organizations list and one page per organization, on demo data. */
export function OrganizationProfileApp({ initialOrgId, initialTab = OrgDetailTab.OVERVIEW, initialListTab, data }: OrganizationProfileAppProps) {
  const [route, setRoute] = useState<Route>({ orgId: initialOrgId ?? null, tab: initialTab })
  const openOrg = (orgId: string, tab: OrgDetailTab = OrgDetailTab.OVERVIEW) => setRoute({ orgId, tab })

  return (
    <OrganizationStoreProvider initial={data}>
      <main className="min-h-screen bg-background text-foreground">
        {route.orgId ? (
          <OrganizationDetailScreen
            key={`${route.orgId}-${route.tab}`}
            orgId={route.orgId}
            initialTab={route.tab}
            onBack={() => setRoute({ orgId: null, tab: OrgDetailTab.OVERVIEW })}
            onOpenOrg={openOrg}
          />
        ) : (
          <OrganizationsScreen initialTab={initialListTab} onOpenOrg={openOrg} />
        )}
      </main>
    </OrganizationStoreProvider>
  )
}
