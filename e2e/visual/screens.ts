import type { Page } from "@playwright/test"

export type ScreenState = {
  id: string
  name: string
  /** Overrides the screen's path for this state (e.g. a ?new=1 deep link). */
  path?: string
  /** Read-only steps only: open a dialog or sheet that makes no request. Never submit, delete, approve or reset. */
  prepare?: (page: Page) => Promise<void>
}

export type Screen = { id: string; name: string; path: string; states: ScreenState[] }

const loaded: ScreenState = { id: "loaded", name: "loaded" }

/** Clicks a button, then waits for the dialog it opens. */
const openDialog = (button: RegExp) => async (page: Page) => {
  await page.getByRole("button", { name: button }).first().click()
  await page.getByRole("dialog").last().waitFor({ state: "visible" })
}

/**
 * Together these cover every WtButton variant (tones, ghost, inverted, sizes, icons, disabled,
 * sx overrides, component="label", title-casing) and the other button kinds (raw MUI,
 * react-bootstrap, Bootstrap classes, icon buttons). Add a screen by adding an entry.
 */
export const SCREENS: Screen[] = [
  { id: "dashboard", name: "Dashboard", path: "/dashboard", states: [loaded] },
  { id: "onboarding", name: "Employee onboarding wizard", path: "/employees/create-new", states: [loaded] },
  { id: "create-role", name: "Create role wizard", path: "/recruitment/jobs/create", states: [loaded] },
  { id: "roles", name: "Recruitment roles", path: "/recruitment/roles", states: [loaded] },
  {
    id: "gift-runs",
    name: "Gift runs",
    path: "/gift-management/drives",
    states: [
      loaded,
      {
        id: "filters",
        name: "filters sheet",
        prepare: async (page) => {
          await page.getByRole("button", { name: "Filters" }).first().click()
          await page.getByRole("button", { name: /^apply$/i }).waitFor({ state: "visible" })
        },
      },
      { id: "new", name: "new gift run", path: "/gift-management/drives?new=1" },
    ],
  },
  {
    id: "announcements",
    name: "Announcements",
    path: "/company/announcements",
    states: [loaded, { id: "new", name: "new announcement", prepare: openDialog(/new announcement/i) }],
  },
  {
    id: "organisations",
    name: "Organisations",
    path: "/company/organisation-profile",
    states: [loaded, { id: "new", name: "new organisation", prepare: openDialog(/new organi[sz]ation/i) }],
  },
  { id: "approvals", name: "Approvals inbox", path: "/my-team/approvals", states: [loaded] },
  { id: "proposal-templates", name: "Proposal templates", path: "/leads/configuration", states: [loaded] },
  {
    id: "branches",
    name: "Branches",
    path: "/company/branches",
    states: [loaded, { id: "new", name: "new branch", prepare: openDialog(/new branch/i) }],
  },
  { id: "appearance", name: "Settings / Appearance", path: "/admin/app-settings?area=appearance", states: [loaded] },
]
