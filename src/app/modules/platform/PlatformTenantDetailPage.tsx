import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, Building2, Package, PauseCircle, PlayCircle } from 'lucide-react'
import { Button } from '@/ds/ui/button'
import { Badge } from '@/ds/ui/badge'
import { Card, CardContent, CardHeader } from '@/ds/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/ds/ui/alert'
import { Spinner } from '@/ds/ui/spinner'
import { Checkbox } from '@/ds/ui/checkbox'
import { Label } from '@/ds/ui/label'
import { SectionHeader } from '@/ds/patterns/section-header'
import { DescriptionList } from '@/ds/patterns/description-list'
import { EmptyState } from '@/ds/patterns/empty-state'
import { ConfirmDialog } from '@/ds/patterns/confirm-dialog'
import {
  getPlatformTenant,
  reactivatePlatformTenant,
  suspendPlatformTenant,
  updatePlatformTenantPacks,
  type PlatformTenantDetail,
  type PlatformTenantPacks,
} from '@services/platformTenants'
import { normalizePackFlags, TENANT_PACK_META } from '@constants/entitlements'
import { formatDate } from '@utils/dateFormats'
import { PlatformShell } from './PlatformShell'
import { usePlatformSession } from './PlatformSessionContext'

function errMessage(err: unknown): string {
  const ax = err as { response?: { data?: { detail?: string; message?: string } }; message?: string }
  return (
    ax.response?.data?.detail ||
    (ax.response?.data?.message && ax.response.data.message !== 'Forbidden' ? ax.response.data.message : '') ||
    ax.message ||
    'Something went wrong'
  )
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
  const [draftPacks, setDraftPacks] = useState<PlatformTenantPacks>({
    workforce: true,
    pay: true,
    psa: true,
    talent: true,
  })
  const [savingPacks, setSavingPacks] = useState(false)
  const [suspendOpen, setSuspendOpen] = useState(false)
  const [reactivateOpen, setReactivateOpen] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    setError(null)
    setLoading(true)
    try {
      const next = await getPlatformTenant(id)
      setTenant(next)
      setDraftPacks(packsFromTenant(next.packs))
    } catch (err) {
      setTenant(null)
      setError(errMessage(err))
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
      setDraftPacks(packsFromTenant(result.packs))
      toast.success('Packs updated')
    } catch (err) {
      toast.error(errMessage(err))
      throw err
    } finally {
      setSavingPacks(false)
    }
  }

  const onSuspend = async () => {
    if (!id) return
    const next = await suspendPlatformTenant(id)
    setTenant(next)
    setDraftPacks(packsFromTenant(next.packs))
    toast.success('Tenant suspended')
  }

  const onReactivate = async () => {
    if (!id) return
    const next = await reactivatePlatformTenant(id)
    setTenant(next)
    setDraftPacks(packsFromTenant(next.packs))
    toast.success('Tenant reactivated')
  }

  return (
    <PlatformShell
      title={tenant?.name ?? 'Tenant'}
      description="Root customer tenant. Sub-orgs below belong to this family; HR runs in the tenant app."
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {tenant && isAdmin ? (
            isSuspended ? (
              <Button type="button" variant="outline" onClick={() => setReactivateOpen(true)}>
                <PlayCircle aria-hidden /> Reactivate
              </Button>
            ) : (
              <Button type="button" variant="destructive" onClick={() => setSuspendOpen(true)}>
                <PauseCircle aria-hidden /> Suspend
              </Button>
            )
          ) : null}
          <Button type="button" variant="outline" onClick={() => navigate('/platform/tenants')}>
            <ArrowLeft aria-hidden /> Back To Tenants
          </Button>
        </div>
      }
    >
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
          <Spinner className="size-5" aria-label="Loading tenant" /> Loading tenant…
        </div>
      ) : null}

      {error ? (
        <Alert variant="danger">
          <AlertTitle>Could Not Load Tenant</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {!loading && !error && !tenant ? (
        <EmptyState
          icon={<Building2 aria-hidden />}
          title="Tenant Not Found"
          description="That id is not a root organization, or it was removed."
          action={
            <Button size="sm" render={<Link to="/platform/tenants" />}>
              <ArrowLeft aria-hidden /> Back To Tenants
            </Button>
          }
        />
      ) : null}

      {tenant ? (
        <div className="grid gap-4 lg:grid-cols-2">
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
              <SectionHeader icon={<Building2 />} tone="blue" title="Organization" />
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
                          onCheckedChange={(v) =>
                            setDraftPacks((p) => ({ ...p, [key]: v === true }))
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
                <p className="text-sm text-muted-foreground">No sub-organizations under this root.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {tenant.childOrganizations.map((child) => (
                    <li key={child.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                      <span className="font-medium text-foreground">{child.name}</span>
                      <span className="font-mono text-xs text-muted-foreground">{child.id}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

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
    </PlatformShell>
  )
}
