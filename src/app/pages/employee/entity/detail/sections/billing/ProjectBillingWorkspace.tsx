import React, { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Box, Stack, Tab, Tabs, Typography } from "@mui/material";
import { KTIcon } from "@metronic/helpers";
import { GlassCard, TRIO, WtButton, toast } from "@app/modules/common/components/ui";
import {
    BillingPageHeader, BillingLoadingState, BillingEmptyState, BillingSummaryCard,
} from "@pages/billing/components";
import { formatCurrencyDecimal } from "@utils/currency";
import { withReturnContext, useRestoreScroll } from "@hooks/useReturnContext";
import { getProjectBillingWorkspace } from "@services/projectBilling";
import { accessProforma, downloadWord, type ProformaVersion } from "@services/proformas";
import { accessInvoice, downloadInvoiceWord } from "@services/taxInvoices";
import type { VersionAction } from "@pages/billing/proformas/ProformaTreeRow";
import FinancialOverview from "./FinancialOverview";
import WorkflowProgress from "./WorkflowProgress";
import ActivityFeed from "./ActivityFeed";
import QuickActions from "./QuickActions";
import DocumentCenter from "./DocumentCenter";
import {
    WorkspaceSection, RequestsTable, ProformaList, PaymentsTable, InvoicesTable,
} from "./WorkspaceTables";

/**
 * Project → Billing: the Project Financial Workspace.
 *
 * A CONSUMER of the Billing module, never a copy of it. Every number arrives
 * pre-computed from the service that owns it (one call to
 * `/billing/projects/:id/workspace`), every document is served by the Billing
 * module's own access endpoint, and every write navigates INTO Billing rather
 * than posting from here. That is what keeps this a second view of one truth
 * instead of a second truth.
 *
 * Navigation out of this page always carries a return context, so the user lands
 * back on this tab — at the scroll position they left — instead of being stranded
 * in the Billing module.
 */

type TabKey = "overview" | "requests" | "proformas" | "payments" | "invoices" | "documents" | "activity";

