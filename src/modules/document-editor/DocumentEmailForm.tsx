import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Check, CircleCheck, FileDown, Info, Pencil, Plus, Send } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/ds/ui/tooltip";
import { Alert, AlertDescription } from "@/ds/ui/alert";
import { Button } from "@/ds/ui/button";
import { Field, FieldLabel } from "@/ds/ui/field";
import { Input } from "@/ds/ui/input";
import { Textarea } from "@/ds/ui/textarea";
import { toast } from "@app/modules/common/components/ui";
import { emailDocument } from "@services/documents";

/**
 * Send a published document to its recipient, with the PDF attached. Lives where a published document is managed
 * (the document's detail page) — the editor only ever holds drafts, which cannot be emailed.
 *
 * Kept compact on purpose: no step headings or helper lines (the placeholders carry the hints), Cc and the
 * "use the client's address" shortcut sit on the To label's row, and the attachment is one slim line. A draft shows
 * the form (so it can be prepared) with the reason Send is off stated above it.
 */

export interface DocumentEmailFormProps {
  documentId: string;
  /** Placeholder subject, e.g. "Proforma WA/PROFORMA/26-27/2". */
  defaultSubject: string;
  /** "client", "candidate"… */
  recipient?: string;
  /**
   * Addresses on file, offered as one-click chips under To — click adds, click again removes. Typing any other
   * address still works; these only save looking one up.
   */
  suggestions?: { email: string; name: string; kind: string; also?: string[] }[];
  /** What the attached PDF is, e.g. the document number. Defaults to the subject placeholder. */
  attachmentName?: string;
  /** A line under the attachment, e.g. "Version 2 · as published". */
  attachmentMeta?: string;
  /** False while the current version is a draft: the form shows, the send stays off. */
  canSend: boolean;
  onSent?: () => void;
}

const EMPTY = { to: "", cc: "", subject: "", body: "" };

