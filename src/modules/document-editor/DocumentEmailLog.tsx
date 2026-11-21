import React from "react";
import { CircleX, Send } from "lucide-react";
import { EmptyState } from "@/ds/patterns/empty-state";
import { IconBox } from "@/ds/patterns/icon-box";
import { formatDateTime } from "@utils/dateFormats";

/**
 * Every email a document has been sent in, newest first: who it went to, when, and whether it got there. A failed
 * send keeps its error under it — that is the line someone needs when the client says "we never got it".
 */

export interface DocumentEmailEntry {
  id: string;
  toAddresses: string;
  subject: string;
  status: string;
  sentAt: string;
  error?: string | null;
}

const DocumentEmailLog: React.FC<{
  entries: DocumentEmailEntry[];
  /** The document kind's own status chip (billing: `BillingStatusBadge`). */
  renderStatus?: (status: string) => React.ReactNode;
}> = ({ entries, renderStatus }) => {
  if (!entries.length) {
    return (
      <EmptyState
        size="sm"
        title="Nothing sent yet"
        description="Emails you send from here are listed with who received them and when."
      />
    );
  }
  return (
    <div className="flex flex-col gap-2">
      {entries.map((entry) => {
        const failed = !!entry.error;
        return (
          <div key={entry.id} className="flex items-start gap-3 rounded-xl border border-border p-3">
            <IconBox size="sm" tone={failed ? "rose" : "blue"} icon={failed ? <CircleX /> : <Send />} />
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">{entry.subject}</span>
                {renderStatus?.(entry.status)}
              </div>
              <p className="m-0 text-xs break-words text-muted-foreground">To {entry.toAddresses}</p>
              <p className="m-0 text-[11.5px] text-muted-foreground">{formatDateTime(entry.sentAt)}</p>
              {failed && <p className="m-0 mt-0.5 text-[11.5px] text-destructive">{entry.error}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default DocumentEmailLog;
