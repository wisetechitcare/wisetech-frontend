import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, Building2, Mail, Package, PauseCircle, Pencil, PlayCircle } from 'lucide-react'
import { Button } from '@/ds/ui/button'
import { Badge } from '@/ds/ui/badge'
import { Card, CardContent, CardHeader } from '@/ds/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/ds/ui/alert'
import { Spinner } from '@/ds/ui/spinner'
import { Checkbox } from '@/ds/ui/checkbox'
import { Label } from '@/ds/ui/label'
import { Input } from '@/ds/ui/input'
import { Textarea } from '@/ds/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ds/ui/select'
import { Field, FieldGroup, FieldLabel } from '@/ds/ui/field'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/ds/ui/breadcrumb'
import { Item, ItemContent, ItemDescription, ItemGroup, ItemTitle } from '@/ds/ui/item'
import { SectionHeader } from '@/ds/patterns/section-header'
import { DescriptionList } from '@/ds/patterns/description-list'
import { EmptyState } from '@/ds/patterns/empty-state'
import { ConfirmDialog } from '@/ds/patterns/confirm-dialog'
import { FormDialog } from '@/ds/patterns/form-dialog'
import {
  getPlatformTenant,
  reactivatePlatformTenant,
  resendOwnerPasswordSetup,
  suspendPlatformTenant,
  updatePlatformTenantPacks,
  updatePlatformTenantProfile,
  type PlatformTenantDetail,
  type PlatformTenantPacks,
} from '@services/platformTenants'
import {
  fetchPlatformPlans,
  type PlatformCommercialPlan,
} from '@services/platformSettings'
import { normalizePackFlags, TENANT_PACK_META } from '@constants/entitlements'
import {
  matchPlanIdByPacks,
  optionalPacksFromFlags,
  type OptionalPacks,
} from '@constants/platformPlans'
import { formatDate } from '@utils/dateFormats'
import { PlatformShell } from './PlatformShell'
import { usePlatformSession } from './PlatformSessionContext'
import { platformApiError } from './platformApiError'

const FALLBACK_PACKS: OptionalPacks = {
  workforce: true,
  pay: false,
  psa: false,
  talent: false,
}

const OPTIONAL_PACKS = ['workforce', 'pay', 'psa', 'talent'] as const

function packsFromTenant(packs: unknown): PlatformTenantPacks {
  const n = normalizePackFlags(packs)
  return {
    workforce: n.workforce,
    pay: n.pay,
    psa: n.psa,
    talent: n.talent,
  }
}

function packsEqual(a: PlatformTenantPacks, b: PlatformTenantPacks): boolean {
  return (
    a.workforce === b.workforce && a.pay === b.pay && a.psa === b.psa && a.talent === b.talent
  )
}

