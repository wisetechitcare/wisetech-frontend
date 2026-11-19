import { History } from "lucide-react"

import { EmptyState } from "@/ds/patterns/empty-state"
import { Badge } from "@/ds/ui/badge"
import { Item, ItemContent, ItemDescription, ItemGroup, ItemTitle } from "@/ds/ui/item"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/ds/ui/sheet"

import type { IBiometricDevice } from "@/models/biometric"
import { useOrganizationStore } from "@/ds/prototypes/hooks/organization"
import { SYNC_STATUS_META, SYNC_TRIGGER_LABEL } from "@/ds/prototypes/constants/organization/organization"
import { formatDate, formatRelative, plural } from "@/ds/prototypes/utils/common/format"

interface DeviceHistorySheetProps {
  device: IBiometricDevice | null
  onOpenChange: (open: boolean) => void
}

/** The device's recent syncs, newest first, in a side panel so the device table stays in view. */
export function DeviceHistorySheet({ device, onOpenChange }: DeviceHistorySheetProps) {
  const { syncLogs, now } = useOrganizationStore()
  const logs = syncLogs.filter((l) => l.deviceId === device?.id).sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt))

  return (
    <Sheet open={!!device} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Sync history</SheetTitle>
          <SheetDescription>{device?.name}</SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-4">
          {logs.length > 0 && (
            <ItemGroup>
              {logs.map((log) => (
                <Item key={log.id} role="listitem" size="sm" variant="outline">
                  <ItemContent>
                    <ItemTitle>
                      <Badge variant={SYNC_STATUS_META[log.status].variant} dot>
                        {SYNC_STATUS_META[log.status].label}
                      </Badge>
                      <span className="tabular">{log.recordCount === null ? "No records" : plural(log.recordCount, "punch", "punches")}</span>
                    </ItemTitle>
                    <ItemDescription>
                      {SYNC_TRIGGER_LABEL[log.triggeredBy]} · {formatRelative(log.startedAt, now)} · {formatDate(log.startedAt)}
                    </ItemDescription>
                    {log.errorMessage && <p className="text-xs text-destructive-foreground">{log.errorMessage}</p>}
                  </ItemContent>
                </Item>
              ))}
            </ItemGroup>
          )}
          {!logs.length && <EmptyState size="sm" icon={<History />} title="No syncs yet" description="Syncs appear here once the device sends or is polled." />}
        </div>
      </SheetContent>
    </Sheet>
  )
}
