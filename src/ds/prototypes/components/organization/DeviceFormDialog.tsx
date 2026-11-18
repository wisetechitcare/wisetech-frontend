import { useState, type FormEvent } from "react"
import { Fingerprint } from "lucide-react"
import { toast } from "sonner"

import { ChoiceCards } from "@/ds/patterns/choice-cards"
import { FormDialog } from "@/ds/patterns/form-dialog"
import { PasswordField } from "@/ds/patterns/password-field"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/ds/ui/field"
import { Input } from "@/ds/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ds/ui/select"

import type { ConnectionMode, IBiometricDevice } from "@/models/biometric"
import { useOrganizationStore } from "@/ds/prototypes/hooks/organization"
import {
  CONNECTION_MODES,
  DEFAULT_DEVICE_PORT,
  DEFAULT_DEVICE_USERNAME,
  MASKED_PASSWORD,
} from "@/ds/prototypes/constants/organization/organization"
import { DeviceConnectionMode, type Branch } from "@/ds/prototypes/types/organization/organization"
import { fixFieldsMessage } from "@/ds/prototypes/utils/common/format"

const FORM_ID = "device-form"
const IPV4_PATTERN = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/
const MAX_PORT = 65_535

type DeviceErrors = Partial<Record<keyof IBiometricDevice, string>>
type TextKey = "name" | "deviceIp" | "devicePort" | "serialNumber" | "username"

const TEXT_FIELDS: ReadonlyArray<{ key: TextKey; label: string; inputMode?: "decimal" | "numeric"; hint?: string }> = [
  { key: "name", label: "Device name", hint: "Where it hangs, e.g. Main entrance." },
  { key: "serialNumber", label: "Serial number", hint: "Printed on the back of the device." },
  { key: "deviceIp", label: "IP address", inputMode: "decimal" },
  { key: "devicePort", label: "Port", inputMode: "numeric" },
  { key: "username", label: "Username" },
]

const blankDevice = (branchId: string): IBiometricDevice => ({
  id: crypto.randomUUID(),
  branchId,
  name: "",
  deviceIp: "",
  devicePort: DEFAULT_DEVICE_PORT,
  serialNumber: "",
  sourceDeviceName: null,
  username: DEFAULT_DEVICE_USERNAME,
  password: "",
  isActive: true,
  connectionMode: DeviceConnectionMode.PUSH,
  consecutiveFailures: 0,
  lastSyncedAt: null,
  lastSyncStatus: null,
  lastPushAt: null,
  lastPullAt: null,
  createdAt: new Date().toISOString(),
})

function validate(draft: IBiometricDevice, creating: boolean): DeviceErrors {
  const errors: DeviceErrors = {}
  for (const f of TEXT_FIELDS) if (!draft[f.key].trim()) errors[f.key] = `Enter the ${f.label.toLowerCase()}.`
  if (draft.deviceIp && !IPV4_PATTERN.test(draft.deviceIp)) errors.deviceIp = "Enter an IPv4 address like 192.168.1.100."
  const port = Number(draft.devicePort)
  if (draft.devicePort && !(Number.isInteger(port) && port > 0 && port <= MAX_PORT)) errors.devicePort = `Ports run from 1 to ${MAX_PORT}.`
  if (creating && !draft.password) errors.password = "Enter the device password."
  return errors
}

interface DeviceFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  device?: IBiometricDevice
  /** The branches it can belong to. */
  branches: Branch[]
  /** Create mode: preselect this branch. */
  branchId?: string
}

/** Add or edit a biometric device: how it talks to the server, then where to reach it. */
export function DeviceFormDialog({ open, onOpenChange, device, branches, branchId }: DeviceFormDialogProps) {
  const { saveDevice } = useOrganizationStore()
  const creating = !device
  const [draft, setDraft] = useState<IBiometricDevice>(() => (device ? { ...device, password: "" } : blankDevice(branchId ?? branches[0]?.id ?? "")))
  const [dirty, setDirty] = useState<boolean>(false)
  const [errors, setErrors] = useState<DeviceErrors>({})

  const update = (patch: Partial<IBiometricDevice>) => {
    setDraft((d) => ({ ...d, ...patch }))
    setDirty(true)
  }
  const branchItems = branches.map((b) => ({ value: b.id, label: b.name }))

  function submit(e: FormEvent) {
    e.preventDefault()
    const next = validate(draft, creating)
    const failed = Object.keys(next).length
    setErrors(next)
    if (failed) {
      toast.error(fixFieldsMessage(failed))
      return
    }
    saveDevice({ ...draft, password: MASKED_PASSWORD })
    toast.success(creating ? `${draft.name} added. Run Test to check the connection.` : "Device saved.")
    onOpenChange(false)
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={creating ? "Add device" : "Edit device"}
      description={creating ? "Connect a biometric device to a branch." : draft.name}
      icon={<Fingerprint />}
      size="lg"
      formId={FORM_ID}
      submitLabel={creating ? "Add device" : "Save changes"}
      submitDisabled={!dirty}
      dirty={dirty}
    >
      <form id={FORM_ID} noValidate onSubmit={submit} className="space-y-8">
        <ChoiceCards<ConnectionMode>
          label="Connection mode"
          value={draft.connectionMode}
          onValueChange={(connectionMode) => update({ connectionMode })}
          options={CONNECTION_MODES}
          columns={3}
        />

        <FieldSet>
          <FieldLegend>Device</FieldLegend>
          <FieldGroup className="grid gap-4 sm:grid-cols-2">
            <Field className="sm:col-span-2">
              <FieldLabel id="device-branch-label">Branch *</FieldLabel>
              <Select items={branchItems} value={draft.branchId} onValueChange={(v) => v && update({ branchId: v as string })}>
                <SelectTrigger className="w-full" aria-labelledby="device-branch-label">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {branchItems.map((b) => (
                    <SelectItem key={b.value} value={b.value}>
                      {b.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            {TEXT_FIELDS.map((f) => {
              const noteId = `device-${f.key}-note`
              return (
                <Field key={f.key} data-invalid={errors[f.key] ? true : undefined}>
                  <FieldLabel htmlFor={`device-${f.key}`}>{f.label} *</FieldLabel>
                  <Input
                    id={`device-${f.key}`}
                    inputMode={f.inputMode}
                    value={draft[f.key]}
                    onChange={(e) => update({ [f.key]: e.target.value })}
                    aria-invalid={errors[f.key] ? true : undefined}
                    aria-describedby={errors[f.key] || f.hint ? noteId : undefined}
                  />
                  {errors[f.key] && <FieldError id={noteId}>{errors[f.key]}</FieldError>}
                  {!errors[f.key] && f.hint && <FieldDescription id={noteId}>{f.hint}</FieldDescription>}
                </Field>
              )
            })}
            <Field data-invalid={errors.password ? true : undefined}>
              <FieldLabel htmlFor="device-password">{creating ? "Password *" : "New password"}</FieldLabel>
              <PasswordField
                id="device-password"
                autoComplete="new-password"
                value={draft.password}
                onChange={(e) => update({ password: e.target.value })}
                invalid={!!errors.password}
              />
              {errors.password && <FieldError>{errors.password}</FieldError>}
              {!errors.password && !creating && <FieldDescription>Leave empty to keep the current one.</FieldDescription>}
            </Field>
          </FieldGroup>
        </FieldSet>
      </form>
    </FormDialog>
  )
}
