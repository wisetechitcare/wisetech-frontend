import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, screen, userEvent, within } from 'storybook/test'
import { animationsSettled } from '@/ds/lib/motion'
import { CompanyProfileDeck } from './CompanyProfileDeck'
import { DEMO_DATA, DEMO_SECTIONS } from './fixtures'

/**
 * Company Profile builder (prototype: demo data, local state only, not wired to the app).
 * Cover, About, Who we are, Scope and Contact are hardcoded copy. Every other slide is fetched from the
 * app (projects + Gallery covers, CRM services, Companies logos, project locations) and shows only what
 * was picked. The deck is capped at 20 slides.
 */
const meta = {
  title: 'Screens/Company Profile',
  component: CompanyProfileDeck,
  parameters: { layout: 'fullscreen' },
  args: { data: DEMO_DATA, initialSections: DEMO_SECTIONS },
} satisfies Meta<typeof CompanyProfileDeck>

export default meta
type Story = StoryObj<typeof meta>

/** Cover: hero image, legal name, tagline and live headline numbers. */
export const Cover: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { level: 3, name: DEMO_DATA.org.tagline })).toBeInTheDocument()
    await expect(canvas.getByTestId('slide-counter')).toHaveTextContent('1 / 18')
    await expect(canvas.getByTestId('slide-budget')).toHaveTextContent('18 of 20 slides')
  },
}

/** About us: hardcoded copy over live totals (projects, completed, clients, years, team). */
export const AboutUs: Story = { args: { initialSlideId: 'about' } }

/** Who we are: vision, mission and values. */
export const WhoWeAre: Story = { args: { initialSlideId: 'vision' } }

/** Services, picked from the CRM services list, with how many projects used each. */
export const Services: Story = { args: { initialSlideId: 'services' } }

/** Scope of services, concept to handover. */
export const ScopeOfServices: Story = { args: { initialSlideId: 'scope' } }

/** A tag section (High-rise): 10 picked projects become two slides, each tile showing its Gallery cover and size. */
export const HighRiseProjects: Story = {
  args: { initialSlideId: 'high-rise-1' },
  play: async ({ canvas }) => {
    const stage = within(canvas.getByRole('region', { name: /High-rise 1/ }))
    await expect(stage.getByRole('heading', { level: 3, name: 'High-rise' })).toBeInTheDocument()
    await expect(stage.getByText('Portfolio · 1 of 2')).toBeInTheDocument()
    await expect(stage.getByText(/repeat projects · /)).toBeInTheDocument()
  },
}

/** A typology section (Healthcare), with beds as the size. */
export const HealthcareProjects: Story = { args: { initialSlideId: 'healthcare-1' } }

/** Client logos from Companies, grouped by company type. */
export const ClientLogos: Story = {
  args: { initialSlideId: 'clients' },
  play: async ({ canvas }) => {
    const stage = within(canvas.getByRole('region', { name: /Clients/ }))
    await expect(stage.getByRole('img', { name: 'D Mart' })).toBeInTheDocument()
    await expect(stage.getByText('Builder')).toBeInTheDocument()
  },
}

/** Architects, also from Companies. */
export const ArchitectLogos: Story = { args: { initialSlideId: 'architects' } }

/** The same companies shown as a repeat-projects chart. */
export const RepeatClients: Story = { args: { initialSlideId: 'repeat' } }

/** Pan India: picked cities pinned on a dot map built from the official India boundary. */
export const IndiaMap: Story = {
  args: { initialSlideId: 'india' },
  play: async ({ canvas }) => {
    const stage = within(canvas.getByRole('region', { name: /across India/ }))
    await expect(stage.getByRole('img', { name: /Map of \d+ cities with projects/ })).toBeInTheDocument()
  },
}

/** Worldwide: picked countries pinned, India highlighted. */
export const WorldMap: Story = { args: { initialSlideId: 'world' } }

/** Closing contact slide. */
export const Contact: Story = { args: { initialSlideId: 'contact' } }

