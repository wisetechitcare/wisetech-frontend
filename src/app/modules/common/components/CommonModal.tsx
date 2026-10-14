import { resolveActiveOrgId } from '@utils/activeOrg';
import { fetchCompanyOverview } from '@services/company';
import { errorConfirmation, successConfirmation } from '@utils/modal';
import { Form, Formik } from 'formik';
import React, { useEffect, useState } from 'react';
import * as Yup from 'yup';
import { Box, Stack } from '@mui/material';
import {
  GlassDialog,
  PlainDialogHeader,
  WtButton,
} from '@app/modules/common/components/ui';
import TextInput from '../inputs/TextInput';

const commonInputSchema = Yup.object({
  name: Yup.string().required().label('Name'),
});

function CommonModal({
  show,
  setShow,
  functionToCallOnModalSubmit,
  fieldName,
  functionToSetFieldOptions,
}: {
  show: boolean;
  setShow: (open: boolean) => void;
  functionToCallOnModalSubmit: (data: Record<string, unknown>) => Promise<unknown>;
  fieldName?: string;
  functionToSetFieldOptions?: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const [loading, setLoading] = useState(false);
  const [companyId, setCompanyId] = useState('');
  const handleClose = () => setShow(false);
  const initialState = { name: '' };

  const handleSubmit = async (values: { name: string }) => {
    if (!functionToCallOnModalSubmit || !fieldName) {
      return;
    }
    try {
      setLoading(true);
      const finalData: Record<string, unknown> = { companyId };
      finalData[fieldName] = [values.name];
      await functionToCallOnModalSubmit(finalData);
      successConfirmation('Successfully created the option!');
      functionToSetFieldOptions?.((prev) => !prev);
      setShow(false);
    } catch (error) {
      errorConfirmation('Something went wrong, please try again later!');
      console.log('error: ', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    async function fetchData() {
      if (show && !companyId) {
        const {
          data: { companyOverview },
        } = await fetchCompanyOverview();
        setCompanyId(resolveActiveOrgId(companyOverview) ?? '');
      }
    }
    fetchData();
  }, [show, companyId]);

  return (
    <GlassDialog
      open={show}
      onClose={handleClose}
      maxWidth="sm"
      plain
      header={
        <PlainDialogHeader title="Add New Item" onClose={handleClose} />
      }
    >
      <Box sx={{ px: { xs: 2, sm: 3 }, py: 2 }}>
        <Formik
          initialValues={initialState}
          onSubmit={(values) => {
            void handleSubmit(values);
          }}
          validationSchema={commonInputSchema}
          enableReinitialize
        >
          {(formikProps) => (
            <Form noValidate id="common_input_form">
              <Stack spacing={2.5}>
                <TextInput
                  isRequired
                  label="Enter Name"
                  margin="mb-0"
                  formikField="name"
                />
                <Stack direction="row" justifyContent="flex-start">
                  <WtButton
                    type="submit"
                    disabled={loading || !formikProps.isValid}
                  >
                    {loading ? 'Please wait…' : 'Submit'}
                  </WtButton>
                </Stack>
              </Stack>
            </Form>
          )}
        </Formik>
      </Box>
    </GlassDialog>
  );
}

export default CommonModal;
