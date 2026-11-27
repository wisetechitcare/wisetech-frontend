import type { Meta, StoryObj } from '@storybook/react-vite'
import { DynamicIcon } from './dynamic-icon'

/**
 * The only way to draw an icon whose name is data (DB columns, persisted config). Static
 * icons are imported from `lucide-react` directly. An unknown name renders nothing.
 * Behaviour is covered by `dynamic-icon.test.tsx`.
 */
const meta = {
  title: 'Foundations/Dynamic Icon',
  component: DynamicIcon,
} satisfies Meta<typeof DynamicIcon>

export default meta
type Story = StoryObj<typeof meta>

const NAMES = ['setting-2', 'bi-trash', 'calendar', 'notification']

/** Stored registry names and the Lucide glyph each resolves to. */
export const RegistryNames: Story = {
  args: { name: NAMES[0] },
  render: () => (
    <div className="flex gap-6">
      {NAMES.map((name) => (
        <div key={name} className="flex flex-col items-center gap-1">
          <DynamicIcon name={name} />
          <code className="font-mono text-xs text-muted-foreground">{name}</code>
        </div>
      ))}
    </div>
  ),
}