const ProjectBillingWorkspace: React.FC<{ projectId: string }> = ({ projectId }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const queryClient = useQueryClient();
    const [tab, setTab] = useState<TabKey>("overview");

    const queryKey = ["project-billing-workspace", projectId];
    const { data, isLoading, isError, error, refetch } = useQuery({
        queryKey,
        queryFn: () => getProjectBillingWorkspace(projectId),
        enabled: Boolean(projectId),
    });

    // Land back where we left. Gated on loaded data — scrolling to 2000px on a
    // skeleton puts you at the bottom of nothing.
    useRestoreScroll(!isLoading && Boolean(data));

    /**
     * Where "back" returns to. Taken from the live URL rather than rebuilt from a
     * route template, so it stays correct whatever path this page is mounted at —
     * and `?tab=billing` is already in the search string because the tab writes
     * itself there (see EntityDetailPage).
     */
    const returnContext = useMemo(
        () => ({
            pathname: `${location.pathname}${location.search || "?tab=billing"}`,
            label: "Project Billing",
        }),
        [location.pathname, location.search],
    );

    const go = (path: string) => navigate(path, withReturnContext(returnContext));

    /** Section 13 — a card opens the Billing module already filtered to this project. */
    const drillDown = (
        target: "requests" | "proformas" | "payments" | "invoices",
        filter?: string,
    ) => {
        const params = new URLSearchParams({ projectId });
        if (target === "requests" && filter) params.set("status", filter);
        if (target === "payments" && filter === "outstanding") params.set("paymentStatus", "PARTIALLY_PAID");
        go(`/billing/${target === "invoices" ? "invoices" : target}?${params.toString()}`);
    };

    const refresh = () => queryClient.invalidateQueries({ queryKey });

    /**
     * Document access. Routes to the Billing module's own endpoint, which serves
     * the STORED file and records the intent — nothing is re-rendered here.
     * Proformas and invoices have separate clients because they are separate
     * repositories with separate audit trails.
     */
    const access = useMutation({
        mutationFn: ({ id, intent, isInvoice }: {
            id: string; intent: "DOWNLOAD" | "PRINT" | "SHARE"; isInvoice: boolean;
        }) => (isInvoice ? accessInvoice(id, intent) : accessProforma(id, intent)),
        onSuccess: async (result, variables) => {
            if (variables.intent === "SHARE") {
                // Clipboard can be blocked (insecure origin, denied permission);
                // opening the link beats a silent no-op.
                try {
                    await navigator.clipboard.writeText(result.url);
                    toast({ icon: "success", title: "Share link copied — valid for 7 days" });
                } catch {
                    window.open(result.url, "_blank", "noopener");
                }
            } else {
                window.open(result.url, "_blank", "noopener");
            }
            refresh();
        },
        onError: (err: any) =>
            toast({ icon: "error", title: err?.response?.data?.message ?? "Could not open the document" }),
    });

    const wordDownload = useMutation({
        mutationFn: ({ id, isInvoice }: { id: string; isInvoice: boolean }) =>
            isInvoice ? downloadInvoiceWord(id) : downloadWord(id),
        onError: (err: any) =>
            toast({ icon: "error", title: err?.response?.data?.message ?? "Could not download the document" }),
    });

    const invoiceIds = useMemo(
        () => new Set((data?.invoices ?? []).map((d) => d.id)),
        [data?.invoices],
    );
    const isInvoice = (id: string) => invoiceIds.has(id);

    const onProformaAction = (documentId: string, action: VersionAction, version: ProformaVersion) => {
        if (action === "preview") return go(`/billing/proformas/${documentId}?version=${version.id}`);
        if (action === "compare") return go(`/billing/proformas/${documentId}?compare=${version.id}`);
        if (action === "delete") return go(`/billing/proformas/${documentId}`);
        access.mutate({
            id: documentId,
            isInvoice: false,
            intent: action === "download" ? "DOWNLOAD" : action === "print" ? "PRINT" : "SHARE",
        });
    };

    /** An activity line opens the record it happened to. */
    const openActivity = (entry: { source: string; sourceId: string }) => {
        if (entry.source === "REQUEST") return go(`/billing/requests/${entry.sourceId}`);
        if (entry.source === "OPERATION") return go(`/billing/payments/${entry.sourceId}`);
        return go(`/billing/proformas/${entry.sourceId}`);
    };

    if (!projectId) {
        return (
            <GlassCard preset="section" sx={{ p: 3, textAlign: "center" }}>
                <Typography sx={{ fontSize: 13, color: "text.secondary" }}>No project loaded.</Typography>
            </GlassCard>
        );
    }

    if (isError) {
        return (
            <Alert
                severity="error"
                action={
                    <WtButton size="small" ghost onClick={() => refetch()}>
                        Retry
                    </WtButton>
                }
            >
                {(error as any)?.response?.data?.message ?? "Could not load this project's billing."}
            </Alert>
        );
    }

    if (isLoading || !data) return <BillingLoadingState rows={5} />;

    const { financial, workflow, requests, payments, proformas, invoices, activity, readiness, capabilities } = data;
    const money = (value: number) => formatCurrencyDecimal(value);

    const TABS: { key: TabKey; label: string; count?: number }[] = [
        { key: "overview", label: "Overview" },
        { key: "requests", label: "Requests", count: requests.length },
        { key: "proformas", label: "Proformas", count: proformas.length },
        { key: "payments", label: "Payments", count: payments.length },
        { key: "invoices", label: "Invoices", count: invoices.length },
        { key: "documents", label: "Documents", count: proformas.length + invoices.length },
        { key: "activity", label: "Activity", count: activity.length },
    ];

    return (
        <Stack spacing={1.5} sx={{ maxWidth: 1600, mx: "auto" }}>
            <BillingPageHeader
                icon="dollar"
                trio={TRIO.green}
                title="Project Billing"
                description="This project's complete financial position, read from the Billing module."
                action={
                    <WtButton
                        ghost
                        size="small"
                        onClick={() => go(`/billing/requests?projectId=${projectId}`)}
                        startIcon={<KTIcon iconName="exit-right-corner" className="fs-6" />}
                        sx={{ minHeight: 36, borderRadius: "10px", fontSize: 13 }}
                    >
                        Open Billing
                    </WtButton>
                }
            />

            {!readiness.hasBilling ? (
                <BillingEmptyState
                    icon="dollar"
                    title="Nothing billed on this project yet"
                    description="Complete some billable deliverables in the Execution tab, then raise a billing request."
                    actionLabel="Raise Billing Request"
                    onAction={() => go(`/billing/requests/new?projectId=${projectId}`)}
                />
            ) : (
                <>
                    {/* Section 1 */}
                    <FinancialOverview financial={financial} onDrillDown={drillDown} />

                    {/* Section 2 */}
                    <WorkflowProgress workflow={workflow} />

                    {/* Section 11 */}
                    <QuickActions
                        readiness={readiness}
                        capabilities={capabilities}
                        onRaiseRequest={() => go(`/billing/requests/new?projectId=${projectId}`)}
                        // The Accounts workspace IS Billing Operations filtered to the
                        // queue — there is no separate /billing/accounts route.
                        onGenerateProforma={() =>
                            go(`/billing/operations?projectId=${projectId}&status=READY_FOR_PROFORMA`)
                        }
                        onRecordPayment={() => go(`/billing/payments?projectId=${projectId}`)}
                        onGenerateInvoice={() => go(`/billing/payments?projectId=${projectId}&readyForInvoice=true`)}
                        onOpenBilling={() => go(`/billing/requests?projectId=${projectId}`)}
                        onOpenReports={() => go(`/billing/reports/project?projectId=${projectId}`)}
                    />

                    <GlassCard preset="section" sx={{ p: 0, overflow: "hidden" }}>
                        <Tabs
                            value={tab}
                            onChange={(_event, next) => setTab(next as TabKey)}
                            variant="scrollable"
                            scrollButtons="auto"
                            sx={{ borderBottom: 1, borderColor: "divider", px: 1 }}
                        >
                            {TABS.map((t) => (
                                <Tab
                                    key={t.key}
                                    value={t.key}
                                    label={t.count != null ? `${t.label} (${t.count})` : t.label}
                                    sx={{ fontSize: 12.5, fontWeight: 600, minHeight: 44, textTransform: "none" }}
                                />
                            ))}
                        </Tabs>

                        <Box sx={{ p: { xs: 1.5, sm: 2 } }}>
                            {tab === "overview" && (
                                <Box
                                    sx={{
                                        display: "grid",
                                        gap: 1.5,
                                        gridTemplateColumns: { xs: "1fr", lg: "minmax(320px, 420px) minmax(0, 1fr)" },
                                    }}
                                >
                                    {/* Section 8 — reuses the module's summary card rather than
                                        a bespoke layout, so the label/value rhythm matches
                                        every other Billing screen. */}
                                    <BillingSummaryCard
                                        title="Financial Summary"
                                        rows={[
                                            { label: "Contract value", value: money(financial.contractValue) },
                                            { label: "Approved billing", value: money(financial.approvedBilling) },
                                            { label: "Requested to date", value: money(financial.requestedTotal) },
                                            { label: "Proformas generated", value: money(financial.proformaValue) },
                                            { label: "Invoice value", value: money(financial.invoiceValue) },
                                            { label: "Taxable", value: money(financial.invoiceTaxable) },
                                            { label: "GST", value: money(financial.gstAmount) },
                                            { label: "Collected", value: money(financial.collected) },
                                            { label: "Outstanding", value: money(financial.outstanding) },
                                            { label: "Remaining contract", value: money(financial.remainingContractValue) },
                                        ]}
                                    />

                                    {/* Section 3 — same events as the Activity tab, drawn as a rail. */}
                                    <Box>
                                        <Typography sx={{ fontWeight: 700, fontSize: 14, mb: 1.25 }}>
                                            Billing Timeline
                                        </Typography>
                                        <ActivityFeed
                                            activity={activity}
                                            variant="timeline"
                                            limit={12}
                                            onOpen={openActivity}
                                        />
                                    </Box>
                                </Box>
                            )}

                            {tab === "requests" && (
                                <WorkspaceSection
                                    title="Billing Requests"
                                    count={requests.length}
                                    icon="document"
                                    onOpenAll={() => drillDown("requests")}
                                >
                                    <RequestsTable
                                        rows={requests}
                                        onOpen={(id) => go(`/billing/requests/${id}`)}
                                    />
                                </WorkspaceSection>
                            )}

                            {tab === "proformas" && (
                                <WorkspaceSection
                                    title="Proformas"
                                    count={proformas.length}
                                    icon="file-added"
                                    onOpenAll={() => drillDown("proformas")}
                                    openAllLabel="Open Repository"
                                >
                                    <ProformaList
                                        rows={proformas}
                                        onOpen={(id, versionId) =>
                                            go(`/billing/proformas/${id}${versionId ? `?version=${versionId}` : ""}`)
                                        }
                                        onAction={onProformaAction}
                                    />
                                </WorkspaceSection>
                            )}

                            {tab === "payments" && (
                                <WorkspaceSection
                                    title="Payment Collection"
                                    count={payments.length}
                                    icon="wallet"
                                    onOpenAll={() => drillDown("payments")}
                                >
                                    <PaymentsTable
                                        rows={payments}
                                        onOpen={(id) => go(`/billing/payments/${id}`)}
                                    />
                                </WorkspaceSection>
                            )}

                            {tab === "invoices" && (
                                <WorkspaceSection
                                    title="Tax Invoices"
                                    count={invoices.length}
                                    icon="receipt-square"
                                    onOpenAll={() => drillDown("invoices")}
                                    openAllLabel="Open Repository"
                                >
                                    <InvoicesTable
                                        rows={invoices}
                                        onOpen={(id) => go(`/billing/proformas/${id}`)}
                                        onDocumentAction={(id, intent) =>
                                            access.mutate({ id, intent, isInvoice: true })
                                        }
                                        onDownloadWord={(id) => wordDownload.mutate({ id, isInvoice: true })}
                                    />
                                </WorkspaceSection>
                            )}

                            {tab === "documents" && (
                                <WorkspaceSection
                                    title="Billing Documents"
                                    count={proformas.length + invoices.length}
                                    icon="folder"
                                >
                                    <DocumentCenter
                                        proformas={proformas}
                                        invoices={invoices}
                                        onPreview={(id) => go(`/billing/proformas/${id}`)}
                                        onAccess={(id, intent) =>
                                            access.mutate({ id, intent, isInvoice: isInvoice(id) })
                                        }
                                        onDownloadWord={(id) =>
                                            wordDownload.mutate({ id, isInvoice: isInvoice(id) })
                                        }
                                    />
                                </WorkspaceSection>
                            )}

                            {tab === "activity" && (
                                <WorkspaceSection title="Activity" count={activity.length} icon="time">
                                    <ActivityFeed activity={activity} variant="feed" onOpen={openActivity} />
                                </WorkspaceSection>
                            )}
                        </Box>
                    </GlassCard>
                </>
            )}
        </Stack>
    );
};

export default ProjectBillingWorkspace;
