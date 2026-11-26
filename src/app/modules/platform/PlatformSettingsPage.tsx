import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { KeyRound, MoreHorizontal, Package, Pencil, Plus, Shield, ShieldOff, Star, Trash2 } from 'lucide-react'
import { Button } from '@/ds/ui/button'
import { Badge } from '@/ds/ui/badge'
import { Card, CardContent, CardHeader } from '@/ds/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/ds/ui/alert'
import { Spinner } from '@/ds/ui/spinner'
import { Input } from '@/ds/ui/input'
import { Textarea } from '@/ds/ui/textarea'
import { Checkbox } from '@/ds/ui/checkbox'
import { Label } from '@/ds/ui/label'
import { Field, FieldGroup, FieldLabel } from '@/ds/ui/field'
import { NumberField } from '@/ds/ui/number-field'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/ds/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ds/ui/tooltip'
import { PasswordField } from '@/ds/patterns/password-field'
import { platformChangePassword, platformMfaDisable } from '@services/platformAuth'
import { useNavigate } from 'react-router-dom'
import { SectionHeader } from '@/ds/patterns/section-header'
import { SettingsRow, SettingsSection } from '@/ds/patterns/settings-section'
import { DescriptionList } from '@/ds/patterns/description-list'
import { ConfirmDialog } from '@/ds/patterns/confirm-dialog'
import { EmptyState } from '@/ds/patterns/empty-state'
import { FormDialog } from '@/ds/patterns/form-dialog'
import { TENANT_PACK_KEYS, TENANT_PACK_META } from '@constants/entitlements'
import {
  createPlatformPlan,
  deletePlatformPlan,
  fetchPlatformPlans,
  setDefaultPlatformPlan,
  updatePlatformPlan,
  updatePlatformPolicy,
  type PlatformCommercialPlan,
  type PlatformPlanPacks,
  type PlatformSettingsPolicy,
} from '@services/platformSettings'
import { PlatformShell } from './PlatformShell'
import { usePlatformSession } from './PlatformSessionContext'
import { platformApiError } from './platformApiError'

const EMPTY_PACKS: PlatformPlanPacks = {
  workforce: true,
  pay: false,
  psa: false,
  talent: false,
}

function PackChips({ packs }: { packs: PlatformCommercialPlan['packs'] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {TENANT_PACK_KEYS.map((key) =>
        packs[key] ? (
          <Badge key={key} variant={key === 'core' ? 'brand' : 'neutral'}>
            {TENANT_PACK_META[key].title}
          </Badge>
        ) : null,
      )}
    </div>
  )
}

type PlanFormState = {
  code: string
  name: string
  description: string
  packs: PlatformPlanPacks
  isDefault: boolean
}

type PolicyFormState = {
  supportNormalMaxMinutes: number
  supportBreakGlassMaxMinutes: number
  supportMinMinutes: number
  supportReasonMinLength: number
}

/**
 * Platform Settings — commercial plans CRUD + editable console policy.
 * Section icons sit top-right inside Cards (kit: cards right, rows left, dialogs left).
 */