const DocumentEmailForm: React.FC<DocumentEmailFormProps> = ({
  documentId, defaultSubject, recipient = "recipient", suggestions = [], attachmentName, attachmentMeta, canSend, onSent,
}) => {
  const [email, setEmail] = useState(EMPTY);
  const [showCc, setShowCc] = useState(false);
  const [customise, setCustomise] = useState(false);
  const set =(key: keyof typeof email) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setEmail((prev) => ({ ...prev, [key]: event.target.value }));

  const send = useMutation({
    mutationFn: () => emailDocument(documentId, email),
    onSuccess: () => {
      toast({ icon: "success", title: `Sent to the ${recipient}` });
      setEmail(EMPTY);
      setShowCc(false);
      setCustomise(false);
      onSent?.();
    },
    onError: (error: any) =>
      toast({ icon: "error", title: error?.response?.data?.detail ?? error?.response?.data?.message ?? "Could not send the email" }),
  });

  const toList = email.to.split(",").map((s) => s.trim()).filter(Boolean);
  const isOn = (address: string) => toList.some((t) => t.toLowerCase() === address.toLowerCase());
  // Adds or removes one address, keeping whatever else was typed exactly as it was.
  const toggle = (address: string) =>
    setEmail((prev) => {
      const list = prev.to.split(",").map((s) => s.trim()).filter(Boolean);
      const next = list.some((t) => t.toLowerCase() === address.toLowerCase())
        ? list.filter((t) => t.toLowerCase() !== address.toLowerCase())
        : [...list, address];
      return { ...prev, to: next.join(", ") };
    });
  const ready = canSend && !!email.to.trim() && !send.isPending;
  const count = toList.length;

  return (
    <div className="flex flex-col gap-3">
      {!canSend && (
        <Alert variant="info" className="has-[>svg]:grid-cols-[auto_1fr]">
          <Info />
          <AlertDescription>
            This version is still a draft. Publish it to email it — you can prepare the message meanwhile.
          </AlertDescription>
        </Alert>
      )}

      <Field className="gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <FieldLabel htmlFor="email-to">To *</FieldLabel>
          {!showCc && <Button variant="ghost" size="xs" onClick={() => setShowCc(true)}>+ Cc</Button>}
        </div>
        <Input
          id="email-to" type="text" placeholder="Pick below, or type name@example.com — separate several with commas"
          // The browser's own address popup covered the suggestions below and offered the user's own inbox.
          autoComplete="off"
          value={email.to} onChange={set("to")}
        />
        {suggestions.length > 0 && (
          <div className="flex flex-col gap-1.5 pt-1">
            <span className="text-[11px] font-medium text-muted-foreground">From the project's contacts</span>
            <div className="flex flex-wrap gap-1.5">
              {suggestions.map((s) => {
                const on = isOn(s.email);
                const owners = [`${s.name} (${s.kind})`, ...(s.also ?? [])];
                // Who the ONE address belongs to, by name: "STUDIO T, Kavita Rane, demo". A "+N" count read as N more
                // addresses. Roles ("(Contact)") and a sub company's parent prefix are left to the hover, for room.
                const names = [...new Set(owners.map((o) => o.replace(/\s\([^)]*\)$/, "").split(" › ").pop() ?? o))];
                const chip = (
                  // The kit Button, not a raw <button>: the Bootstrap reset squares a bare button's corners.
                  <Button
                    variant={on ? "inverted" : "outline"}
                    size="sm"
                    aria-pressed={on}
                    onClick={() => toggle(s.email)}
                    aria-label={`${on ? "Remove" : "Add"} ${s.email} — ${owners.join(", ")}`}
                    className="max-w-full min-w-0 justify-start gap-1.5 px-2.5 font-normal"
                  >
                    {on
                      ? <Check aria-hidden className="size-3.5 shrink-0" />
                      : <Plus aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />}
                    {/* Names give way first: the address is what gets sent, so it is the last thing clipped. */}
                    <span className="min-w-0 truncate text-xs font-semibold text-foreground">{names.join(", ")}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">· {s.email}</span>
                  </Button>
                );
                return s.also?.length ? (
                  <Tooltip key={s.email}>
                    <TooltipTrigger render={<span className="inline-flex max-w-full min-w-0" />}>{chip}</TooltipTrigger>
                    <TooltipContent>One address, on file for {owners.join(", ")}</TooltipContent>
                  </Tooltip>
                ) : (
                  <React.Fragment key={s.email}>{chip}</React.Fragment>
                );
              })}
            </div>
          </div>
        )}
      </Field>

      {showCc && (
        <Field className="gap-1.5">
          <FieldLabel htmlFor="email-cc">Cc</FieldLabel>
          <Input id="email-cc" type="text" autoFocus autoComplete="off" placeholder="name@example.com" value={email.cc} onChange={set("cc")} />
        </Field>
      )}

      {/*
        The email is written by its template — subject, greeting, summary, View / Download links, signature — so there
        is nothing to fill in. What will go out is shown in one line; Customise opens the two fields for the rare
        personal note, and each still falls back to the standard text when left blank.
      */}
      {customise ? (
        <>
          <Field className="gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <FieldLabel htmlFor="email-subject">Subject</FieldLabel>
              <Button
                variant="ghost" size="xs"
                onClick={() => { setCustomise(false); setEmail((prev) => ({ ...prev, subject: "", body: "" })); }}
              >
                Use standard
              </Button>
            </div>
            {/* autoComplete off: the browser was filling the user's own address into Subject. */}
            <Input id="email-subject" autoComplete="off" placeholder={defaultSubject} value={email.subject} onChange={set("subject")} />
          </Field>
          <Field className="gap-1.5">
            <FieldLabel htmlFor="email-body">Personal note</FieldLabel>
            <Textarea
              id="email-body" autoComplete="off" className="min-h-20" rows={3}
              placeholder="Replaces the standard sentence in the email. Leave blank to keep it."
              value={email.body} onChange={set("body")}
            />
          </Field>
        </>
      ) : (
        <div className="flex items-start justify-between gap-3 rounded-lg bg-muted/40 px-3 py-2 ring-1 ring-border">
          <div className="min-w-0">
            <p className="m-0 text-[11px] font-medium text-muted-foreground">Subject</p>
            <p className="m-0 truncate text-xs font-semibold text-foreground">{defaultSubject}</p>
            <p className="m-0 mt-0.5 text-[11px] text-muted-foreground">Standard message with View &amp; Download links.</p>
          </div>
          <Button variant="ghost" size="xs" className="shrink-0" onClick={() => setCustomise(true)}>
            <Pencil data-icon="inline-start" />
            Customise
          </Button>
        </div>
      )}

      <div className="flex items-center gap-2.5 rounded-lg border border-dashed border-border bg-muted/40 px-3 py-2">
        <FileDown aria-hidden className="size-4 shrink-0 text-muted-foreground" />
        <p className="m-0 min-w-0 flex-1 truncate text-xs">
          <span className="font-semibold text-foreground">{attachmentName ?? defaultSubject}.pdf</span>
          <span className="text-muted-foreground"> · {attachmentMeta ?? "attached automatically"}</span>
        </p>
        <CircleCheck aria-hidden className="size-4 shrink-0 text-success" />
      </div>

      <div className="flex items-center gap-3">
        <Button size="sm" loading={send.isPending} disabled={!ready} onClick={() => send.mutate()}>
          <Send data-icon="inline-start" />
          {send.isPending ? "Sending…" : "Send with PDF"}
        </Button>
        <span className="text-xs text-muted-foreground">
          {!canSend ? "Publish first" : !count ? "Add a recipient to send" : `Goes to ${count} recipient${count === 1 ? "" : "s"}`}
        </span>
      </div>
    </div>
  );
};

export default DocumentEmailForm;
