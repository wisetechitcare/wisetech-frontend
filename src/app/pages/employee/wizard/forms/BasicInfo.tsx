import { useEffect } from 'react';
import dayjs from 'dayjs';
import { Box } from '@mui/material';
import { WtChoiceField, WtDateField, WtFieldFormik } from '@app/modules/common/components/ui';

const GENDER_OPTIONS = [
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'OTHER', label: 'Other' },
  { value: 'NON_BINARY', label: 'Non-binary' },
  { value: 'PREFER_NOT_TO_SAY', label: 'Prefer not to say' },
];

const MARITAL_OPTIONS = [
  { value: '1', label: 'Unmarried' },
  { value: '0', label: 'Married' },
];

function BasicInfo({ formikProps, softRequired = false }: { formikProps: any; softRequired?: boolean }) {
  const { values, setFieldValue } = formikProps;
  const isMarried = String(values?.maritalStatus) === '0';
  const hard = !softRequired;

  useEffect(() => {
    if (!isMarried && values?.anniversary) setFieldValue('anniversary', '', false);
  }, [isMarried]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 2 }}>
        <WtFieldFormik name="firstName" label="First Name" required fullWidth />
        <WtFieldFormik name="lastName" label="Last Name" required={hard} fullWidth />
        <WtDateField label="Date of Birth" required={hard} value={values?.dateOfBirth || null} onChange={(value) => setFieldValue('dateOfBirth', value)} maxDate={dayjs().format('YYYY-MM-DD')} />
        <WtFieldFormik name="maritalStatus" label="Marital Status" options={MARITAL_OPTIONS} />
        <WtChoiceField name="gender" label="Gender" required={hard} variant="segmented" orientation="column" options={GENDER_OPTIONS} sx={{ gridColumn: { xs: 'auto', md: '1 / -1' } }} />
        {isMarried && <WtDateField label="Anniversary Date" value={values?.anniversary || null} onChange={(value) => setFieldValue('anniversary', value)} />}
      </Box>
    </Box>
  );
}

export default BasicInfo;
