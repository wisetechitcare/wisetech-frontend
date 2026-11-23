import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Copy, MoreHorizontal, Pencil, UserPlus } from 'lucide-react'
import { Button } from '@/ds/ui/button'
import { Badge } from '@/ds/ui/badge'
import { Input } from '@/ds/ui/input'
import { Field, FieldGroup, FieldLabel } from '@/ds/ui/field'
import { Alert, AlertDescription, AlertTitle } from '@/ds/ui/alert'
import { Spinner } from '@/ds/ui/spinner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/ds/ui/dropdown-menu'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ds/ui/select'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ds/ui/tooltip'
import { EmptyState } from '@/ds/patterns/empty-state'
import { DataTable, type ColumnDef } from '@/ds/patterns/data-table'
import { FormDialog } from '@/ds/patterns/form-dialog'
import { ConfirmDialog } from '@/ds/patterns/confirm-dialog'
import {
  disablePlatformOperator,
  enablePlatformOperator,
  invitePlatformOperator,
  listPlatformOperators,
  resendPlatformInvite,
  updatePlatformOperator,
  type PlatformInviteResult,
  type PlatformOperator,
} from '@services/platformAuth'
import { PlatformShell } from './PlatformShell'
import { usePlatformSession } from './PlatformSessionContext'
import { platformApiError } from './platformApiError'

const ROLE_ITEMS = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'DEVELOPER', label: 'Developer' },
  { value: 'SUPPORT', label: 'Support' },
  { value: 'BILLING', label: 'Billing' },
]

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
  ACTIVE: 'success',
  INVITED: 'warning',
  DISABLED: 'danger',
}

