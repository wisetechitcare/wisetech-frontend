import type { Meta, StoryObj } from '@storybook/react-vite'
import { ColourRoles, Foundations, RadiusElevation, SpacingDensity, StatusColours, TypeScale, TypesetArticle } from './Foundations'

/** Design tokens of Visual Language v2 — every value lives in `src/ds/styles/globals.css`. */
const meta = {
  title: 'Foundations/Tokens',
  component: Foundations,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Foundations>

export default meta
type Story = StoryObj<typeof meta>

/** Every foundation on one page. */
export const AllFoundations: Story = {}

/** Colour roles components use — the brand role follows each tenant's Appearance setting. */
export const ColourRolesStory: Story = { name: 'Colour roles', render: () => <ColourRoles /> }

/** One status set: solid, soft fill and readable text, in both themes. */
export const StatusStory: Story = { name: 'Status colours', render: () => <StatusColours /> }

/** Inter, five roles; numbers use tabular figures. */
export const TypeScaleStory: Story = { name: 'Type scale', render: () => <TypeScale /> }

/** Rendered markdown in the typeset-article preset: headings, lists, table, code, quote — no classes on the content. */
export const TypesetStory: Story = { name: 'Typeset (article)', render: () => <TypesetArticle /> }

/** shadcn's radius scale and shadows. */
export const RadiusElevationStory: Story = { name: 'Radius & shadow', render: () => <RadiusElevation /> }

/** 4-point spacing; switch Density in the toolbar to see the compact scale. */
export const SpacingStory: Story = { name: 'Spacing & density', render: () => <SpacingDensity /> }
