import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, screen, userEvent, within } from 'storybook/test'
import { animationsSettled } from '@/ds/lib/motion'
import { CompanyProfileDeck } from './CompanyProfileDeck'
import { DEMO_DATA, DEMO_SECTIONS } from './fixtures'

/**
 * Company Profile builder (prototype: demo data, local state only, not wired to the app).
 * Cover, About, Who we are and Contact are hardcoded copy. Every other slide is fetched from the
 * app (projects + Gallery covers, CRM services, Companies logos, project locations) and shows only what
 * was picked. A section that outgrows one slide (projects, the client logo wall) flows onto more, and each
 * of those slides can be hidden on its own. The deck is capped at 20 slides.
 */
const meta = {
  title: 'Screens/Company Profile',
  component: CompanyProfileDeck,
  parameters: { layout: 'fullscreen' },
  args: { data: DEMO_DATA, initialSections: DEMO_SECTIONS },
} satisfies Meta<typeof CompanyProfileDeck>

export default meta
type Story = StoryObj<typeof meta>

/** The demo deck: 13 one-slide sections, High-rise over 2 slides and the client wall over CLIENT_SLIDES. */
const CLIENT_SLIDES = 4
const N = 15 + CLIENT_SLIDES
const COMPANIES = DEMO_DATA.companies.length

/** Cover: brand, tagline, hero image and the four pillars. No numbers here; those live on About us. */
export const Cover: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { level: 3, name: 'Company Profile' })).toBeInTheDocument()
    await expect(canvas.getByTestId('slide-counter')).toHaveTextContent(`1 / ${N}`)
    await expect(canvas.getByTestId('slide-budget')).toHaveTextContent(`${N} of 20 slides`)
  },
}

/** About us: hardcoded copy over live totals (projects, completed, clients, years, team). */
export const AboutUs: Story = { args: { initialSlideId: 'about' } }

/** Who we are: vision, mission and values. */
export const WhoWeAre: Story = { args: { initialSlideId: 'vision' } }

/** Services, picked from the CRM services list, with how many projects used each. */
export const Services: Story = { args: { initialSlideId: 'services' } }

/** A tag section (High-rise): 10 picked projects are spread evenly as 5 + 5, never 9 + 1. Each tile shows its Gallery cover and size. */
export const HighRiseProjects: Story = {
  args: { initialSlideId: 'high-rise-1' },
  play: async ({ canvas }) => {
    const stage = within(canvas.getByRole('region', { name: /High-rise 1/ }))
    await expect(stage.getByRole('heading', { level: 3, name: 'High-rise' })).toBeInTheDocument()
    await expect(stage.getByText('Project category · 1 / 2')).toBeInTheDocument()
  },
}

/** A full slide holds 9: one tall hero beside a 4 × 2 grid of portrait tiles. Fewer projects, fewer columns. */
export const HospitalityProjects: Story = { args: { initialSlideId: 'hospitality' } }

/** A typology section (Healthcare), with beds as the size. */
export const HealthcareProjects: Story = { args: { initialSlideId: 'healthcare' } }

/**
 * Our Clients: every client and architect from Companies, grouped by company type. Small groups share a
 * row; whatever does not fit flows onto the next slide, so the section grows with the client list.
 */
export const ClientLogos: Story = {
  args: { initialSlideId: 'clients-1' },
  play: async ({ canvas }) => {
    const stage = within(canvas.getByRole('region', { name: /Our Clients 1/ }))
    await expect(stage.getByText('Builder')).toBeInTheDocument()
    await expect(stage.getAllByRole('img').length).toBeGreaterThan(20)
    await expect(within(canvas.getByRole('list', { name: 'Our Clients slides' })).getAllByRole('listitem')).toHaveLength(CLIENT_SLIDES)
  },
}

/** Repeat clients: projects per client as a ranked bar chart, with logo and share of the portfolio. */
export const RepeatClients: Story = {
  args: { initialSlideId: 'repeat' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('img', { name: /^Repeat clients: / })).toBeInTheDocument()
  },
}

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

/**
 * Edit a project section: add a sixth project and the slide re-lays itself out (an odd tile count makes the first
 * tile run both rows). Projects without a Gallery cover cannot be picked.
 */
export const EditProjects: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Edit Healthcare' }))
    const dialog = within(await screen.findByRole('dialog', { name: 'Choose projects' }))
    await expect(dialog.getByTestId('picker-summary')).toHaveTextContent('5 selected · 1 slide')
    await userEvent.click(dialog.getByRole('button', { name: /SRV Hospital, Goregaon/ }))
    await expect(dialog.getByTestId('picker-summary')).toHaveTextContent('6 selected · 1 slide')
    await userEvent.click(dialog.getByRole('button', { name: 'With cover only' }))
    await expect(dialog.getByRole('button', { name: /KEM Hospital/ })).toBeDisabled()
    await userEvent.click(dialog.getByRole('button', { name: 'Save section' }))
    await expect(await canvas.findByRole('region', { name: /Healthcare/ })).toBeInTheDocument()
    await animationsSettled()
  },
}

