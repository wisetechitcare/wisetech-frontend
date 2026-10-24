import React, { useState } from "react";
import { Box, Stack, Typography } from "@mui/material";
import { Formik } from "formik";
import * as Yup from "yup";
import { createNewConfiguration, updateConfigurationById } from "@services/company";
import { KTIcon } from "@metronic/helpers";
import IconPickerModal, { SelectedIcon } from "@app/pages/employee/reimbursement/views/admin/IconPickerModal";
import {
  ConfigureFormDialog,
  InlineHint,
  KIT_HEX_SWATCHES,
  WtButton,
  WtColorPicker,
  WtFieldFormik,
  WtSwitchField,
  toast,
} from "@app/modules/common/components/ui";
import { apiErrorMessage } from "@utils/apiError";

export interface CalendarConfigItem {
  id: string | null;
  enabled: boolean;
  color: string;
  icon?: string;
  /**
   * The text this setting paints, where a setting HAS text of its own.
   *
   * Only the half-day pills use it: "AM" and "PM" are an assumption about how an office talks
   * about its day, and offices that say "Morning" or run a night shift were stuck with it.
   * Absent everywhere else, because most calendar settings label themselves from their data.
   */
  label?: string;
}

function IconPreview({ icon }: { icon: string }) {
  if (!icon) return null;
  const isKtIcon = icon.startsWith("kt:");
  return (
    <Stack
      direction="row"
      spacing={1.25}
      alignItems="center"
      sx={{
        mt: 1,
        px: 1.5,
        py: 1.25,
        borderRadius: 2,
        bgcolor: "action.hover",
        border: "1px solid",
        borderColor: "divider",
      }}
    >
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: "50%",
          bgcolor: "background.paper",
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
          boxShadow: 1,
        }}
      >
        {isKtIcon ? (
          <KTIcon iconName={icon.slice(3)} className="fs-2 text-primary" />
        ) : (
          <Box component="img" src={icon} alt="" sx={{ width: 26, height: 26, objectFit: "contain" }} />
        )}
      </Box>
      <Box>
        <Typography sx={{ fontSize: 11, color: "text.secondary", mb: 0.25 }}>Icon preview</Typography>
        <Typography sx={{ fontSize: 12.5, fontWeight: 500, color: "text.primary" }}>
          {isKtIcon ? `System · ${icon.slice(3)}` : "Online icon"}
        </Typography>
      </Box>
    </Stack>
  );
}

interface CalendarConfigFormProps {
  show: boolean;
  onClose: () => void;
  onSuccess?: (updatedData: CalendarConfigItem) => void;
  initialData: CalendarConfigItem | null;
  moduleKey: string;
  title: string;
  /** Present only for settings whose text is editable; supplies the caption and the default. */
  textLabel?: { caption: string; fallback: string };
}

const validationSchema = Yup.object().shape({
  enabled: Yup.boolean().required(),
  color: Yup.string().required("Color is required"),
});

const CalendarConfigForm: React.FC<CalendarConfigFormProps> = ({
  show,
  onClose,
  onSuccess,
  initialData,
  moduleKey,
  title,
  textLabel,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showIconPicker, setShowIconPicker] = useState(false);

  const initialValues = {
    enabled: initialData?.enabled ?? false,
    color: initialData?.color || "#0288D1",
    icon: initialData?.icon || "",
    label: initialData?.label ?? "",
  };

  const handleSubmit = async (values: typeof initialValues) => {
    setError(null);
    setIsSubmitting(true);

    try {
      const payload = {
        enabled: values.enabled,
        color: values.color,
        icon: values.icon,
        // Blank is stored as blank, and read back as the default. Saving the fallback instead
        // would freeze today's wording into the row, so a later change to the default would
        // not reach anyone who had opened this form once.
        ...(textLabel ? { label: values.label.trim() } : {}),
      };

      let updatedId = initialData?.id || null;

      if (updatedId) {
        await updateConfigurationById(updatedId, {
          module: moduleKey,
          configuration: payload,
        });
      } else {
        const response = await createNewConfiguration({
          module: moduleKey,
          configuration: payload,
        });
        updatedId = response?.data?.configuration?.id || null;
      }

      toast({ icon: "success", title: `${title} saved` });

      onSuccess?.({
        id: updatedId,
        enabled: values.enabled,
        color: values.color,
        icon: values.icon,
        ...(textLabel ? { label: values.label.trim() } : {}),
      });
      onClose();
    } catch (err: unknown) {
      setError(apiErrorMessage(err, `Failed to save ${title.toLowerCase()}`));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Formik
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={handleSubmit}
        enableReinitialize
      >
        {(fk) => (
          <ConfigureFormDialog
            open={show}
            onClose={onClose}
            title={title}
            saving={isSubmitting}
            dirty={fk.dirty}
            error={error}
            onSubmit={fk.handleSubmit}
            submitLabel="Save"
          >
            <WtSwitchField
              title="Enable event display"
              size="sm"
              checked={fk.values.enabled}
              onChange={(e) => void fk.setFieldValue("enabled", e.target.checked)}
              disabled={isSubmitting}
            />

            {/* The pill's own text. Above the colour because it is what the pill SAYS,
                and reading comes before decoration. Shown whether or not the colour is
                overridden: a half is still called something when it is wearing the
                built-in colour. */}
            {textLabel ? (
              <Stack spacing={0.75}>
                <WtFieldFormik
                  name="label"
                  label={textLabel.caption}
                  placeholder={textLabel.fallback}
                  disabled={isSubmitting}
                />
                <InlineHint>
                  Leave it empty to keep &ldquo;{textLabel.fallback}&rdquo;. It sits in a small pill, so short wins.
                </InlineHint>
              </Stack>
            ) : null}

            {fk.values.enabled ? (
              <WtColorPicker
                label="Category colour"
                palette={KIT_HEX_SWATCHES}
                value={fk.values.color}
                onChange={(v) => void fk.setFieldValue("color", v, true)}
                disabled={isSubmitting}
                variant="row"
              />
            ) : null}

            {fk.values.enabled ? (
              <Box>
                <Typography sx={{ fontSize: 13, fontWeight: 600, color: "text.primary", mb: 1 }}>
                  Icon
                </Typography>
                <WtButton
                  type="button"
                  inverted
                  fullWidth
                  onClick={() => setShowIconPicker(true)}
                  startIcon={<KTIcon iconName="category" className="fs-4" />}
                  endIcon={<KTIcon iconName="arrow-right" className="fs-5" />}
                  sx={{ justifyContent: "flex-start" }}
                >
                  {fk.values.icon ? "Change icon" : "Pick an icon…"}
                </WtButton>
                <IconPreview icon={fk.values.icon} />

                <IconPickerModal
                  show={showIconPicker}
                  onHide={() => setShowIconPicker(false)}
                  onSelect={(icon: SelectedIcon) => {
                    const storedValue = icon.source === "system" ? `kt:${icon.name}` : icon.url!;
                    void fk.setFieldValue("icon", storedValue);
                  }}
                  currentIcon={
                    fk.values.icon
                      ? fk.values.icon.startsWith("kt:")
                        ? {
                            source: "system",
                            name: fk.values.icon.slice(3),
                            label: fk.values.icon.slice(3),
                          }
                        : {
                            source: "iconify",
                            url: fk.values.icon,
                            label: "Online Icon",
                          }
                      : null
                  }
                />
              </Box>
            ) : null}
          </ConfigureFormDialog>
        )}
      </Formik>
    </>
  );
};

export default CalendarConfigForm;
