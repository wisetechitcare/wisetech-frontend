import React from 'react';
import TabsComponent from './Tabs';
import { PageLink, PageTitle } from "@metronic/layout/core";
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { KTCard, KTCardBody } from '@metronic/helpers';

// Breadcrumbs for the page
const overviewBreadcrumbs: Array<PageLink> = [
    {
        title: 'Company',
        path: '#',
        isSeparator: false,
        isActive: false,
    },
    {
        title: '',
        path: '',
        isSeparator: true,
        isActive: false,
    },
];

// Validation schema for Formik
const validationSchema = Yup.object({
  organisationName: Yup.string().required('Organisation name is required')
});

const Branding: React.FC = () => {
  return (
    <>
      <PageTitle breadcrumbs={overviewBreadcrumbs}>Branding</PageTitle>
      <TabsComponent />

      <Formik
        initialValues={{ organisationName: '' }}
        validationSchema={validationSchema}
        onSubmit={(values) => {
          console.log(values);
        }}
      >
        {({ isSubmitting }) => (
          <Form className="form" placeholder={''}>
            <KTCard className="my-6 shadow-sm">
              <KTCardBody className="p-0">
                <div className="card-header border-0 cursor-pointer d-flex align-items-center justify-content-between">
                  <div className="card-title m-0">
                    <h3 className="fw-bolder m-0">Organisation Profile</h3>
                  </div>
                </div>

                {/* Organisation Name Field */}
                <div className="row mb-5 px-7">
                  <div className="col-lg-12 fv-row">
                    <label className="required col-form-label fw-bold fs-6">
                      Organisation Name
                    </label>
                    <Field
                      name="organisationName"
                      type="text"
                      className="form-control form-control-lg form-control-solid"
                      placeholder="Organisation name"
                    />
                    <ErrorMessage name="organisationName">
                      {msg => <div className="fv-plugins-message-container"><div className="fv-help-block">{msg}</div></div>}
                    </ErrorMessage>
                  </div>
                </div>

                <div className="row px-7 mb-0">
                  <div className="col-lg-12 text-end mb-5">
                    <button
                      type="submit"
                      className="btn btn-lg btn-primary"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <span>
                          Please wait...
                          <span className="spinner-border spinner-border-sm align-middle ms-2"></span>
                        </span>
                      ) : (
                        'Submit'
                      )}
                    </button>
                  </div>
                </div>
              </KTCardBody>
            </KTCard>
          </Form>
        )}
      </Formik>
    </>
  );
};

export default Branding;
