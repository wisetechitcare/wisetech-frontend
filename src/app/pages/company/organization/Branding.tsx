import React from 'react';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { PageLink, PageTitle } from "@metronic/layout/core";
import { Button } from '@/ds/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/ds/ui/card';
import { Field, FieldError, FieldLabel } from '@/ds/ui/field';
import { Input } from '@/ds/ui/input';
import { Spinner } from '@/ds/ui/spinner';
import TabsComponent from './Tabs';

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
  organizationName: Yup.string().required('Organization name is required')
});

/**
 * Branding — a placeholder page: its form validates but does not save anything yet (submit only logs).
 * Rendered from the kit so it matches the rest of the module while it waits for a real branding flow.
 */
const Branding: React.FC = () => {
  return (
    <>
      <PageTitle breadcrumbs={overviewBreadcrumbs}>Branding</PageTitle>
      <TabsComponent />

      <Formik
        initialValues={{ organizationName: '' }}
        validationSchema={validationSchema}
        onSubmit={(values) => {
          console.log(values);
        }}
      >
        {({ isSubmitting, values, errors, touched, handleChange, handleBlur }) => {
          const error = touched.organizationName ? errors.organizationName : undefined;
          return (
            <Form className="mx-auto my-6 w-full max-w-[1600px]" noValidate>
              <Card>
                <CardHeader>
                  <CardTitle>Organization profile</CardTitle>
                </CardHeader>
                <CardContent>
                  <Field data-invalid={Boolean(error) || undefined}>
                    <FieldLabel htmlFor="branding-org-name">Organization name</FieldLabel>
                    <Input
                      id="branding-org-name"
                      name="organizationName"
                      required
                      value={values.organizationName}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      aria-invalid={Boolean(error) || undefined}
                      aria-describedby={error ? 'branding-org-name-error' : undefined}
                    />
                    {error && <FieldError id="branding-org-name-error">{error}</FieldError>}
                  </Field>
                </CardContent>
                <CardFooter className="justify-end">
                  <Button type="submit" size="lg" disabled={isSubmitting}>
                    {isSubmitting && <Spinner className="size-4" aria-hidden />}
                    {isSubmitting ? 'Please wait…' : 'Submit'}
                  </Button>
                </CardFooter>
              </Card>
            </Form>
          );
        }}
      </Formik>
    </>
  );
};

export default Branding;