export default function PlatformSettingsPage() {
  const navigate = useNavigate()
  const { user, setUser, signOut } = usePlatformSession()
  const isAdmin = user?.platformRole === 'ADMIN'

  const [plans, setPlans] = useState<PlatformCommercialPlan[]>([])
  const [defaultId, setDefaultId] = useState<string | null>(null)
  const [policy, setPolicy] = useState<PlatformSettingsPolicy | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showInactive, setShowInactive] = useState(false)

  const [pwOpen, setPwOpen] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwBusy, setPwBusy] = useState(false)
  const [pwError, setPwError] = useState<string | null>(null)

  const [mfaDisableOpen, setMfaDisableOpen] = useState(false)
  const [mfaCode, setMfaCode] = useState('')
  const [mfaBusy, setMfaBusy] = useState(false)
  const [mfaError, setMfaError] = useState<string | null>(null)

  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<PlatformCommercialPlan | null>(null)
  const [form, setForm] = useState<PlanFormState>({
    code: '',
    name: '',
    description: '',
    packs: { ...EMPTY_PACKS },
    isDefault: false,
  })
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<PlatformCommercialPlan | null>(null)

  const [policyForm, setPolicyForm] = useState<PolicyFormState | null>(null)
  const [policySaving, setPolicySaving] = useState(false)

  const refresh = useCallback(async () => {
    setError(null)
    setLoading(true)
    try {
      const data = await fetchPlatformPlans({ all: showInactive && isAdmin })
      setPlans(data.plans)
      setDefaultId(data.defaultNewTenantPlanId)
      setPolicy(data.policy)
      setPolicyForm({
        supportNormalMaxMinutes: data.policy.supportNormalMaxMinutes,
        supportBreakGlassMaxMinutes: data.policy.supportBreakGlassMaxMinutes,
        supportMinMinutes: data.policy.supportMinMinutes ?? 15,
        supportReasonMinLength: data.policy.supportReasonMinLength ?? 10,
      })
    } catch (err) {
      setError(platformApiError(err))
      setPlans([])
    } finally {
      setLoading(false)
    }
  }, [isAdmin, showInactive])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const visiblePlans = useMemo(
    () => (showInactive ? plans : plans.filter((p) => p.isActive)),
    [plans, showInactive],
  )

  const policyDirty = Boolean(
    policy &&
      policyForm &&
      (policyForm.supportNormalMaxMinutes !== policy.supportNormalMaxMinutes ||
        policyForm.supportBreakGlassMaxMinutes !== policy.supportBreakGlassMaxMinutes ||
        policyForm.supportMinMinutes !== (policy.supportMinMinutes ?? 15) ||
        policyForm.supportReasonMinLength !== (policy.supportReasonMinLength ?? 10)),
  )

  function openCreate() {
    setEditing(null)
    setForm({
      code: '',
      name: '',
      description: '',
      packs: { ...EMPTY_PACKS },
      isDefault: false,
    })
    setFormError(null)
    setEditorOpen(true)
  }

  function openEdit(plan: PlatformCommercialPlan) {
    setEditing(plan)
    setForm({
      code: plan.code,
      name: plan.name,
      description: plan.description ?? '',
      packs: {
        workforce: plan.packs.workforce,
        pay: plan.packs.pay,
        psa: plan.packs.psa,
        talent: plan.packs.talent,
      },
      isDefault: plan.isDefault,
    })
    setFormError(null)
    setEditorOpen(true)
  }

  async function onSave(e: FormEvent) {
    e.preventDefault()
    if (!isAdmin) return
    setSaving(true)
    setFormError(null)
    try {
      if (editing) {
        await updatePlatformPlan(editing.id, {
          name: form.name.trim(),
          description: form.description.trim() || null,
          packs: form.packs,
        })
        if (form.isDefault && !editing.isDefault) {
          await setDefaultPlatformPlan(editing.id)
        }
        toast.success('Plan updated')
      } else {
        await createPlatformPlan({
          code: form.code.trim() || undefined,
          name: form.name.trim(),
          description: form.description.trim() || null,
          packs: form.packs,
          isDefault: form.isDefault,
        })
        toast.success('Plan created')
      }
      setEditorOpen(false)
      await refresh()
    } catch (err) {
      setFormError(platformApiError(err))
    } finally {
      setSaving(false)
    }
  }

  async function onSetDefault(plan: PlatformCommercialPlan) {
    try {
      await setDefaultPlatformPlan(plan.id)
      toast.success(`${plan.name} is now the default`)
      await refresh()
    } catch (err) {
      toast.error(platformApiError(err))
    }
  }

  async function onDeactivate() {
    if (!deleteTarget) return
    try {
      await deletePlatformPlan(deleteTarget.id)
      toast.success('Plan deactivated')
      setDeleteTarget(null)
      await refresh()
    } catch (err) {
      toast.error(platformApiError(err))
      throw err
    }
  }

  async function onReactivate(plan: PlatformCommercialPlan) {
    try {
      await updatePlatformPlan(plan.id, { isActive: true })
      toast.success('Plan reactivated')
      await refresh()
    } catch (err) {
      toast.error(platformApiError(err))
    }
  }

  async function onSavePolicy(e: FormEvent) {
    e.preventDefault()
    if (!isAdmin || !policyForm || !policyDirty) return
    setPolicySaving(true)
    try {
      const next = await updatePlatformPolicy(policyForm)
      setPolicy(next)
      setPolicyForm({
        supportNormalMaxMinutes: next.supportNormalMaxMinutes,
        supportBreakGlassMaxMinutes: next.supportBreakGlassMaxMinutes,
        supportMinMinutes: next.supportMinMinutes,
        supportReasonMinLength: next.supportReasonMinLength,
      })
      toast.success('Policy updated')
    } catch (err) {
      toast.error(platformApiError(err))
    } finally {
      setPolicySaving(false)
    }
  }

  async function onChangePassword(e: FormEvent) {
    e.preventDefault()
    setPwError(null)
    if (newPassword.length < 8) {
      setPwError('New password must be at least 8 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPwError('Passwords do not match.')
      return
    }
    setPwBusy(true)
    try {
      await platformChangePassword(currentPassword, newPassword, confirmPassword)
      toast.success('Password updated. Sign in again.')
      setPwOpen(false)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      await signOut()
      navigate('/platform/login', { replace: true })
    } catch (err) {
      setPwError(platformApiError(err))
    } finally {
      setPwBusy(false)
    }
  }

  async function onDisableMfa(e: FormEvent) {
    e.preventDefault()
    setMfaError(null)
    if (!mfaCode.trim()) {
      setMfaError('Enter your current authenticator code.')
      return
    }
    setMfaBusy(true)
    try {
      await platformMfaDisable(mfaCode.trim())
      toast.success('Authenticator disabled. Set up a new one.')
      setMfaDisableOpen(false)
      setMfaCode('')
      // Do not call platformLogout — it would clear the enroll bridge cookie set by disable.
      setUser(null)
      navigate('/platform/login?reenroll=1', { replace: true })
    } catch (err) {
      setMfaError(platformApiError(err))
    } finally {
      setMfaBusy(false)
    }
  }

  return (
    <PlatformShell
      title="Settings"
      description="Customize commercial plans and support-session policy. Pricing stays outside the app until billing is connected."
      actions={
        isAdmin ? (
          <Button type="button" onClick={openCreate}>
            <Plus aria-hidden /> New Plan
          </Button>
        ) : null
      }
    >
      <SettingsSection
        title="Your Account"
        description={user ? `${user.displayName} · ${user.email}` : 'Signed-in operator'}
        icon={<KeyRound aria-hidden />}
        divided
      >
        <SettingsRow
          label="Password"
          description="Updates immediately. Every platform session signs out after a change."
          control={
            <Button type="button" variant="outline" size="sm" onClick={() => setPwOpen(true)}>
              Change Password
            </Button>
          }
        />
        <SettingsRow
          label="Authenticator"
          description="Disable requires a current code, then you enrol a new device. Lost phone? Ask another ADMIN to reset MFA, or use a recovery code at sign-in."
          control={
            <Button type="button" variant="outline" size="sm" onClick={() => setMfaDisableOpen(true)}>
              <ShieldOff aria-hidden /> Disable
            </Button>
          }
        />
      </SettingsSection>

      <FormDialog
        open={mfaDisableOpen}
        onOpenChange={(open) => {
          setMfaDisableOpen(open)
          if (!open) {
            setMfaError(null)
            setMfaCode('')
          }
        }}
        title="Disable Authenticator"
        description="Enter a current 6-digit code. Your sessions end and you must enrol a new authenticator."
        icon={<ShieldOff aria-hidden />}
        formId="platform-mfa-disable"
        submitLabel="Disable And Re-enrol"
        submitting={mfaBusy}
        dirty={Boolean(mfaCode)}
      >
        <form id="platform-mfa-disable" className="grid gap-5 p-6" onSubmit={onDisableMfa} noValidate>
          {mfaError ? (
            <Alert variant="danger">
              <AlertTitle>Could Not Disable</AlertTitle>
              <AlertDescription>{mfaError}</AlertDescription>
            </Alert>
          ) : null}
          <Field>
            <FieldLabel htmlFor="platform-mfa-disable-code">Authenticator Code</FieldLabel>
            <Input
              id="platform-mfa-disable-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value)}
            />
          </Field>
        </form>
      </FormDialog>

      <FormDialog
        open={pwOpen}
        onOpenChange={(open) => {
          setPwOpen(open)
          if (!open) {
            setPwError(null)
            setCurrentPassword('')
            setNewPassword('')
            setConfirmPassword('')
          }
        }}
        title="Change Password"
        description="You will be signed out of every platform session after saving."
        icon={<KeyRound aria-hidden />}
        formId="platform-change-password"
        submitLabel="Update Password"
        submitting={pwBusy}
        dirty={Boolean(currentPassword || newPassword || confirmPassword)}
      >
        <form id="platform-change-password" className="grid gap-5 p-6" onSubmit={onChangePassword} noValidate>
          {pwError ? (
            <Alert variant="danger">
              <AlertTitle>Could Not Update</AlertTitle>
              <AlertDescription>{pwError}</AlertDescription>
            </Alert>
          ) : null}
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="platform-current-password">Current Password</FieldLabel>
              <PasswordField
                id="platform-current-password"
                autoComplete="current-password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="platform-new-password">New Password</FieldLabel>
              <PasswordField
                id="platform-new-password"
                autoComplete="new-password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="platform-confirm-password">Confirm New Password</FieldLabel>
              <PasswordField
                id="platform-confirm-password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </Field>
          </FieldGroup>
        </form>
      </FormDialog>

      {error ? (
        <EmptyState
          variant="error"
          icon={<Package aria-hidden />}
          title="Could Not Load Settings"
          description={error}
          action={
            <Button size="sm" variant="outline" onClick={() => void refresh()}>
              Retry
            </Button>
          }
        />
      ) : null}

      {!error && loading ? (
        <div className="flex justify-center py-16" role="status">
          <Spinner aria-label="Loading platform settings" />
        </div>
      ) : null}

      {!error && !loading ? (
        <div className="grid gap-6">
          <Card tone="brand">
            <CardHeader>
              <SectionHeader
                title="Commercial Plans"
                description="Create, edit, and set the default plan for new tenants. Apply a plan from Tenants → create or detail."
                icon={<Package aria-hidden />}
                action={
                  isAdmin ? (
                    <Label className="flex items-center gap-2 text-sm font-normal">
                      <Checkbox
                        checked={showInactive}
                        onCheckedChange={(v) => setShowInactive(v === true)}
                      />
                      Show inactive
                    </Label>
                  ) : null
                }
              />
            </CardHeader>
            <CardContent>
              {visiblePlans.length === 0 ? (
                <EmptyState
                  icon={<Package aria-hidden />}
                  title="No Plans Yet"
                  description="Create your first commercial plan to use as a pack preset."
                  action={
                    isAdmin ? (
                      <Button size="sm" onClick={openCreate}>
                        <Plus aria-hidden /> New Plan
                      </Button>
                    ) : null
                  }
                />
              ) : (
                <div className="grid items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {visiblePlans.map((plan) => {
                    const isDefault = plan.isDefault || plan.id === defaultId
                    const planActionsLabel = `Actions for ${plan.name}`
                    return (
                      <Card
                        key={plan.id}
                        size="sm"
                        className={!plan.isActive ? 'flex h-full flex-col opacity-70' : 'flex h-full flex-col'}
                      >
                        <CardHeader className="gap-2 space-y-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="heading-case text-base font-semibold text-foreground">
                                  {plan.name}
                                </h3>
                                {isDefault ? (
                                  <Badge variant="info" dot>
                                    Default
                                  </Badge>
                                ) : null}
                                {!plan.isActive ? (
                                  <Badge variant="neutral" dot>
                                    Inactive
                                  </Badge>
                                ) : null}
                              </div>
                              <p className="font-mono text-xs text-muted-foreground">{plan.code}</p>
                            </div>
                            {isAdmin ? (
                              <DropdownMenu>
                                <Tooltip>
                                  <TooltipTrigger
                                    render={
                                      <DropdownMenuTrigger
                                        render={
                                          <Button
                                            variant="ghost"
                                            size="icon-sm"
                                            className="shrink-0"
                                            aria-label={planActionsLabel}
                                          />
                                        }
                                      />
                                    }
                                  >
                                    <MoreHorizontal aria-hidden />
                                  </TooltipTrigger>
                                  <TooltipContent>{planActionsLabel}</TooltipContent>
                                </Tooltip>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => openEdit(plan)}>
                                    <Pencil aria-hidden /> Edit
                                  </DropdownMenuItem>
                                  {plan.isActive && !isDefault ? (
                                    <DropdownMenuItem onClick={() => void onSetDefault(plan)}>
                                      <Star aria-hidden /> Set Default
                                    </DropdownMenuItem>
                                  ) : null}
                                  {plan.isActive && !isDefault ? (
                                    <DropdownMenuItem
                                      variant="destructive"
                                      onClick={() => setDeleteTarget(plan)}
                                    >
                                      <Trash2 aria-hidden /> Deactivate
                                    </DropdownMenuItem>
                                  ) : null}
                                  {!plan.isActive ? (
                                    <DropdownMenuItem onClick={() => void onReactivate(plan)}>
                                      Reactivate
                                    </DropdownMenuItem>
                                  ) : null}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            ) : null}
                          </div>
                          {plan.description ? (
                            <p className="line-clamp-2 text-sm text-muted-foreground">{plan.description}</p>
                          ) : null}
                        </CardHeader>
                        <CardContent className="mt-auto">
                          <PackChips packs={plan.packs} />
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card tone="blue">
            <CardHeader>
              <SectionHeader
                title="Security & Access Policy"
                description="Operator and support session rules. Pack changes remain platform ADMIN only."
                icon={<Shield aria-hidden />}
                tone="blue"
              />
            </CardHeader>
            <CardContent className="grid gap-6">
              {isAdmin && policyForm ? (
                <form className="grid gap-4 sm:grid-cols-2" onSubmit={onSavePolicy} noValidate>
                  <NumberField
                    label="Normal session max (minutes)"
                    value={policyForm.supportNormalMaxMinutes}
                    minValue={policyForm.supportMinMinutes}
                    maxValue={24 * 60}
                    onChange={(v) =>
                      setPolicyForm((f) => (f ? { ...f, supportNormalMaxMinutes: v ?? f.supportNormalMaxMinutes } : f))
                    }
                  />
                  <NumberField
                    label="Break-glass max (minutes)"
                    value={policyForm.supportBreakGlassMaxMinutes}
                    minValue={policyForm.supportMinMinutes}
                    maxValue={4 * 60}
                    onChange={(v) =>
                      setPolicyForm((f) =>
                        f ? { ...f, supportBreakGlassMaxMinutes: v ?? f.supportBreakGlassMaxMinutes } : f,
                      )
                    }
                  />
                  <NumberField
                    label="Minimum minutes"
                    value={policyForm.supportMinMinutes}
                    minValue={5}
                    maxValue={120}
                    onChange={(v) =>
                      setPolicyForm((f) => (f ? { ...f, supportMinMinutes: v ?? f.supportMinMinutes } : f))
                    }
                  />
                  <NumberField
                    label="Reason min length"
                    value={policyForm.supportReasonMinLength}
                    minValue={5}
                    maxValue={200}
                    onChange={(v) =>
                      setPolicyForm((f) =>
                        f ? { ...f, supportReasonMinLength: v ?? f.supportReasonMinLength } : f,
                      )
                    }
                  />
                  <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
                    <Button type="submit" disabled={!policyDirty || policySaving}>
                      {policySaving ? <Spinner className="size-4" aria-label="Saving" /> : null}
                      Save Policy
                    </Button>
                    <p className="text-sm text-muted-foreground">Operator MFA stays required.</p>
                  </div>
                </form>
              ) : (
                <DescriptionList
                  rows={[
                    { label: 'Operator MFA', value: 'Required' },
                    {
                      label: 'Support session (normal)',
                      value: `Max ${policy?.supportNormalMaxMinutes ?? 240} minutes`,
                    },
                    {
                      label: 'Break-glass',
                      value: `Max ${policy?.supportBreakGlassMaxMinutes ?? 60} minutes`,
                    },
                    { label: 'Module pack edits', value: 'Platform ADMIN only' },
                  ]}
                />
              )}
              <Alert>
                <AlertTitle>Fixed Product Rules</AlertTitle>
                <AlertDescription>
                  Roles (Admin, Developer, Support, Billing) and pack keys (Core, Workforce, Pay, PSA, Talent)
                  are schema-fixed. Billing and invoices stay external until a payment provider is connected.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <FormDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        title={editing ? 'Edit Plan' : 'New Plan'}
        description="Named pack preset. Core is always included. Code is fixed after create."
        icon={<Package aria-hidden />}
        formId="platform-plan-form"
        submitLabel={editing ? 'Save Changes' : 'Create Plan'}
        submitting={saving}
        submitDisabled={!form.name.trim()}
        dirty={Boolean(form.name || form.description || form.code)}
      >
        <form id="platform-plan-form" className="grid gap-4 p-6" onSubmit={onSave} noValidate>
          {formError ? (
            <Alert variant="danger">
              <AlertTitle>Could Not Save</AlertTitle>
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          ) : null}
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="plan-name">Name</FieldLabel>
              <Input
                id="plan-name"
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </Field>
            {!editing ? (
              <Field>
                <FieldLabel htmlFor="plan-code">Code (optional)</FieldLabel>
                <Input
                  id="plan-code"
                  placeholder="auto from name"
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                />
              </Field>
            ) : (
              <p className="text-sm text-muted-foreground">Code: {form.code}</p>
            )}
            <Field>
              <FieldLabel htmlFor="plan-desc">Description</FieldLabel>
              <Textarea
                id="plan-desc"
                rows={3}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </Field>
            <fieldset className="grid gap-3">
              <legend className="text-sm font-medium text-foreground">Module Packs</legend>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Checkbox checked disabled aria-label="Core always on" />
                <span>
                  <span className="font-medium text-foreground">{TENANT_PACK_META.core.title}</span>
                  {' — always included'}
                </span>
              </div>
              {(['workforce', 'pay', 'psa', 'talent'] as const).map((key) => (
                <Label key={key} className="flex items-start gap-3 font-normal">
                  <Checkbox
                    checked={form.packs[key]}
                    onCheckedChange={(v) =>
                      setForm((f) => ({ ...f, packs: { ...f.packs, [key]: v === true } }))
                    }
                  />
                  <span>
                    <span className="font-medium text-foreground">{TENANT_PACK_META[key].title}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {TENANT_PACK_META[key].description}
                    </span>
                  </span>
                </Label>
              ))}
            </fieldset>
            <Label className="flex items-center gap-3 font-normal">
              <Checkbox
                checked={form.isDefault}
                onCheckedChange={(v) => setForm((f) => ({ ...f, isDefault: v === true }))}
              />
              Set as default for new tenants
            </Label>
          </FieldGroup>
        </form>
      </FormDialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        variant="delete"
        danger
        title="Deactivate this plan?"
        description={
          deleteTarget
            ? `“${deleteTarget.name}” will be hidden from new tenants. Reactivate anytime from Show inactive.`
            : undefined
        }
        confirmLabel="Deactivate"
        onConfirm={() => onDeactivate()}
      />
    </PlatformShell>
  )
}
