import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, screen, userEvent, waitFor, within } from "storybook/test"

import { OrganizationProfileApp } from "./OrganizationProfileApp"

import { animationsSettled } from "@/ds/lib/motion"
import { ORG_IDS } from "@/storybook/screens/organization/fixtures/organization"
import { OrgDetailTab, OrgListTab } from "@/storybook/screens/organization/types/organization"

/**
 * Redesign of the Organization Profile module (demo data, UI-only — nothing is saved).
 *
 * - One page per organization with tabs (Overview · Branches · Devices · Profile fields): at most one dialog
 *   on top, where the live screen stacked up to five layers.
 * - One rule per number: roll-up counts, device health ("not syncing for a day" needs attention), fiscal-year
 *   expiry and missing required fields each come from one place (`utils/organization`, unit-tested).
 * - Every dialog is the kit's Form Dialog: ✕, Esc, Cancel and the discard guard behave the same everywhere.
 * - A group's Branches tab shows the branches its tree row counts (the live Branches modal showed 0 for a
 *   group with 4), and a month-stale device is "Not syncing" (the live tiles said "0 need attention").
 */
const meta = {
  title: "Screens/Organization Profile",
  component: OrganizationProfileApp,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof OrganizationProfileApp>

export default meta
type Story = StoryObj<typeof meta>

/** The hierarchy: totals, then a searchable tree. Search keeps only matching branches under other organizations. */
export const Organizations: Story = {
  play: async ({ canvas }) => {
    await userEvent.type(canvas.getByRole("textbox", { name: "Search organizations and branches" }), "vashi")
    await expect(await canvas.findByRole("button", { name: "Vashi Studio" })).toBeInTheDocument()
    await expect(canvas.getByRole("button", { name: "Vashi Office" })).toBeInTheDocument()
    await expect(canvas.queryByRole("button", { name: "Jogeshwari Head Office" })).not.toBeInTheDocument()
  },
}

/** The shared Towns list. A town in use can be renamed (its branches follow) but not deleted. */
export const Towns: Story = {
  args: { initialListTab: OrgListTab.TOWNS },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Used by 2 branches")).toBeInTheDocument()
    await expect(canvas.getByText("Not used yet")).toBeInTheDocument()
  },
}

/** A group's profile: what needs fixing comes first (ended fiscal year, empty required fields). */
export const GroupOverview: Story = {
  args: { initialOrgId: ORG_IDS.GROUP },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { level: 1, name: "Meridian Group" })).toBeInTheDocument()
    await expect(canvas.getByText(/the fiscal year ended on 2026\.03\.31/i)).toBeInTheDocument()
    await expect(canvas.getByText(/4 required fields still empty/i)).toBeInTheDocument()
  },
}

/** A complete profile. Bank details are masked until "Show details"; custom sections appear like built-in ones. */
export const CompleteProfile: Story = {
  args: { initialOrgId: ORG_IDS.MEP },
  play: async ({ canvas }) => {
    await expect(canvas.queryByText(/required fields? still empty/i)).not.toBeInTheDocument()
    await expect(canvas.getAllByText("Hidden").length).toBeGreaterThan(0)
    await userEvent.click(canvas.getByRole("button", { name: /show details/i }))
    await expect(canvas.getByText("50200012345678")).toBeInTheDocument()
  },
}

/** Branches grouped by the organization that owns them, so the group's tab shows the 4 its tree row counts. */
export const Branches: Story = {
  args: { initialOrgId: ORG_IDS.GROUP, initialTab: OrgDetailTab.BRANCHES },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { name: "Meridian Associates" })).toBeInTheDocument()
    await expect(canvas.getByRole("heading", { name: "Meridian MEP Consultants Pvt. Ltd." })).toBeInTheDocument()
    await expect(canvas.getByText("1 device needs attention")).toBeInTheDocument()
  },
}

/** A new branch starts with its organization chosen (the live form asked again, with nothing selected). */
export const NewBranch: Story = {
  args: { initialOrgId: ORG_IDS.MEP, initialTab: OrgDetailTab.BRANCHES },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "New Branch" }))
    const dialog = await screen.findByRole("dialog")
    await expect(within(dialog).getByRole("combobox", { name: /Organization/ })).toHaveValue("Meridian Group › Meridian MEP Consultants Pvt. Ltd.")
    await expect(within(dialog).getByRole("button", { name: "Create Branch" })).toBeDisabled()
    await animationsSettled()
  },
}

/** Every device across the organization's branches. A month without a sync is "Not syncing". */
export const Devices: Story = {
  args: { initialOrgId: ORG_IDS.GROUP, initialTab: OrgDetailTab.DEVICES },
  play: async ({ canvas }) => {
    await expect(canvas.getByText(/not syncing/i)).toBeInTheDocument()
    await expect(canvas.getByText("Need Attention")).toBeInTheDocument()
  },
}

/** The profile's own form, edited in place with one Save (was a modal on a modal with "Apply", then "Update"). */
export const ProfileFields: Story = {
  args: { initialOrgId: ORG_IDS.MEP, initialTab: OrgDetailTab.FIELDS },
  play: async ({ canvas }) => {
    const save = canvas.getByRole("button", { name: "Save Changes" })
    await expect(save).toBeDisabled()
    await userEvent.click(canvas.getByRole("switch", { name: "TAN required" }))
    await waitFor(() => expect(save).toBeEnabled())
  },
}

/** Edit opens one sectioned dialog; its fields come from Profile fields. */
export const EditProfile: Story = {
  args: { initialOrgId: ORG_IDS.MEP },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getAllByRole("button", { name: "Edit Profile" })[0])
    const nav = await screen.findByRole("navigation", { name: "Form sections" })
    await expect(within(nav).getByRole("link", { name: "Bank Details" })).toBeInTheDocument()
    await expect(within(nav).getByRole("link", { name: "Insurance" })).toBeInTheDocument()
    await animationsSettled()
  },
}

/** First run: nothing set up yet. */
export const FirstRun: Story = {
  args: { data: { orgs: [], branches: [], devices: [], syncLogs: [] } },
  play: async ({ canvas }) => {
    await expect(canvas.getByText(/no organizations yet/i)).toBeInTheDocument()
  },
}
