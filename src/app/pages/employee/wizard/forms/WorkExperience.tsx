import { Stack, Box, Typography } from "@mui/material";
import { ActionIconButton, WtFieldFormik, WtDateField, WtCheckboxField } from "@app/modules/common/components/ui";

function WorkExperience({
  formikProps,
  index,
  canRemove,
  onRemove,
}: {
  formikProps: any;
  index: number;
  canRemove?: boolean;
  onRemove?: () => void;
}) {
  const element = `workExpInfo[${index}]`;
  const isCurrentEmployer = Boolean(formikProps.values?.workExpInfo?.[index]?.isCurrentEmployer);
  const fromDate = formikProps.values?.workExpInfo?.[index]?.fromDate || null;
  const toDate = formikProps.values?.workExpInfo?.[index]?.toDate || null;

  const toggleCurrentEmployer = () => {
    formikProps.setFieldValue(`${element}.isCurrentEmployer`, !isCurrentEmployer);
    if (!isCurrentEmployer) formikProps.setFieldValue(`${element}.toDate`, "");
  };

  return (
    <Stack spacing={2} sx={{ pt: index !== 0 ? 2 : 0 }}>
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
          Experience {index + 1}
        </Typography>
        {canRemove ? (
          <ActionIconButton
            title={`Remove experience ${index + 1}`}
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
          gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
        }}
      >
        <WtFieldFormik name={`${element}.companyName`} label="Company Name" fullWidth />
        <WtFieldFormik name={`${element}.jobTitle`} label="Job Title" fullWidth />
        <WtDateField
          label="From Date"
          value={fromDate}
          onChange={(v) => formikProps.setFieldValue(`${element}.fromDate`, v ?? "")}
        />
        {!isCurrentEmployer ? (
          <WtDateField
            label="To Date"
            value={toDate}
            onChange={(v) => formikProps.setFieldValue(`${element}.toDate`, v ?? "")}
          />
        ) : (
          <Box />
        )}
      </Box>

      <WtCheckboxField
        size="sm"
        checked={isCurrentEmployer}
        onChange={toggleCurrentEmployer}
        id={`${element}-currentEmployer`}
        label="Currently work here"
        sx={{ alignSelf: "flex-start" }}
      />
    </Stack>
  );
}

export default WorkExperience;
