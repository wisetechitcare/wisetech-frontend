import React, { useState, useEffect } from "react";
import { Box, Stack, Typography } from "@mui/material";
import { successConfirmation } from "@utils/modal";
import { useDashboardSettings, DashboardSection, isWidgetAllowed } from "./useDashboardSettings";
import {
  GlassDialog,
  PlainDialogHeader,
  WtButton,
  WtSwitch,
} from "@app/modules/common/components/ui";

interface CustomizeDashboardProps {
  show: boolean;
  onHide: () => void;
  onSettingsChange?: () => void;
}

const CustomizeDashboard: React.FC<CustomizeDashboardProps> = ({ show, onHide, onSettingsChange }) => {
  const { sections: savedSections, saveSections } = useDashboardSettings();
  const [sections, setSections] = useState<DashboardSection[]>(savedSections);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (show) {
      setSections(savedSections);
    }
  }, [show, savedSections]);

  const handleToggle = (key: string) => {
    setSections((prevSections) =>
      prevSections.map((section) =>
        section.key === key ? { ...section, enabled: !section.enabled } : section
      )
    );
  };

  const handleSave = async () => {
    try {
      setIsSubmitting(true);
      await saveSections(sections);
      successConfirmation("Dashboard settings saved.");
      onSettingsChange?.();
      onHide();
    } catch (error) {
      console.error("Error saving dashboard settings:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <GlassDialog
      open={show}
      onClose={onHide}
      maxWidth="md"
      plain
      header={
        <PlainDialogHeader
          title="Customize Cards Visibility"
          subtitle="Select which sections you want to display on your dashboard."
          onClose={onHide}
        />
      }
    >
      <Box sx={{ px: { xs: 2, sm: 3 }, py: 2.5 }}>
        <Typography
          component="h3"
          sx={{
            fontWeight: 700,
            fontSize: 14,
            letterSpacing: "-0.01em",
            mb: 1.5,
            pb: 1,
            borderBottom: 1,
            borderColor: "divider",
          }}
        >
          Dashboard Sections
        </Typography>

        <Stack spacing={1.5}>
          {sections
            .filter((section) => isWidgetAllowed(section.key))
            .map((section) => (
              <Stack
                key={section.key}
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                gap={2}
                sx={{ py: 0.25 }}
              >
                <Typography
                  component="label"
                  htmlFor={section.key}
                  sx={{ fontSize: 14, fontWeight: 500, cursor: "pointer" }}
                >
                  {section.label}
                </Typography>
                <WtSwitch
                  id={section.key}
                  checked={section.enabled}
                  onChange={() => handleToggle(section.key)}
                />
              </Stack>
            ))}
        </Stack>

        <Box sx={{ mt: 3, display: "flex", justifyContent: "flex-end" }}>
          <WtButton onClick={handleSave} disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : "Save Settings"}
          </WtButton>
        </Box>
      </Box>
    </GlassDialog>
  );
};

export default CustomizeDashboard;
