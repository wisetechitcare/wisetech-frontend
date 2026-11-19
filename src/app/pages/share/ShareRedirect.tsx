import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Download, FileText, ShieldCheck } from "lucide-react";
import { KitProvider } from "@/ds/provider";
import { buttonVariants } from "@/ds/ui/button";
import { formatDate } from "@utils/dateFormats";
import { getSharedDocument, type SharedDocumentInfo } from "@services/billingDocuments";

/**
 * `/s/:code` — a shared document, opened by someone with no account (a client, usually). Public, outside the auth
 * branch.
 *
 * Shows the PDF HERE, under the short address, in a branded frame: the issuing company's logo, what the document is
 * (type, number, project, date) and a Download button. It does not redirect — that put the
 * 600-character signed storage URL in the address bar. A "download" link starts the download and leaves this page as
 * the receipt. Everything shown comes from the shared version itself, so it always matches the PDF.
 */
const ShareRedirect = () => {
  const { code = "" } = useParams();
  const [state, setState] = useState<"loading" | "expired" | SharedDocumentInfo>("loading");
  const [logoFailed, setLogoFailed] = useState(false);

  useEffect(() => {
    let live = true;
    getSharedDocument(code).then((info) => {
      if (!live) return;
      setState(info ?? "expired");
      if (info) document.title = [info.title, info.documentNumber, info.companyName].filter(Boolean).join(" · ");
      if (info?.mode === "DOWNLOAD") window.location.href = info.downloadUrl;
    });
    return () => { live = false; };
  }, [code]);

  if (state === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40">
        <p className="m-0 text-sm text-muted-foreground">Opening the document…</p>
      </div>
    );
  }

  if (state === "expired") {
    return (
      <KitProvider>
        <div className="flex min-h-screen items-start justify-center bg-muted/40 px-4 pt-[15vh]">
          <div className="w-full max-w-md rounded-2xl border bg-background p-6 shadow-sm">
            <h1 className="m-0 mb-2 text-lg font-semibold text-foreground">This link has expired</h1>
            <p className="m-0 text-sm leading-relaxed text-muted-foreground">
              Shared document links stay valid for 7 days. Please ask the sender for a new link.
            </p>
          </div>
        </div>
      </KitProvider>
    );
  }

  const meta = [state.projectName, state.documentDate].filter(Boolean).join("  ·  ");

  return (
    <KitProvider>
      <div className="flex h-screen flex-col bg-muted/40">
        {/* Brand line. */}
        <div aria-hidden className="h-1 shrink-0 bg-primary" />

        {/*
          Full width, three zones: brand · document · amount + action. Below md the document zone drops beside the
          logo and the amount + button take a row of their own, the button stretching to a full-width tap target.
        */}
        <header className="shrink-0 border-b bg-background shadow-[0_1px_3px_rgb(15_23_42/0.06)]">
          <div className="flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:gap-8 md:px-8 md:py-4">
            {/* Brand + document */}
            <div className="flex min-w-0 flex-1 items-center gap-4 md:gap-6">
              <div className="flex shrink-0 items-center gap-3">
                {state.companyLogoUrl && !logoFailed ? (
                  <img
                    src={state.companyLogoUrl}
                    alt={state.companyName || "Company logo"}
                    onError={() => setLogoFailed(true)}
                    className="h-11 w-auto max-w-[120px] object-contain md:h-14 md:max-w-[160px]"
                  />
                ) : (
                  <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary md:size-14">
                    <FileText aria-hidden className="size-6" />
                  </span>
                )}
                {/* Logo only — the logo carries the name. */}
              </div>
              <div aria-hidden className="hidden h-12 w-px shrink-0 bg-border sm:block" />
              <div className="min-w-0">
                <p className="m-0 text-[10.5px] font-bold uppercase tracking-[0.14em] text-primary">{state.title}</p>
                <p className="m-0 truncate text-base font-extrabold text-foreground md:text-lg">{state.documentNumber}</p>
                {meta && <p className="m-0 truncate text-xs text-muted-foreground">{meta}</p>}
              </div>
            </div>

            {/* The one action. Full width on phones (a proper tap target), its natural size beside the details above md.
                No amount here: the PDF below is the document, and the header only says what it is. */}
            {/* A plain link with `download`: the signed URL serves the file as an attachment. */}
            <a
              href={state.downloadUrl}
              download={state.fileName}
              className={buttonVariants({ size: "lg", className: "w-full shrink-0 md:w-auto" })}
            >
              <Download data-icon="inline-start" />
              Download PDF
            </a>
          </div>
        </header>

        <main className="min-h-0 flex-1">
          {/* `navpanes=0` drops the page-thumbnail sidebar, `view=FitH` fits the page to the width; zoom and print stay
              in the browser's own bar. */}
          <iframe
            title={`${state.title} ${state.documentNumber}`}
            src={`${state.viewUrl}#navpanes=0&view=FitH`}
            className="block h-full w-full border-0"
          />
        </main>

        <footer className="shrink-0 border-t bg-background px-4 py-2">
          <p className="m-0 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
            <ShieldCheck aria-hidden className="size-3.5" />
            Shared securely{state.companyName ? ` by ${state.companyName}` : ""}
            {state.expiresAt ? ` · link valid until ${formatDate(state.expiresAt)}` : ""}
          </p>
        </footer>
      </div>
    </KitProvider>
  );
};

export default ShareRedirect;
