import { Stack, Box, Typography } from "@mui/material";
import { ActionIconButton, WtFieldFormik } from "@app/modules/common/components/ui";
import PhoneNumberInput from "@app/components/PhoneNumberInput";

function FamilyInfo({
  index,
  formikProps,
  canRemove,
  onRemove,
  softRequired = false,
}: {
  index: number;
  formikProps: any;
  canRemove?: boolean;
  onRemove?: () => void;
  /** Candidate / optional sections — no hard asterisks. */
  softRequired?: boolean;
}) {
  const element = `familyInfo[${index}]`;
  const required = !softRequired;

  return (
    <Stack spacing={2}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography
          sx={{
            fontSize: 12.5,
            fontWeight: 600,
            color: "text.secondary",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}
        >
          Relative {index + 1}
        </Typography>
        {canRemove ? (
          <ActionIconButton
            title={`Remove relative ${index + 1}`}
            iconName="trash"
            tone="danger"
            size="sm"
            onClick={() => onRemove?.()}
          />
        ) : null}
      </Box>

      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "1fr 1fr 1fr" },
        }}
      >
        <WtFieldFormik name={`${element}.name`} label="Name" required={required} fullWidth />
        <WtFieldFormik name={`${element}.relationship`} label="Relation" required={required} fullWidth />
        <PhoneNumberInput
          label="Phone"
          isRequired={required}
          formikField={`${element}.mobileNumber`}
          formikProps={formikProps}
          placeholder="Phone number"
        />
      </Box>
    </Stack>
  );
}

export default FamilyInfo;
