import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { Copy, MoreHorizontal, UserPlus } from 'lucide-react'
import { Button } from '@/ds/ui/button'
import { Badge } from '@/ds/ui/badge'
import { Input } from '@/ds/ui/input'
import { Field, FieldGroup, FieldLabel } from '@/ds/ui/field'
import { Alert, AlertDescription, AlertTitle } from '@/ds/ui/alert'
import { Spinner } from '@/ds/ui/spinner'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/ds/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/ds/ui/dropdown-menu'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ds/ui/select'
import { EmptyState } from '@/ds/patterns/empty-state'
import { DataTable, type ColumnDef } from '@/ds/patterns/data-table'
import {
  disablePlatformOperator,
  invitePlatformOperator,
  listPlatformOperators,
  resendPlatformInvite,
  type PlatformInviteResult,
  type PlatformOperator,
} from '@services/platformAuth'
import { PlatformShell } from './PlatformShell'
import { usePlatformSession } from './PlatformSessionContext'

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

function errMessage(err: unknown): string {
  const ax = err as { response?: { data?: { detail?: string; message?: string } }; message?: string }
  return (
    ax.response?.data?.detail ||
    (ax.response?.data?.message && ax.response.data.message !== 'Forbidden' ? ax.response.data.message : '') ||
    ax.message ||
    'Something went wrong'
  )
}

function formatWhen(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

/** Platform operators — invite links, resend, disable. */
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

  const [disableTarget, setDisableTarget] = useState<PlatformOperator | null>(null)
  const [disableBusy, setDisableBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setListError(null)
    setLoading(true)
    try {
      setRows(await listPlatformOperators())
    } catch (err) {
      setListError(errMessage(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const acceptUrl = useMemo(() => {
    if (!inviteResult) return ''
    return `${window.location.origin}${inviteResult.acceptPath}`
  }, [inviteResult])

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
      await refresh()
    } catch (err) {
      setInviteError(errMessage(err))
    } finally {
      setInviteBusy(false)
    }
  }

  const onResend = useCallback(
    async (op: PlatformOperator) => {
      setActionError(null)
      try {
        const result = await resendPlatformInvite(op.id)
        setInviteResult(result)
        setInviteOpen(true)
        setCopied(false)
        await refresh()
      } catch (err) {
        setActionError(errMessage(err))
      }
    },
    [refresh],
  )

  async function onConfirmDisable() {
    if (!disableTarget) return
    setDisableBusy(true)
    setActionError(null)
    try {
      await disablePlatformOperator(disableTarget.id)
      setDisableTarget(null)
      await refresh()
    } catch (err) {
      setActionError(errMessage(err))
    } finally {
      setDisableBusy(false)
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
          return (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={<Button variant="ghost" size="icon-sm" aria-label={`Actions for ${op.displayName}`} />}
              >
                <MoreHorizontal aria-hidden />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {op.status === 'INVITED' ? (
                  <DropdownMenuItem onClick={() => void onResend(op)}>Resend Invite</DropdownMenuItem>
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
      description="Invite KAIZNOVA staff with a one-time link — they set their own password and enrol MFA."
      actions={
        isAdmin ? (
          <Button
            type="button"
            onClick={() => {
              setInviteOpen(true)
              setInviteResult(null)
              setInviteError(null)
              setEmail('')
              setDisplayName('')
              setRole('DEVELOPER')
              setCopied(false)
            }}
          >
            <UserPlus aria-hidden /> Invite Operator
          </Button>
        ) : null
      }
    >
      {listError ? (
        <Alert variant="danger">
          <AlertTitle>Could Not Load Operators</AlertTitle>
          <AlertDescription>{listError}</AlertDescription>
        </Alert>
      ) : null}
      {actionError ? (
        <Alert variant="danger">
          <AlertTitle>Action Failed</AlertTitle>
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      ) : null}

      {!loading && rows.length === 0 ? (
        <EmptyState
          icon={<UserPlus aria-hidden />}
          title="No Operators Yet"
          description="Create the first platform ADMIN with the CLI break-glass script, enrol MFA, then invite the rest from here."
          action={
            isAdmin ? (
              <Button size="sm" onClick={() => setInviteOpen(true)}>
                <UserPlus aria-hidden /> Invite Operator
              </Button>
            ) : undefined
          }
        />
      ) : (
        <DataTable
          caption="Platform Operators"
          columns={columns}
          data={rows}
          getRowId={(r) => r.id}
          loading={loading}
          searchPlaceholder="Search operators"
        />
      )}

      <Dialog
        open={inviteOpen}
        onOpenChange={(open) => {
          setInviteOpen(open)
          if (!open) {
            setInviteResult(null)
            setInviteError(null)
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{inviteResult ? 'Invite Link Ready' : 'Invite Operator'}</DialogTitle>
            <DialogDescription>
              {inviteResult
                ? 'Copy this link once and share it out of band. It expires and cannot be shown again.'
                : 'They will open the link, choose a password, then enrol an authenticator.'}
            </DialogDescription>
          </DialogHeader>

          {inviteResult ? (
            <div className="grid gap-4">
              <Alert variant="warning">
                <AlertTitle>Shown Once</AlertTitle>
                <AlertDescription>If you close without copying, use Resend Invite on their row.</AlertDescription>
              </Alert>
              <Field>
                <FieldLabel htmlFor="accept-url">Accept Link</FieldLabel>
                <div className="flex gap-2">
                  <Input id="accept-url" readOnly value={acceptUrl} className="font-mono text-xs" />
                  <Button
                    type="button"
                    variant="outline"
                    aria-label="Copy accept link"
                    onClick={() => {
                      void navigator.clipboard.writeText(acceptUrl).then(() => setCopied(true))
                    }}
                  >
                    <Copy aria-hidden /> {copied ? 'Copied' : 'Copy'}
                  </Button>
                </div>
              </Field>
              <p className="text-sm text-muted-foreground">Expires {formatWhen(inviteResult.expiresAt)}</p>
              <DialogFooter>
                <DialogClose render={<Button variant="outline" />}>Done</DialogClose>
              </DialogFooter>
            </div>
          ) : (
            <form className="grid gap-4" onSubmit={onInvite} noValidate>
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
              <DialogFooter>
                <DialogClose render={<Button type="button" variant="outline" disabled={inviteBusy} />}>
                  Cancel
                </DialogClose>
                <Button type="submit" disabled={inviteBusy}>
                  {inviteBusy ? <Spinner data-icon="inline-start" aria-hidden /> : null}
                  Create Invite
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(disableTarget)} onOpenChange={(open) => !open && setDisableTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Disable Operator?</DialogTitle>
            <DialogDescription>
              {disableTarget
                ? `${disableTarget.displayName} (${disableTarget.email}) will lose platform access immediately.`
                : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" disabled={disableBusy} />}>
              Keep Active
            </DialogClose>
            <Button type="button" variant="destructive" disabled={disableBusy} onClick={() => void onConfirmDisable()}>
              {disableBusy ? <Spinner data-icon="inline-start" aria-hidden /> : null}
              Disable
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PlatformShell>
  )
}