function formatWhen(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

/** Platform operators — invite, edit role/name, resend, disable / re-enable. */
export default function PlatformHomePage() {
  const { user } = usePlatformSession()
  const isAdmin = user?.platformRole === 'ADMIN'

  const [rows, setRows] = useState<PlatformOperator[]>([])
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)

  const [inviteOpen, setInviteOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [role, setRole] = useState('DEVELOPER')
  const [inviteBusy, setInviteBusy] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteResult, setInviteResult] = useState<PlatformInviteResult | null>(null)
  const [copied, setCopied] = useState(false)

  const [editTarget, setEditTarget] = useState<PlatformOperator | null>(null)
  const [editName, setEditName] = useState('')
  const [editRole, setEditRole] = useState('DEVELOPER')
  const [editBusy, setEditBusy] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  const [disableTarget, setDisableTarget] = useState<PlatformOperator | null>(null)

  const refresh = useCallback(async () => {
    setListError(null)
    setLoading(true)
    try {
      setRows(await listPlatformOperators())
    } catch (err) {
      setListError(platformApiError(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const acceptUrl = useMemo(() => {
    if (!inviteResult) return ''
    return inviteResult.acceptUrl || `${window.location.origin}${inviteResult.acceptPath}`
  }, [inviteResult])

  function openInvite() {
    setInviteOpen(true)
    setInviteResult(null)
    setInviteError(null)
    setEmail('')
    setDisplayName('')
    setRole('DEVELOPER')
    setCopied(false)
  }

  async function onInvite(e: FormEvent) {
    e.preventDefault()
    setInviteError(null)
    setInviteBusy(true)
    try {
      const result = await invitePlatformOperator({
        email: email.trim(),
        displayName: displayName.trim(),
        role,
      })
      setInviteResult(result)
      setCopied(false)
      toast.success(result.emailSent ? 'Invite sent' : 'Invite created')
      await refresh()
    } catch (err) {
      setInviteError(platformApiError(err))
    } finally {
      setInviteBusy(false)
    }
  }

  const onResend = useCallback(
    async (op: PlatformOperator) => {
      try {
        const result = await resendPlatformInvite(op.id)
        setInviteResult(result)
        setInviteOpen(true)
        setCopied(false)
        toast.success(result.emailSent ? 'Invite resent' : 'Invite refreshed')
        await refresh()
      } catch (err) {
        toast.error(platformApiError(err))
      }
    },
    [refresh],
  )

  function openEdit(op: PlatformOperator) {
    setEditTarget(op)
    setEditName(op.displayName)
    setEditRole(op.platformRole)
    setEditError(null)
  }

  async function onEdit(e: FormEvent) {
    e.preventDefault()
    if (!editTarget) return
    setEditBusy(true)
    setEditError(null)
    try {
      await updatePlatformOperator(editTarget.id, {
        displayName: editName.trim(),
        role: editRole,
      })
      toast.success('Operator updated')
      setEditTarget(null)
      await refresh()
    } catch (err) {
      setEditError(platformApiError(err))
    } finally {
      setEditBusy(false)
    }
  }

  async function onConfirmDisable() {
    if (!disableTarget) return
    try {
      await disablePlatformOperator(disableTarget.id)
      toast.success('Operator disabled')
      setDisableTarget(null)
      await refresh()
    } catch (err) {
      toast.error(platformApiError(err))
      throw err
    }
  }

  async function onEnable(op: PlatformOperator) {
    try {
      await enablePlatformOperator(op.id)
      toast.success('Operator re-enabled')
      await refresh()
    } catch (err) {
      toast.error(platformApiError(err))
    }
  }

  const columns = useMemo<ColumnDef<PlatformOperator>[]>(
    () => [
      {
        accessorKey: 'displayName',
        meta: { label: 'Name' },
        header: 'Name',
        cell: ({ row }) => (
          <div className="min-w-0">
            <div className="truncate font-medium text-foreground">{row.original.displayName}</div>
            <div className="truncate text-xs text-muted-foreground">{row.original.email}</div>
          </div>
        ),
      },
      {
        accessorKey: 'platformRole',
        meta: { label: 'Role' },
        header: 'Role',
        cell: ({ getValue }) => <Badge variant="neutral">{String(getValue())}</Badge>,
      },
      {
        accessorKey: 'status',
        meta: { label: 'Status' },
        header: 'Status',
        cell: ({ row }) => {
          const s = row.original.status
          return (
            <Badge variant={STATUS_VARIANT[s] ?? 'neutral'} dot>
              {s}
            </Badge>
          )
        },
      },
      {
        id: 'inviteExpiresAt',
        meta: { label: 'Invite Expires' },
        header: 'Invite Expires',
        cell: ({ row }) => (
          <span className="tabular text-muted-foreground">{formatWhen(row.original.inviteExpiresAt)}</span>
        ),
      },
      {
        id: 'lastLoginAt',
        meta: { label: 'Last Sign In' },
        header: 'Last Sign In',
        cell: ({ row }) => (
          <span className="tabular text-muted-foreground">{formatWhen(row.original.lastLoginAt)}</span>
        ),
      },
      {
        id: 'actions',
        enableHiding: false,
        header: 'Actions',
        cell: ({ row }) => {
          const op = row.original
          if (!isAdmin) return null
          const isSelf = op.id === user?.id
          const label = `Actions for ${op.displayName}`
          return (
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <DropdownMenuTrigger
                      render={<Button variant="ghost" size="icon-sm" aria-label={label} />}
                    />
                  }
                >
                  <MoreHorizontal aria-hidden />
                </TooltipTrigger>
                <TooltipContent>{label}</TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="end">
                {op.status !== 'DISABLED' ? (
                  <DropdownMenuItem onClick={() => openEdit(op)}>
                    <Pencil aria-hidden /> Edit
                  </DropdownMenuItem>
                ) : null}
                {op.status === 'INVITED' ? (
                  <DropdownMenuItem onClick={() => void onResend(op)}>Resend Invite</DropdownMenuItem>
                ) : null}
                {op.status === 'DISABLED' && !isSelf ? (
                  <DropdownMenuItem onClick={() => void onEnable(op)}>Re-enable</DropdownMenuItem>
                ) : null}
                {!isSelf && op.status !== 'DISABLED' ? (
                  <DropdownMenuItem variant="destructive" onClick={() => setDisableTarget(op)}>
                    Disable
                  </DropdownMenuItem>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          )
        },
      },
    ],
    [isAdmin, onResend, user?.id],
  )

  return (
    <PlatformShell
      title="Operators"
      description="Invite KAIZNOVA staff by email — they set their own password and enrol MFA."
      actions={
        isAdmin ? (
          <Button type="button" onClick={openInvite}>
            <UserPlus aria-hidden /> Invite Operator
          </Button>
        ) : null
      }
    >
      {listError ? (
        <EmptyState
          variant="error"
          title="Could Not Load Operators"
          description={listError}
          action={
            <Button size="sm" onClick={() => void refresh()}>
              Retry
            </Button>
          }
        />
      ) : null}

      {!listError && !loading && rows.length === 0 ? (
        <EmptyState
          icon={<UserPlus aria-hidden />}
          title="No Operators Yet"
          description="Create the first platform ADMIN with the CLI break-glass script, enrol MFA, then invite the rest from here."
          action={
            isAdmin ? (
              <Button size="sm" onClick={openInvite}>
                <UserPlus aria-hidden /> Invite Operator
              </Button>
            ) : undefined
          }
        />
      ) : null}

      {!listError && (loading || rows.length > 0) ? (
        <DataTable
          caption="Platform Operators"
          columns={columns}
          data={rows}
          getRowId={(r) => r.id}
          loading={loading}
          searchPlaceholder="Search operators"
        />
      ) : null}

      <FormDialog
        open={inviteOpen}
        onOpenChange={(open) => {
          setInviteOpen(open)
          if (!open) {
            setInviteResult(null)
            setInviteError(null)
          }
        }}
        title={inviteResult ? 'Invite Sent' : 'Invite Operator'}
        description={
          inviteResult
            ? inviteResult.emailSent
              ? `Email sent to ${inviteResult.user.email}. You can still copy the link as a backup.`
              : 'Invite created, but email could not be sent. Copy the link and share it out of band.'
            : 'They will open the email link, choose a password, then enrol an authenticator.'
        }
        icon={<UserPlus aria-hidden />}
        formId={inviteResult ? undefined : 'invite-operator-form'}
        submitLabel="Create Invite"
        submitting={inviteBusy}
        dirty={!inviteResult && Boolean(email || displayName)}
      >
        <div className="grid gap-4 p-6">
          {inviteResult ? (
            <>
              {inviteResult.emailSent ? (
                <Alert variant="success">
                  <AlertTitle>Email Queued</AlertTitle>
                  <AlertDescription>
                    If they do not see it, use Resend Invite or copy the backup link below.
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert variant="warning">
                  <AlertTitle>Email Not Sent</AlertTitle>
                  <AlertDescription>Copy this link once. Resend Invite retries email delivery.</AlertDescription>
                </Alert>
              )}
              <Field>
                <FieldLabel htmlFor="accept-url">Backup Accept Link</FieldLabel>
                <div className="flex gap-2">
                  <Input id="accept-url" readOnly value={acceptUrl} className="font-mono text-xs" />
                  <Button
                    type="button"
                    variant="outline"
                    aria-label="Copy accept link"
                    onClick={() => {
                      void navigator.clipboard.writeText(acceptUrl).then(() => {
                        setCopied(true)
                        toast.success('Link copied')
                      })
                    }}
                  >
                    <Copy aria-hidden /> {copied ? 'Copied' : 'Copy'}
                  </Button>
                </div>
              </Field>
              <p className="text-sm text-muted-foreground">Expires {formatWhen(inviteResult.expiresAt)}</p>
            </>
          ) : (
            <form id="invite-operator-form" className="grid gap-4" onSubmit={onInvite} noValidate>
              {inviteError ? (
                <Alert variant="danger">
                  <AlertTitle>Could Not Invite</AlertTitle>
                  <AlertDescription>{inviteError}</AlertDescription>
                </Alert>
              ) : null}
              <FieldGroup className="gap-4">
                <Field>
                  <FieldLabel htmlFor="invite-email">Email</FieldLabel>
                  <Input
                    id="invite-email"
                    type="email"
                    autoComplete="off"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="invite-name">Display Name</FieldLabel>
                  <Input
                    id="invite-name"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel id="invite-role-label">Role</FieldLabel>
                  <Select items={ROLE_ITEMS} value={role} onValueChange={(v) => setRole(String(v ?? 'DEVELOPER'))}>
                    <SelectTrigger className="w-full" aria-labelledby="invite-role-label">
                      <SelectValue placeholder="Choose a role" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLE_ITEMS.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </FieldGroup>
            </form>
          )}
        </div>
      </FormDialog>

      <FormDialog
        open={Boolean(editTarget)}
        onOpenChange={(open) => {
          if (!open) setEditTarget(null)
        }}
        title="Edit Operator"
        description={editTarget?.email}
        icon={<Pencil aria-hidden />}
        formId="edit-operator-form"
        submitLabel="Save Changes"
        submitting={editBusy}
        dirty={Boolean(
          editTarget && (editName !== editTarget.displayName || editRole !== editTarget.platformRole),
        )}
      >
        <form id="edit-operator-form" className="grid gap-4 p-6" onSubmit={onEdit} noValidate>
          {editError ? (
            <Alert variant="danger">
              <AlertTitle>Could Not Save</AlertTitle>
              <AlertDescription>{editError}</AlertDescription>
            </Alert>
          ) : null}
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="edit-name">Display Name</FieldLabel>
              <Input
                id="edit-name"
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel id="edit-role-label">Role</FieldLabel>
              <Select items={ROLE_ITEMS} value={editRole} onValueChange={(v) => setEditRole(String(v ?? 'DEVELOPER'))}>
                <SelectTrigger className="w-full" aria-labelledby="edit-role-label">
                  <SelectValue placeholder="Choose a role" />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_ITEMS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </FieldGroup>
        </form>
      </FormDialog>

      <ConfirmDialog
        open={Boolean(disableTarget)}
        onOpenChange={(open) => {
          if (!open) setDisableTarget(null)
        }}
        variant="warning"
        danger
        title="Disable this operator?"
        description={
          disableTarget
            ? `${disableTarget.displayName} (${disableTarget.email}) will lose platform access immediately.`
            : undefined
        }
        confirmLabel="Disable"
        onConfirm={() => onConfirmDisable()}
      />
    </PlatformShell>
  )
}