/** Edit a project section: add a project and change the layout. Projects without a Gallery cover cannot be picked. */
export const EditProjects: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Edit Healthcare' }))
    const dialog = within(await screen.findByRole('dialog', { name: 'Choose projects' }))
    await expect(dialog.getByTestId('picker-summary')).toHaveTextContent('5 selected · 1 slide')
    await userEvent.click(dialog.getByRole('button', { name: /SRV Hospital, Goregaon/ }))
    await expect(dialog.getByTestId('picker-summary')).toHaveTextContent('6 selected · 2 slides')
    await userEvent.click(within(dialog.getByRole('group', { name: 'Projects per slide' })).getByRole('button', { name: '7' }))
    await expect(dialog.getByTestId('picker-summary')).toHaveTextContent('6 selected · 1 slide')
    await userEvent.click(dialog.getByRole('button', { name: 'With cover only' }))
    await expect(dialog.getByRole('button', { name: /KEM Hospital/ })).toBeDisabled()
    await userEvent.click(dialog.getByRole('button', { name: 'Save section' }))
    await expect(await canvas.findByRole('region', { name: /Healthcare/ })).toBeInTheDocument()
    await animationsSettled()
  },
}

/** The 20-slide cap: a project section that would push the deck past 20 cannot be saved. */
export const SlideLimit: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Edit Commercial' }))
    const dialog = within(await screen.findByRole('dialog', { name: 'Choose projects' }))
    await userEvent.click(within(dialog.getByRole('group', { name: 'Projects per slide' })).getByRole('button', { name: '3' }))
    for (const name of [/Lotus Commercial Tower/, /Artek, Marol/, /L&T House/, /DB House/, /Axis Bank MIDC/, /HDFC Bank, Vashi/, /HDFC Bank, Panvel/]) await userEvent.click(dialog.getByRole('button', { name }))
    await expect(dialog.getByTestId('picker-summary')).toHaveTextContent('only 3 left in the deck')
    await expect(dialog.getByRole('button', { name: 'Save section' })).toBeDisabled()
    await animationsSettled()
  },
}

/** Pick which client logos appear: filter by company type, and the slide shows exactly the picked set. */
export const PickClientLogos: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Edit Clients' }))
    const dialog = within(await screen.findByRole('dialog', { name: 'Choose companies' }))
    await userEvent.click(within(dialog.getByRole('group', { name: 'Filter by type' })).getByRole('button', { name: /Healthcare/ }))
    await userEvent.click(dialog.getByRole('button', { name: /Millat Hospital/ }))
    await expect(dialog.getByTestId('picker-summary')).toHaveTextContent('19 of 24 selected')
    await userEvent.click(dialog.getByRole('button', { name: 'Save section' }))
    const stage = within(await canvas.findByRole('region', { name: /Clients/ }))
    await expect(stage.getByRole('img', { name: 'Millat Hospital' })).toBeInTheDocument()
    await animationsSettled()
  },
}

/** Add a logo slide (e.g. "Government clients"), pre-filled with the most frequent companies. */
export const AddLogoSlide: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Add logos' }))
    const dialog = within(await screen.findByRole('dialog', { name: 'Choose companies' }))
    await userEvent.clear(dialog.getByLabelText('Slide title'))
    await userEvent.type(dialog.getByLabelText('Slide title'), 'Government clients')
    await userEvent.click(dialog.getByRole('button', { name: 'Save section' }))
    await expect(canvas.getByTestId('slide-budget')).toHaveTextContent('19 of 20 slides')
    await expect(await canvas.findByRole('heading', { level: 3, name: 'Government clients' })).toBeInTheDocument()
    await animationsSettled()
  },
}

/** Hiding a section drops its slides; showing it again is refused when the deck would pass 20. */
export const HideSection: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Include Scope of services', pressed: true }))
    await expect(canvas.getByTestId('slide-counter')).toHaveTextContent('1 / 17')
  },
}

/** Arrow keys, Home/End and the filmstrip all move between slides. */
export const KeyboardNavigation: Story = {
  play: async ({ canvas }) => {
    canvas.getByRole('region', { name: /1 of 18/ }).focus()
    await userEvent.keyboard('{ArrowRight}{ArrowRight}')
    await expect(canvas.getByTestId('slide-counter')).toHaveTextContent('3 / 18')
    await userEvent.keyboard('{End}')
    await expect(canvas.getByRole('heading', { level: 3, name: DEMO_DATA.org.legalName })).toBeInTheDocument()
    await userEvent.click(canvas.getByRole('button', { name: '2. About us' }))
    await expect(canvas.getByTestId('slide-counter')).toHaveTextContent('2 / 18')
  },
}
