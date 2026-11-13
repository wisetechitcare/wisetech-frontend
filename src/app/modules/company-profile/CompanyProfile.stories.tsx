import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, screen, userEvent, within } from 'storybook/test'
import { animationsSettled } from '@/ds/lib/motion'
import { CompanyProfileDeck } from './CompanyProfileDeck'
import { DEMO_DATA, DEMO_SECTIONS } from './fixtures'

/**
 * Company Profile builder (prototype: demo data, local state only, not wired to the app). Same builder, section
 * list, stage and slides as CRM → Company Profile. Cover, About, Who we are and Contact are hardcoded copy; every
 * project category gets its own section, and the client wall flows onto as many slides as it needs. Slides can be
 * shown, hidden and (project slides) reordered one by one; a presentation shows at most 20.
 */
const meta = {
  title: 'Screens/Company Showcase',
  component: CompanyProfileDeck,
  parameters: { layout: 'fullscreen' },
  args: { data: DEMO_DATA, initialSections: DEMO_SECTIONS },
} satisfies Meta<typeof CompanyProfileDeck>

export default meta
type Story = StoryObj<typeof meta>

/** The demo deck: 11 one-slide sections, High-rise over 2 slides, the client wall over CLIENT_SLIDES: 20 exactly. */
const CLIENT_SLIDES = 5
const N = 15 + CLIENT_SLIDES
const COMPANIES = DEMO_DATA.companies.length

/** Cover: logo, tagline, hero render, the four pillars and the live totals band (as in Profile.pptx). */
export const Cover: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { level: 3, name: 'Company Profile' })).toBeInTheDocument()
    await expect(within(canvas.getByRole('region', { name: /^1 of/ })).getByText('650+')).toBeInTheDocument()
    await expect(canvas.getByTestId('slide-counter')).toHaveTextContent(`1 / ${N}`)
    await expect(canvas.getByTestId('slide-budget')).toHaveTextContent(`${N} of 20 slides selected`)
  },
}

/** About us: the company's copy over Our journey, a milestone timeline (sample milestones in the demo data). The footer reads "2 of 20". */
export const AboutUs: Story = {
  args: { initialSlideId: 'about' },
  play: async ({ canvas }) => {
    const stage = within(canvas.getByRole('region', { name: /About us/ }))
    await expect(stage.getByText('Our journey')).toBeInTheDocument()
    await expect(stage.getByText('Company Founded')).toBeInTheDocument()
    await expect(stage.getByTestId('slide-page')).toHaveTextContent(`2 of ${N}`)
  },
}

/** Who we are: vision, mission and values. */
export const WhoWeAre: Story = { args: { initialSlideId: 'vision' } }

/** Services, picked from the CRM services list, with how many projects used each. */
export const Services: Story = { args: { initialSlideId: 'services' } }

/** A category section (High-rise): its 11 projects spread evenly as 6 + 5. Each tile shows its Gallery cover and status badge. */
export const HighRiseProjects: Story = {
  args: { initialSlideId: 'high-rise-1' },
  play: async ({ canvas }) => {
    const stage = within(canvas.getByRole('region', { name: /High-rise 1/ }))
    await expect(stage.getByRole('heading', { level: 3, name: 'High-rise' })).toBeInTheDocument()
    await expect(stage.getByText('Project category · 1 / 2')).toBeInTheDocument()
    await expect(stage.getAllByText(/^(Completed|Ongoing)$/).length).toBe(6)
  },
}

/** Government: one full-ish slide (8 projects, one hero beside a 4 + 3 grid). */
export const GovernmentProjects: Story = { args: { initialSlideId: 'government' } }

/** International: 7 projects. */
export const InternationalProjects: Story = { args: { initialSlideId: 'international' } }

/**
 * Our Clients: every client and architect, grouped by company type, each plate with its logo, name and project
 * count. Whatever does not fit flows onto the next slide, so the section grows with the client list.
 */
