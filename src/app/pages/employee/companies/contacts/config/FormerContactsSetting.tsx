import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Box } from "@mui/material";
import { RootState } from "@redux/store";
import { ConfigSectionCard } from "@app/modules/configuration";
import { WtField } from "@app/modules/common/components/ui";
import { createNewConfiguration, fetchConfiguration } from "@services/company";
import { errorConfirmation, successConfirmation } from "@utils/modal";

/** Same module + key the backend reads (ContactRepository.formerContactDays). */
const MODULE = "contacts";
const DEFAULT_DAYS = 90;

/**
 * How long someone who moved to another company stays under "Former contacts" on their
 * old company's page. Saved per organization; 0 hides the section.
 */
const FormerContactsSetting: React.FC = () => {
  const companyId = useSelector((state: RootState) => state.employee?.currentEmployee?.companyId as string | undefined);
  const [days, setDays] = useState<string>(String(DEFAULT_DAYS));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchConfiguration(MODULE, undefined, undefined, companyId ? { companyId } : undefined)
      .then(({ data }: any) => {
        const raw = data?.configuration?.configuration;
        const cfg = typeof raw === "string" ? JSON.parse(raw) : raw;
        if (!cancelled && cfg?.formerContactDays !== undefined) setDays(String(cfg.formerContactDays));
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [companyId]);

  const value = Number(days);
  const invalid = days === "" || !Number.isInteger(value) || value < 0 || value > 3650;

  const save = async () => {
    setSaving(true);
    try {
      // Upsert for this organization — never a PUT by id, which could rewrite an inherited row.
      await createNewConfiguration({ module: MODULE, configuration: { formerContactDays: value }, companyId });
      await successConfirmation("Former contacts setting saved");
    } catch {
      await errorConfirmation("Failed to save the former contacts setting");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ConfigSectionCard
      title="Former Contacts"
      description="When a contact moves to another company, their old company keeps listing them under Former contacts for this many days."
      icon="bi-clock-history"
      iconColor="amber"
      primaryAction={{ label: saving ? "Saving…" : "Save", icon: "bi-check-lg", onClick: save, variant: "primary", disabled: saving || invalid }}
      loading={loading}
    >
      <Box sx={{ maxWidth: 320 }}>
        <WtField
          label="Show former contacts for (days)"
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

export default FormerContactsSetting;