/** A project section needs at least 5 projects, so no slide is ever thinner than 5. */
export const MinimumProjects: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Edit Heritage' }))
    const dialog = within(await screen.findByRole('dialog', { name: 'Choose projects' }))
    await userEvent.click(within(dialog.getAllByRole('listitem')[0]).getByRole('button', { pressed: true }))
    await expect(dialog.getByTestId('picker-summary')).toHaveTextContent('4 selected · pick at least 5')
    await expect(dialog.getByRole('button', { name: 'Save section' })).toBeDisabled()
    await animationsSettled()
  },
}

/** The 20-slide cap: a project section that would push the deck past 20 cannot be saved. */
export const SlideLimit: Story = {
  play: async ({ canvas }) => {
    // Fill the deck to 20 with a second logo slide, so Hospitality has no slide to spare.
    await userEvent.click(canvas.getByRole('button', { name: 'Add logos' }))
    await userEvent.click(within(await screen.findByRole('dialog', { name: 'Choose companies' })).getByRole('button', { name: 'Save section' }))
    await expect(canvas.getByTestId('slide-budget')).toHaveTextContent('20 of 20 slides')
    await userEvent.click(canvas.getByRole('button', { name: 'Edit Hospitality' }))
    const dialog = within(await screen.findByRole('dialog', { name: 'Choose projects' }))
    await expect(dialog.getByTestId('picker-summary')).toHaveTextContent('9 selected · 1 slide')
    const next = dialog
      .getAllByRole('listitem')
      .map((li) => within(li).queryByRole('button', { pressed: false }))
      .find((b): b is HTMLButtonElement => !!b && !(b as HTMLButtonElement).disabled)!
    await userEvent.click(next)
    await expect(dialog.getByTestId('picker-summary')).toHaveTextContent('10 selected · 2 slides · only 1 left in the deck')
    await expect(dialog.getByRole('button', { name: 'Save section' })).toBeDisabled()
    await animationsSettled()
  },
}

/** Pick which client logos appear: every company starts on the wall; filter by type and drop one. */
export const PickClientLogos: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Edit Our Clients' }))
    const dialog = within(await screen.findByRole('dialog', { name: 'Choose companies' }))
    await userEvent.click(within(dialog.getByRole('group', { name: 'Filter by type' })).getByRole('button', { name: /Healthcare/ }))
    await userEvent.click(dialog.getByRole('button', { name: /Millat Hospital/, pressed: true }))
    await expect(dialog.getByTestId('picker-summary')).toHaveTextContent(`${COMPANIES - 1} selected`)
    await userEvent.click(dialog.getByRole('button', { name: 'Save section' }))
    await expect(await canvas.findByText(new RegExp(`^${COMPANIES - 1} companies · logo wall`))).toBeInTheDocument()
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
    await expect(canvas.getByTestId('slide-budget')).toHaveTextContent(`${N + 1} of 20 slides`)
    await expect(await canvas.findByRole('heading', { level: 3, name: 'Government clients' })).toBeInTheDocument()
    await animationsSettled()
  },
}

/** Hiding a section drops its slides; showing it again is refused when the deck would pass 20. */
export const HideSection: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Include Services we offer', pressed: true }))
    await expect(canvas.getByTestId('slide-counter')).toHaveTextContent(`1 / ${N - 1}`)
  },
}

/** One slide of a multi-slide section (High-rise page 2) can be hidden on its own; the rest of the section stays. */
export const HideOneSlide: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Include High-rise 2', pressed: true }))
    await expect(canvas.getByTestId('slide-counter')).toHaveTextContent(`1 / ${N - 1}`)
    await expect(canvas.getByText('10 projects · 2 slides, 1 hidden')).toBeInTheDocument()
    await expect(canvas.getByRole('button', { name: 'Include High-rise', pressed: true })).toBeInTheDocument()
  },
}

/** Arrow keys, Home/End and the filmstrip all move between slides. */
export const KeyboardNavigation: Story = {
  play: async ({ canvas }) => {
    canvas.getByRole('region', { name: new RegExp(`^1 of ${N}`) }).focus()
    await userEvent.keyboard('{ArrowRight}{ArrowRight}')
    await expect(canvas.getByTestId('slide-counter')).toHaveTextContent(`3 / ${N}`)
    await userEvent.keyboard('{End}')
    await expect(canvas.getByRole('heading', { level: 3, name: 'Reach us at · Head office' })).toBeInTheDocument()
    await userEvent.click(canvas.getByRole('button', { name: '2. About us' }))
    await expect(canvas.getByTestId('slide-counter')).toHaveTextContent(`2 / ${N}`)
  },
}
