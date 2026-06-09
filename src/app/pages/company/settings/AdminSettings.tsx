import { useState, useEffect } from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { fetchCompanyOverview, updateCompanyOverview } from '@services/company';
import { successConfirmation, errorConfirmation } from '@utils/modal';

const validationSchema = Yup.object({
  superAdminEmail: Yup.string().email('Invalid email').required('Super Admin Email is required'),
});

function AdminSettings() {
  const [companyId, setCompanyId] = useState('');
  const [initialValues, setInitialValues] = useState({ superAdminEmail: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchData() {
      const res = await fetchCompanyOverview();
      if (!res.hasError && res.data?.companyOverview?.length) {
        const company = res.data.companyOverview[0];
        setCompanyId(company.id);
        setInitialValues({ superAdminEmail: company.superAdminEmail || '' });
      }
    }
    fetchData();
  }, []);

  return (
    <div className="p-6">
      <p className="text-muted mb-6">Manage super admin email and admin-level configuration.</p>
      <Formik
        initialValues={initialValues}
        enableReinitialize
        validationSchema={validationSchema}
        onSubmit={async (values) => {
          setLoading(true);
          try {
            const res = await updateCompanyOverview(companyId, values as any);
            if (res && !res.hasError) {
              successConfirmation('Super Admin Email updated successfully');
            } else {
              throw new Error('Update failed');
            }
          } catch {
            errorConfirmation('Failed to update Super Admin Email');
          } finally {
            setLoading(false);
          }
        }}
      >
        <Form>
          <div className="mb-5" style={{ maxWidth: 480 }}>
            <label className="required col-form-label fw-bold fs-6">Super Admin Email</label>
            <Field
              name="superAdminEmail"
              type="email"
              className="form-control form-control-lg form-control-solid"
              placeholder="Super Admin Email"
            />
            <ErrorMessage name="superAdminEmail">
              {msg => (
                <div className="fv-plugins-message-container">
                  <div className="fv-help-block">{msg}</div>
                </div>
              )}
            </ErrorMessage>
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </Form>
      </Formik>
    </div>
  );
}

export default AdminSettings;
