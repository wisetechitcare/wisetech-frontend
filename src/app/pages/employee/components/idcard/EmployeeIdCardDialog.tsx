import { useCallback, useRef, useState } from "react";
import { Box, CircularProgress, Stack, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { KTIcon } from "@metronic/helpers";
import { GlassDialog, GlassHeader, WtButton, toast } from "@app/modules/common/components/ui";
import { fetchEmployeeIdCard } from "@services/employee";
import { downloadBlob, svgToPngBlob, toFileNameStem } from "@utils/svgExport";
import EmployeeIdCard from "./EmployeeIdCard";

/**
 * "Generate ID Card" — preview an employee's badge and download it.
 *
 * The card is fetched, not composed here: `/api/employee/id-card/:employeeId` returns
 * the onboarding fields plus the photo and org logo as `data:` URIs, so the badge can
 * never drift from the profile and the export canvas stays untainted (see
 * `EmployeeIdCard` for why that matters).
 *
 * The download is a client-side rasterisation of the exact SVG on screen, at 3× —
 * roughly 300 DPI at badge size, so it prints as well as it previews. Nothing is
 * generated server-side, so "generate" costs one GET and the preview is the artefact.
 *
 * Cached by React Query per employee: reopening the same card is instant, and the
 * photo (the expensive part of the payload) is fetched once.
 */

/** Print-grade export. 1000 SVG units × 3 = 3000px across an 85.6mm card ≈ 300 DPI. */
const EXPORT_SCALE = 3;

export interface EmployeeIdCardDialogProps {
  open: boolean;
  onClose: () => void;
  /** The employee to build a card for, or the literal "me" for the signed-in user. */
  employeeId: string;
  /** Shown in the header while the card loads, so the dialog is never anonymous. */
  employeeName?: string;
}

export default function EmployeeIdCardDialog({ open, onClose, employeeId, employeeName }: EmployeeIdCardDialogProps) {
  const cardRef = useRef<SVGSVGElement>(null);
  const [downloading, setDownloading] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["employee-id-card", employeeId],
    queryFn: () => fetchEmployeeIdCard(employeeId),
    enabled: open && Boolean(employeeId),
    staleTime: 5 * 60 * 1000,
  });

  const handleDownload = useCallback(async () => {
    if (!cardRef.current || !data) return;
    setDownloading(true);
    try {
      const blob = await svgToPngBlob(cardRef.current, { scale: EXPORT_SCALE });
      const stem = toFileNameStem(
        `${data.employee.fullName}${data.employee.employeeCode ? `-${data.employee.employeeCode}` : ""}`,
        "employee",
      );
      downloadBlob(blob, `${stem}-ID-Card.png`);
      toast({ icon: "success", title: "ID card downloaded", text: `${data.employee.fullName}'s card was saved to your device.` });
    } catch (err) {
      toast({
        icon: "error",
        title: "Download failed",
        text: (err as Error)?.message || "The card could not be saved. Please try again.",
      });
    } finally {
      setDownloading(false);
    }
  }, [data]);

  const title = data?.employee.fullName || employeeName || "Employee";

  return (
    <GlassDialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      header={
        <GlassHeader
          title="Employee ID Card"
          subtitle={title}
          icon={<KTIcon iconName="badge" className="fs-1" />}
          onClose={onClose}
        />
      }
    >
      <Box sx={{ p: { xs: 2, sm: 2.75 }, display: "flex", flexDirection: "column", gap: 2.25 }}>
        {isLoading ? (
          <Stack alignItems="center" justifyContent="center" spacing={1.5} sx={{ minHeight: 280 }}>
            <CircularProgress size={30} />
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              Generating the ID card…
            </Typography>
          </Stack>
        ) : isError ? (
          <Stack alignItems="center" justifyContent="center" spacing={1.5} sx={{ minHeight: 280, textAlign: "center" }}>
            <KTIcon iconName="information-5" className="fs-3x text-danger" />
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              The ID card could not be generated
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary", maxWidth: 420 }}>
              {(error as Error)?.message || "Something went wrong while loading this employee's details."}
            </Typography>
            <WtButton inverted onClick={() => refetch()}>Try Again</WtButton>
          </Stack>
        ) : data ? (
          <>
            {/* The badge sits on its own surface at a capped width: at full dialog
                width the 1.59:1 artwork would out-scale the type on it. */}
            <Box
              sx={{
                maxWidth: 760,
                width: "100%",
                mx: "auto",
                borderRadius: 3,
                overflow: "hidden",
                boxShadow: "0 18px 44px -18px rgba(15, 23, 42, 0.45)",
              }}
            >
              <EmployeeIdCard ref={cardRef} data={data} />
            </Box>

            <Typography variant="caption" sx={{ color: "text.secondary", textAlign: "center" }}>
              Every field comes from this employee's onboarding record. Downloads as a print-ready PNG
              at standard ID-card size (85.6 × 54&nbsp;mm, ~300&nbsp;DPI).
            </Typography>

            <Stack
              direction={{ xs: "column-reverse", sm: "row" }}
              spacing={1.25}
              justifyContent="flex-end"
              sx={{ pt: 0.5 }}
            >
              <WtButton ghost onClick={onClose} fullWidth={false} sx={{ width: { xs: "100%", sm: "auto" } }}>
                Close
              </WtButton>
              <WtButton
                onClick={handleDownload}
                disabled={downloading}
                startIcon={
                  downloading
                    ? <CircularProgress size={16} sx={{ color: "inherit" }} />
                    : <KTIcon iconName="cloud-download" className="fs-4" />
                }
                sx={{ width: { xs: "100%", sm: "auto" } }}
              >
                {downloading ? "Preparing…" : "Download Card"}
              </WtButton>
            </Stack>
          </>
        ) : null}
      </Box>
    </GlassDialog>
  );
}
