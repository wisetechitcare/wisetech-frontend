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

/** Selects a tab or segmented-control option by its label. Read-only: it only changes what is shown. */
const clickTab = (label: RegExp) => async (page: Page) => {
  await page.getByRole("tab", { name: label }).or(page.getByRole("button", { name: label })).first().click()
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
  { id: "meetings", name: "Meetings overview", path: "/employees/meetings", states: [loaded] },
  // A project is a record in YOUR database, so its id comes from the environment, never this file.
  ...(process.env.VISUAL_PROJECT_ID
    ? [{
        id: "project-gallery",
        name: "Project gallery",
        path: `/project/${process.env.VISUAL_PROJECT_ID}?tab=gallery`,
        states: [loaded],
      }]
    : []),
  {
    id: "reimb-payment",
    name: "Reimbursement / Payment",
    path: "/finance/reimbursements/payment",
    states: [
      loaded,
      // The month the page opens on is often empty; All Time is what puts rows in the table.
      { id: "all-time", name: "queue, all time", prepare: clickTab(/^all time$/i) },
      { id: "history", name: "history, all time", prepare: async (page) => {
        await clickTab(/^all time$/i)(page)
        await clickTab(/^history/i)(page)
      } },
    ],
  },
]