export const ClientLogos: Story = {
  args: { initialSlideId: 'clients-1' },
  play: async ({ canvas }) => {
    const stage = within(canvas.getByRole('region', { name: /Our Clients 1/ }))
    await expect(stage.getByText('Builder')).toBeInTheDocument()
    await expect(stage.getByText('D Mart').closest('li')).toHaveTextContent('7 projects')
    await expect(within(canvas.getByRole('group', { name: 'Our Clients slides' })).getAllByRole('button', { name: /^Include Our Clients \d/ })).toHaveLength(CLIENT_SLIDES)
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
 * Edit a project section: a project already on another section cannot be picked twice; move a project to a new
 * slide and the section grows to two (after hiding Contact to make room in the presentation).
 */
export const EditProjects: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Include Contact', pressed: true }))
    await userEvent.click(canvas.getByRole('button', { name: 'Edit Heritage' }))
    const dialog = within(await screen.findByRole('dialog', { name: 'Choose projects' }))
    await expect(dialog.getByTestId('picker-summary')).toHaveTextContent('4 selected · 1 slide')
    await expect(dialog.getAllByText('On Government')[0].closest('button')).toBeDisabled()
    const slide = within(dialog.getByRole('group', { name: 'Slide 1' }))
    await userEvent.selectOptions(slide.getAllByRole('combobox')[0], 'new')
    await expect(dialog.getByTestId('picker-summary')).toHaveTextContent('4 selected · 2 slides')
    await userEvent.click(dialog.getByRole('button', { name: 'Save section' }))
    await expect(await canvas.findByRole('region', { name: /Heritage 1/ })).toBeInTheDocument()
    await expect(canvas.getByTestId('slide-budget')).toHaveTextContent(`${N} of 20 slides selected`)
    await animationsSettled()
  },
}

/** Project slides reorder one by one (drag, or the grip's arrow keys), apart from the section order. */
export const ReorderSlides: Story = {
  play: async ({ canvas }) => {
    canvas.getByRole('button', { name: /^Drag to reorder High-rise 2,/ }).focus()
    await userEvent.keyboard('{ArrowUp}')
    await userEvent.click(canvas.getByRole('button', { name: '5. High-rise 1' }))
    await expect(within(canvas.getByRole('region', { name: /High-rise 1/ })).getAllByRole('listitem')).toHaveLength(4)
  },
}

/** The 20-slide limit: a section that would show a 21st slide cannot be saved, and showing a hidden one is refused. */
export const SlideLimit: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Edit Heritage' }))
    const dialog = within(await screen.findByRole('dialog', { name: 'Choose projects' }))
    await userEvent.selectOptions(within(dialog.getByRole('group', { name: 'Slide 1' })).getAllByRole('combobox')[0], 'new')
    await expect(dialog.getByTestId('picker-summary')).toHaveTextContent('4 selected · 2 slides · only 1 left in the presentation')
    await expect(dialog.getByRole('button', { name: 'Save section' })).toBeDisabled()
    await userEvent.click(dialog.getByRole('button', { name: 'Cancel' }))
    // Hide Services, fill its place with a logo slide, then try to show Services again.
    await userEvent.click(canvas.getByRole('button', { name: 'Include Services we offer', pressed: true }))
    await userEvent.click(canvas.getByRole('button', { name: 'Add logos' }))
    await userEvent.click(within(await screen.findByRole('dialog', { name: 'Choose companies' })).getByRole('button', { name: 'Save section' }))
    await expect(canvas.getByTestId('slide-budget')).toHaveTextContent('20 of 20 slides selected')
    await userEvent.click(canvas.getByRole('button', { name: 'Include Services we offer', pressed: false }))
    await expect(canvas.getByTestId('slide-budget')).toHaveTextContent('20 of 20 slides selected')
    await expect(canvas.getByRole('button', { name: 'Include Services we offer', pressed: false })).toBeInTheDocument()
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

/** Add a logo slide (e.g. "Government clients"), pre-filled with the most frequent companies, once there is room for it. */
export const AddLogoSlide: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Include Contact', pressed: true }))
    await userEvent.click(canvas.getByRole('button', { name: 'Add logos' }))
    const dialog = within(await screen.findByRole('dialog', { name: 'Choose companies' }))
    await userEvent.clear(dialog.getByLabelText('Slide title'))
    await userEvent.type(dialog.getByLabelText('Slide title'), 'Government clients')
    await userEvent.click(dialog.getByRole('button', { name: 'Save section' }))
    await expect(canvas.getByTestId('slide-budget')).toHaveTextContent(`${N} of 20 slides selected`)
    await expect(await canvas.findByRole('heading', { level: 3, name: 'Government clients' })).toBeInTheDocument()
    await animationsSettled()
  },
}

/** Hiding a section drops its slides; showing it again is refused when the presentation would pass 20. */
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
    await expect(canvas.getByText('11 projects · 2 slides, 1 hidden')).toBeInTheDocument()
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