export default function PlatformTenantDetailPage() {
  const { id = '' } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = usePlatformSession()
  const isAdmin = user?.platformRole === 'ADMIN'

  const [tenant, setTenant] = useState<PlatformTenantDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [commercialPlans, setCommercialPlans] = useState<PlatformCommercialPlan[]>([])
  const [draftPacks, setDraftPacks] = useState<PlatformTenantPacks>(() => ({ ...FALLBACK_PACKS }))
  const [planId, setPlanId] = useState<string>('custom')
  const [savingPacks, setSavingPacks] = useState(false)

  const planItems = useMemo(
    () => [
      ...commercialPlans.map((p) => ({
        value: p.id,
        label: p.isDefault ? `${p.name} (default)` : p.name,
      })),
      { value: 'custom', label: 'Custom packs' },
    ],
    [commercialPlans],
  )
  const [suspendOpen, setSuspendOpen] = useState(false)
  const [reactivateOpen, setReactivateOpen] = useState(false)
  const [resendSetupOpen, setResendSetupOpen] = useState(false)
  const [resendSetupBusy, setResendSetupBusy] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [profileBusy, setProfileBusy] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [profileForm, setProfileForm] = useState({
    name: '',
    address: '',
    gstNumber: '',
    panNo: '',
  })

  const resolvePlanId = useCallback(
    (packs: PlatformTenantPacks) => matchPlanIdByPacks(commercialPlans, packs) ?? 'custom',
    [commercialPlans],
  )

  const load = useCallback(async () => {
    if (!id) return
    setError(null)
    setLoading(true)
    try {
      const [next, plansRes] = await Promise.all([getPlatformTenant(id), fetchPlatformPlans()])
      const activePlans = plansRes.plans.filter((p) => p.isActive)
      setCommercialPlans(activePlans)
      setTenant(next)
      const nextPacks = packsFromTenant(next.packs)
      setDraftPacks(nextPacks)
      setPlanId(matchPlanIdByPacks(activePlans, nextPacks) ?? 'custom')
    } catch (err) {
      setTenant(null)
      setError(platformApiError(err))
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  const savedPacks = useMemo(() => packsFromTenant(tenant?.packs), [tenant?.packs])
  const packsDirty = tenant ? !packsEqual(draftPacks, savedPacks) : false
  const isSuspended = tenant?.status === 'SUSPENDED'

  const savePacks = async () => {
    if (!id || !packsDirty) return
    setSavingPacks(true)
    try {
      const result = await updatePlatformTenantPacks(id, draftPacks)
      setTenant((prev) => (prev ? { ...prev, packs: result.packs } : prev))
      const nextPacks = packsFromTenant(result.packs)
      setDraftPacks(nextPacks)
      setPlanId(resolvePlanId(nextPacks))
      toast.success('Packs updated')
    } catch (err) {
      toast.error(platformApiError(err))
      throw err
    } finally {
      setSavingPacks(false)
    }
  }

  function openProfile() {
    if (!tenant) return
    setProfileForm({
      name: tenant.name,
      address: tenant.address ?? '',
      gstNumber: tenant.gstNumber ?? '',
      panNo: tenant.panNo ?? '',
    })
    setProfileError(null)
    setProfileOpen(true)
  }

  async function onSaveProfile(e: FormEvent) {
    e.preventDefault()
    if (!id || !tenant) return
    setProfileBusy(true)
    setProfileError(null)
    try {
      const next = await updatePlatformTenantProfile(id, {
        name: profileForm.name.trim(),
        address: profileForm.address.trim() || null,
        gstNumber: profileForm.gstNumber.trim() || null,
        panNo: profileForm.panNo.trim() || null,
      })
      setTenant(next)
      toast.success('Organization updated')
      setProfileOpen(false)
    } catch (err) {
      setProfileError(platformApiError(err))
    } finally {
      setProfileBusy(false)
    }
  }

  const onSuspend = async () => {
    if (!id) return
    const next = await suspendPlatformTenant(id)
    setTenant(next)
    const nextPacks = packsFromTenant(next.packs)
    setDraftPacks(nextPacks)
    setPlanId(resolvePlanId(nextPacks))
    toast.success('Tenant suspended')
  }

  const onReactivate = async () => {
    if (!id) return
    const next = await reactivatePlatformTenant(id)
    setTenant(next)
    const nextPacks = packsFromTenant(next.packs)
    setDraftPacks(nextPacks)
    setPlanId(resolvePlanId(nextPacks))
    toast.success('Tenant reactivated')
  }

  const onResendOwnerSetup = async () => {
    if (!id) return
    setResendSetupBusy(true)
    try {
      const result = await resendOwnerPasswordSetup(id)
      const next = await getPlatformTenant(id)
      setTenant(next)
      toast.success(
        result.sentTo.length === 1
          ? `Setup mail sent to ${result.sentTo[0]}`
          : `Setup mail sent to ${result.sentTo.length} addresses`,
      )
    } catch (err) {
      toast.error(platformApiError(err))
      throw err
    } finally {
      setResendSetupBusy(false)
    }
  }

  return (
    <PlatformShell
      eyebrow="Tenants"
      title="Tenant"
      description={
        tenant
          ? `${tenant.name} — root customer organization. Sub-orgs belong to this family; HR runs in the tenant app.`
          : 'Root customer organization. Sub-orgs belong to this family; HR runs in the tenant app.'
      }
      actions={
        tenant && isAdmin ? (
          <div className="flex flex-wrap items-center gap-2">
            {tenant.ownerSetup?.canResendSetup && !isSuspended ? (
              <Button type="button" variant="outline" onClick={() => setResendSetupOpen(true)}>
                <Mail aria-hidden /> Resend Setup Mail
              </Button>
            ) : null}
            {isSuspended ? (
              <Button type="button" variant="outline" onClick={() => setReactivateOpen(true)}>
                <PlayCircle aria-hidden /> Reactivate
              </Button>
            ) : (
              <Button type="button" variant="destructive" onClick={() => setSuspendOpen(true)}>
                <PauseCircle aria-hidden /> Suspend
              </Button>
            )}
          </div>
        ) : (
          <Button type="button" variant="ghost" size="sm" onClick={() => navigate('/platform/tenants')}>
            <ArrowLeft aria-hidden /> Back
          </Button>
        )
      }
    >
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
          <Spinner className="size-5" aria-label="Loading tenant" /> Loading tenant…
        </div>
      ) : null}

      {error ? (
        <EmptyState
          variant="error"
          icon={<Building2 aria-hidden />}
          title="Could Not Load Tenant"
          description={error}
          action={
            <Button size="sm" variant="outline" onClick={() => void load()}>
              Retry
            </Button>
          }
        />
      ) : null}

      {!loading && !error && !tenant ? (
        <EmptyState
          icon={<Building2 aria-hidden />}
          title="Tenant Not Found"
          description="That id is not a root organization, or it was removed."
          action={
            <Button size="sm" nativeButton={false} render={<Link to="/platform/tenants" />}>
              <ArrowLeft aria-hidden /> Back To Tenants
            </Button>
          }
        />
      ) : null}

      {tenant ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Breadcrumb className="lg:col-span-2">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink render={<Link to="/platform/tenants" />}>Tenants</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{tenant.name}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          {isSuspended ? (
            <Alert variant="warning" className="lg:col-span-2">
              <AlertTitle>Tenant Suspended</AlertTitle>
              <AlertDescription>
                Sign-in and live API sessions are refused for this org family
                {tenant.suspendedAt ? ` since ${formatDate(tenant.suspendedAt)}` : ''}.
              </AlertDescription>
            </Alert>
          ) : null}

          <Card tone="blue">
            <CardHeader>
              <SectionHeader
                icon={<Building2 />}
                tone="blue"
                title="Organization"
                action={
                  isAdmin ? (
                    <Button type="button" size="sm" variant="outline" onClick={openProfile}>
                      <Pencil aria-hidden /> Edit
                    </Button>
                  ) : null
                }
              />
            </CardHeader>
            <CardContent>
              <DescriptionList
                rows={[
                  { label: 'Name', value: tenant.name },
                  {
                    label: 'Status',
                    value: isSuspended ? (
                      <Badge variant="warning" dot>
                        Suspended
                      </Badge>
                    ) : (
                      <Badge variant="success" dot>
                        Active
                      </Badge>
                    ),
                  },
                  { label: 'Owner contact', value: tenant.ownerContactEmail || '—' },
                  {
                    label: 'Owner password',
                    value: tenant.ownerSetup?.passwordSet ? (
                      <Badge variant="success" dot>
                        Set
                      </Badge>
                    ) : tenant.ownerSetup?.canResendSetup ? (
                      <Badge variant="warning" dot>
                        Pending setup
                      </Badge>
                    ) : (
                      <Badge variant="neutral" dot>
                        Unknown
                      </Badge>
                    ),
                  },
                  { label: 'Address', value: tenant.address || '—' },
                  { label: 'GST', value: tenant.gstNumber || '—' },
                  { label: 'PAN', value: tenant.panNo || '—' },
                  { label: 'Created', value: formatDate(tenant.createdAt) },
                  { label: 'Branches (root)', value: String(tenant.branchCount), strong: true },
                  { label: 'People (root)', value: String(tenant.employeeCount), strong: true },
                ]}
              />
            </CardContent>
          </Card>

          <Card tone="green">
            <CardHeader>
              <SectionHeader
                icon={<Package />}
                tone="green"
                title="Packs"
                description={
                  isAdmin
                    ? 'Core is always on. Save to apply pack changes on the root org.'
                    : 'Entitlements on the root org (ADMIN can edit).'
                }
              />
            </CardHeader>
            <CardContent>
              {isAdmin ? (
                <div className="space-y-4">
                  <Field>
                    <FieldLabel id="tenant-plan-label">Commercial Plan</FieldLabel>
                    <Select
                      items={planItems}
                      value={planId}
                      onValueChange={(v) => {
                        const next = String(v ?? 'custom')
                        setPlanId(next)
                        if (next === 'custom') return
                        const plan = commercialPlans.find((p) => p.id === next)
                        if (plan) setDraftPacks(optionalPacksFromFlags(plan.packs))
                      }}
                    >
                      <SelectTrigger className="w-full" aria-labelledby="tenant-plan-label">
                        <SelectValue placeholder="Select plan" />
                      </SelectTrigger>
                      <SelectContent>
                        {planItems.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <fieldset className="grid gap-3">
                    <legend className="sr-only">Module packs</legend>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <Checkbox checked disabled aria-label="Core always on" />
                      <span>
                        <span className="font-medium text-foreground">{TENANT_PACK_META.core.title}</span>
                        {' — always included'}
                      </span>
                    </div>
                    {OPTIONAL_PACKS.map((key) => (
                      <Label key={key} className="flex items-start gap-3 font-normal">
                        <Checkbox
                          checked={draftPacks[key]}
                          onCheckedChange={(v) => {
                            setPlanId('custom')
                            setDraftPacks((p) => ({ ...p, [key]: v === true }))
                          }}
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
                  <Button
                    type="button"
                    disabled={!packsDirty || savingPacks}
                    onClick={() => void savePacks()}
                  >
                    {savingPacks ? <Spinner className="size-4" aria-label="Saving" /> : null}
                    Save Packs
                  </Button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <Badge variant="success" dot>
                    Core
                  </Badge>
                  {OPTIONAL_PACKS.filter((k) => savedPacks[k]).map((key) => (
                    <Badge key={key} variant="info" dot>
                      {TENANT_PACK_META[key].title}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <SectionHeader
                icon={<Building2 />}
                tone="neutral"
                title="Sub-Organizations"
                description="Children of this root — managed inside the tenant app, not as separate platform tenants."
              />
            </CardHeader>
            <CardContent>
              {tenant.childOrganizations.length === 0 ? (
                <EmptyState
                  size="sm"
                  icon={<Building2 aria-hidden />}
                  title="No Sub-Organizations"
                  description="Children of this root are managed inside the tenant app."
                />
              ) : (
                <ItemGroup className="gap-0 divide-y divide-border">
                  {tenant.childOrganizations.map((child) => (
                    <Item key={child.id} size="sm" className="rounded-none border-0 px-0">
                      <ItemContent>
                        <ItemTitle>{child.name}</ItemTitle>
                        <ItemDescription className="font-mono">{child.id}</ItemDescription>
                      </ItemContent>
                    </Item>
                  ))}
                </ItemGroup>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      <FormDialog
        open={profileOpen}
        onOpenChange={setProfileOpen}
        title="Edit Organization"
        description="Root tenant profile fields. Packs and lifecycle stay on this page."
        icon={<Building2 aria-hidden />}
        formId="tenant-profile-form"
        submitLabel="Save Changes"
        submitting={profileBusy}
        dirty={Boolean(
          tenant &&
            (profileForm.name !== tenant.name ||
              profileForm.address !== (tenant.address ?? '') ||
              profileForm.gstNumber !== (tenant.gstNumber ?? '') ||
              profileForm.panNo !== (tenant.panNo ?? '')),
        )}
      >
        <form id="tenant-profile-form" className="grid gap-4 p-6" onSubmit={onSaveProfile} noValidate>
          {profileError ? (
            <Alert variant="danger">
              <AlertTitle>Could Not Save</AlertTitle>
              <AlertDescription>{profileError}</AlertDescription>
            </Alert>
          ) : null}
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="tenant-name">Name</FieldLabel>
              <Input
                id="tenant-name"
                required
                value={profileForm.name}
                onChange={(e) => setProfileForm((f) => ({ ...f, name: e.target.value }))}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="tenant-address">Address</FieldLabel>
              <Textarea
                id="tenant-address"
                rows={3}
                value={profileForm.address}
                onChange={(e) => setProfileForm((f) => ({ ...f, address: e.target.value }))}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="tenant-gst">GST</FieldLabel>
                <Input
                  id="tenant-gst"
                  value={profileForm.gstNumber}
                  onChange={(e) => setProfileForm((f) => ({ ...f, gstNumber: e.target.value }))}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="tenant-pan">PAN</FieldLabel>
                <Input
                  id="tenant-pan"
                  value={profileForm.panNo}
                  onChange={(e) => setProfileForm((f) => ({ ...f, panNo: e.target.value }))}
                />
              </Field>
            </div>
          </FieldGroup>
        </form>
      </FormDialog>

      <ConfirmDialog
        open={suspendOpen}
        onOpenChange={setSuspendOpen}
        variant="warning"
        danger
        title={`Suspend ${tenant?.name ?? 'tenant'}?`}
        description="People in this org family will be refused sign-in and live API sessions until you reactivate."
        confirmLabel="Suspend tenant"
        onConfirm={onSuspend}
      />
      <ConfirmDialog
        open={reactivateOpen}
        onOpenChange={setReactivateOpen}
        variant="confirm"
        title={`Reactivate ${tenant?.name ?? 'tenant'}?`}
        description="Sign-in and API access resume for this org family."
        confirmLabel="Reactivate tenant"
        onConfirm={onReactivate}
      />
      <ConfirmDialog
        open={resendSetupOpen}
        onOpenChange={setResendSetupOpen}
        variant="confirm"
        title="Resend Owner password-setup email?"
        description={
          tenant?.ownerContactEmail
            ? `Sends a fresh 24-hour setup link to the Owner (${tenant.ownerContactEmail}${
                tenant.ownerSetup?.workEmail &&
                tenant.ownerSetup.workEmail !== tenant.ownerContactEmail
                  ? ` / ${tenant.ownerSetup.workEmail}`
                  : ''
              }). Limited to 3 sends per day with a 10-minute cooldown.`
            : 'Sends a fresh 24-hour setup link to the Owner work and recovery inboxes. Limited to 3 sends per day with a 10-minute cooldown.'
        }
        confirmLabel={resendSetupBusy ? 'Sending…' : 'Send setup mail'}
        onConfirm={onResendOwnerSetup}
      />
    </PlatformShell>
  )
}
