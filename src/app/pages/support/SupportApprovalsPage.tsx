import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Headset } from 'lucide-react'
import { Button } from '@/ds/ui/button'
import { Badge } from '@/ds/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/ds/ui/alert'
import { Card, CardContent, CardHeader } from '@/ds/ui/card'
import { Spinner } from '@/ds/ui/spinner'
import { EmptyState } from '@/ds/patterns/empty-state'
import { SectionHeader } from '@/ds/patterns/section-header'
import {
  decideSupportSession,
  listPendingSupportSessions,
  type PlatformSupportSession,
} from '@services/platformSupport'

function errMessage(err: unknown): string {
  const ax = err as { response?: { data?: { detail?: string; message?: string } }; message?: string }
  return (
    ax.response?.data?.detail ||
    (ax.response?.data?.message && ax.response.data.message !== 'Forbidden' ? ax.response.data.message : '') ||
    ax.message ||
    'Something went wrong'
  )
}

/** Tenant Admin approvals for KAIZNOVA platform support requests. */
export default function SupportApprovalsPage() {
  const [rows, setRows] = useState<PlatformSupportSession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setError(null)
    setLoading(true)
    try {
      setRows(await listPendingSupportSessions())
    } catch (err) {
      setError(errMessage(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  async function decide(id: string, approve: boolean) {
    setBusyId(id)
    try {
      await decideSupportSession(id, approve)
      toast.success(approve ? 'Approved' : 'Rejected')
      await refresh()
    } catch (err) {
      toast.error(errMessage(err))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 sm:p-6">
      <SectionHeader
        icon={<Headset />}
        tone="warning"
        title="Support Approvals"
        description="Approve or reject KAIZNOVA operator access to your organization (read-only)."
      />

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner className="size-5" aria-label="Loading" /> Loading…
        </div>
      ) : null}

      {error ? (
        <Alert variant="danger">
          <AlertTitle>Could Not Load</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {!loading && !error && rows.length === 0 ? (
        <EmptyState
          icon={<Headset aria-hidden />}
          title="No Pending Requests"
          description="When a KAIZNOVA operator asks for support access, it will appear here."
        />
      ) : null}

      <div className="grid gap-3">
        {rows.map((s) => (
          <Card key={s.id} tone="amber">
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
              <div className="space-y-1">
                <p className="font-medium text-foreground">{s.reason}</p>
                <p className="text-xs text-muted-foreground">
                  {s.durationMinutes} min · requested {new Date(s.createdAt).toLocaleString()}
                </p>
              </div>
              {s.breakGlass ? (
                <Badge variant="danger" dot>
                  Break-glass
                </Badge>
              ) : (
                <Badge variant="warning" dot>
                  Pending
                </Badge>
              )}
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                disabled={busyId === s.id}
                onClick={() => void decide(s.id, true)}
              >
                {busyId === s.id ? <Spinner className="size-4" aria-hidden /> : null}
                Approve
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={busyId === s.id}
                onClick={() => void decide(s.id, false)}
              >
                Reject
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
