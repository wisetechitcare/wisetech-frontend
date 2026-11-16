import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Box } from "@mui/material";
import { RootState } from "@redux/store";
import { ConfigSectionCard } from "@app/modules/configuration";
import { WtField } from "@app/modules/common/components/ui";
import { createNewConfiguration } from "@services/company";
import { errorConfirmation, successConfirmation } from "@utils/modal";
import { AUDIT_WINDOW_MODULE, DEFAULT_AUDIT_DAYS, useAuditWindowDays } from "@/modules/audit/AuditDrawer";

/**
 * Configure → Audit: how many days of edit history the Audit drawer shows for this section's
 * records. Saved per organization; the server applies the same window, so it is a real limit
 * and not just a display filter. 0 shows everything.
 */
const AuditWindowSetting: React.FC<{ entity: "COMPANY" | "CONTACT"; what: string }> = ({ entity, what }) => {
  const module = AUDIT_WINDOW_MODULE[entity]!;
  const companyId = useSelector((state: RootState) => state.employee?.currentEmployee?.companyId as string | undefined);
  const saved = useAuditWindowDays(module);
  const [days, setDays] = useState<string>(String(DEFAULT_AUDIT_DAYS));
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (saved !== null) setDays(String(saved)); }, [saved]);

  const value = Number(days);
  const invalid = days === "" || !Number.isInteger(value) || value < 0 || value > 3650;

  const save = async () => {
    setSaving(true);
    try {
      // Upsert for this organization — never a PUT by id, which could rewrite an inherited row.
      await createNewConfiguration({ module, configuration: { auditDays: value }, companyId });
      await successConfirmation("Audit history setting saved");
    } catch {
      await errorConfirmation("Failed to save the audit history setting");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ConfigSectionCard
      title="Audit History"
      description={`How many days of edit history the Audit drawer shows on a ${what}. 0 shows all of it.`}
      icon="bi-clock-history"
      iconColor="blue"
      primaryAction={{ label: saving ? "Saving…" : "Save", icon: "bi-check-lg", onClick: save, variant: "primary", disabled: saving || invalid }}
      loading={saved === null}
    >
      <Box sx={{ maxWidth: 320 }}>
        <WtField
          label="Show audit history for (days)"
          type="number"
          inputMode="numeric"
          min={0}
          max={3650}
          step={1}
          value={days}
          onChange={(v) => setDays(String(v ?? ""))}
          error={invalid ? "Enter whole days between 0 and 3650" : undefined}
        />
      </Box>
    </ConfigSectionCard>
  );
};

export default AuditWindowSetting;
