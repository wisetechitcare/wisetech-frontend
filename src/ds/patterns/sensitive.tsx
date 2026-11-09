import * as React from "react"
import { Eye, EyeOff } from "lucide-react"
import { cn } from "@/ds/lib/utils"
import { Toggle } from "@/ds/ui/toggle"

type Ctx = { visible: boolean; setVisible: (v: boolean) => void; provided: boolean }

const SensitiveContext = React.createContext<Ctx>({ visible: true, setVisible: () => undefined, provided: false })

/**
 * One eye switch hides every amount on a screen (salary, reimbursements, loans). Replaces the live
 * `SensitiveData` provider. Opt-in: with no provider nothing is hidden.
 */
export function SensitiveProvider({
  children,
  defaultVisible = false,
}: {
  children: React.ReactNode
  /** Screens showing one's own data may open revealed. */
  defaultVisible?: boolean
}) {
  const [visible, setVisible] = React.useState(defaultVisible)
  return <SensitiveContext.Provider value={{ visible, setVisible, provided: true }}>{children}</SensitiveContext.Provider>
}

/** The eye switch: "Show amounts", pressed while they are shown (the state is announced). */
export function SensitiveToggle({ className }: { className?: string }) {
  const { visible, setVisible, provided } = React.useContext(SensitiveContext)
  if (!provided) return null
  return (
    <Toggle
      variant="outline"
      size="sm"
      pressed={visible}
      onPressedChange={setVisible}
      className={className}
    >
      {visible ? <Eye aria-hidden /> : <EyeOff aria-hidden />}
      Show amounts
    </Toggle>
  )
}

/**
 * A figure that hides with the eye switch. Hidden values are replaced for assistive tech too (the blur is
 * only visual), so a screen reader never reads out a salary the user chose to hide.
 */
export function SensitiveValue({ children, className }: { children: React.ReactNode; className?: string }) {
  const { visible } = React.useContext(SensitiveContext)
  if (visible) return <span className={className}>{children}</span>
  return (
    <span className={cn("relative inline-block", className)}>
      <span aria-hidden className="select-none blur-sm">{children}</span>
      <span className="sr-only">Hidden</span>
    </span>
  )
}
