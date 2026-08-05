import React from "react"
import { Box, Stack } from "@mui/material"
import { WtSwitch } from "@app/modules/common/components/ui"

/** Non-blocking notice strip (duplicate warning, missing-data hint, …). */
export const Notice: React.FC<{
  tone: "warning" | "info" | "success"
  icon: string
  children: React.ReactNode
}> = ({ tone, icon, children }) => (
  <div className={`wt-notice is-${tone}`}>
    <i className={`bi ${icon}`} style={{ marginTop: 1 }} />
    <span>{children}</span>
  </div>
)

/** Label + description on the left, switch on the right. */
export const ToggleRow: React.FC<{
  id: string
  title: string
  subtitle?: string
  checked: boolean
  onChange: (checked: boolean) => void
}> = ({ id, title, subtitle, checked, onChange }) => (
  <Stack
    direction="row"
    alignItems="center"
    justifyContent="space-between"
    className={`wt-toggle-row${checked ? " is-on" : ""}`}
  >
    <label htmlFor={id} style={{ cursor: "pointer", marginBottom: 0, flex: 1 }}>
      <span className="wt-toggle-row-title">{title}</span>
      {subtitle && <span className="wt-toggle-row-sub">{subtitle}</span>}
    </label>
    <WtSwitch checked={checked} onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.checked)} inputProps={{ id }} />
  </Stack>
)
