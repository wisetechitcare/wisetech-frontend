import { Dialog, IconButton, Box, Typography, Grid, Button, Modal } from '@mui/material';
import { Close, Add } from '@mui/icons-material';
import { useState } from 'react';
import { Formik, Form as FormikForm } from "formik";
import DropDownInput from "@app/modules/common/inputs/DropdownInput";
import TextInput from "@app/modules/common/inputs/TextInput";
interface LeadFormModalProps {
    isEdit?: boolean;
    type: string;
    open: boolean;
    onClose: () => void;
    onSubmit: (data: any) => void;
    title: string;
    initialData?: any;
    services?: Array<{ id: string; name: string }>;
    categories?: Array<{ id: string; name: string }>;
    subcategories?: Array<{ id: string; name: string }>;
    companies?: Array<{ id: string; companyName: string }>;
    branches?: Array<{ id: string; name: string }>;
    contacts?: Array<{ id: string; fullName: string }>;
    employees?: Array<{ id: string; users: { firstName: string; lastName: string } }>;
    leadSources?: Array<{ id: string; name: string }>;
    referralTypes?: Array<{ id: string; name: string }>;
  }
const FormModalBlank = ({
    isEdit,
    type,
    open,
    onClose,
    onSubmit,
    title,
    initialData = {},
    services = [],
    categories = [],
    subcategories = [],
    companies = [],
    branches = [],
    contacts = [],
    employees = [],
    leadSources = [],
    referralTypes = []
}: LeadFormModalProps) => {
    // Form initial values
  const initialValues = {
    projectName: initialData.title || '',
    description: initialData.description || '',
    status: 'new',
    source: '',
    budget: '',
    company: '',
    contactPerson: '',
    leadSource: '',
    service: '',
    category: '',
    subCategory: '',
    startDate: '',
    endDate: '',
    rate: '',
    cost: '',
    companyId: '',
    branchId: '',
    contactRoleId: '',
    leadInquiryDate: '',
    leadAssignedTo: '',
    referrals: [],
    ...initialData
  };
    return (
        <div>
            <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            PaperProps={{
              sx: {
                maxHeight: '90vh',
                overflowY: 'auto',
                borderRadius: '8px',
                p: 3
              }
            }}
          >
            <Box sx={{ position: 'relative' }}>
              <IconButton
                onClick={onClose}
                sx={{
                  position: 'absolute',
                  right: 8,
                  top: 8,
                  color: 'text.secondary',
                }}
              >
                <Close />
              </IconButton>

              <Typography variant="h6" component="h2" sx={{ mb: 3, fontWeight: 600 }}>
                {title}
              </Typography>

              <Formik
                initialValues={initialValues}
                onSubmit={onSubmit}
              >
                {({ isSubmitting, values, setFieldValue }) => (
                  <FormikForm placeholder={""}>
                    {/* Project Details Section */}
                    <Box sx={{ mb: 4 }}>
                      <fieldset style={{ borderTop: '1px solid #70829A', padding: '16px', margin: 0 }}>
                        <legend style={{
                          fontSize: '17px',
                          fontWeight: 500,
                          fontFamily: 'Inter',
                          marginTop: "-25px",
                          marginLeft: "-17px",
                          backgroundColor: "white",
                          width: "auto",
                          lineHeight: "1",
                          letterSpacing: 0,
                          color: "#70829A",
                          padding: "0 8px"
                        }}>
                          Project Details
                        </legend>

                        <Grid container spacing={3}>
                          <Grid item xs={12} md={6}>
                            <TextInput formikField='projectName' label='Project Title' isRequired />
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <DropDownInput
                              formikField="service"
                              isRequired={false}
                              inputLabel="Service"
                              options={services.map(s => ({ value: s.id, label: s.name }))}
                              placeholder="Select service"
                            />
                          </Grid>

                          <Grid item xs={12} md={6}>
                            <DropDownInput
                              formikField="category"
                              isRequired={false}
                              inputLabel="Project Category"
                              options={categories.map(c => ({ value: c.id, label: c.name }))}
                              placeholder="Select category"
                            />
                          </Grid>

                          <Grid item xs={12} md={6}>
                            <DropDownInput
                              formikField="subCategory"
                              isRequired={false}
                              inputLabel="Project Sub Category"
                              options={subcategories.map(s => ({ value: s.id, label: s.name }))}
                              placeholder="Select subcategory"
                            />
                          </Grid>

                          <Grid item xs={12} md={6}>
                            <TextInput
                              isRequired={false}
                              formikField="startDate"
                              label="Project Start Date"
                            />
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <TextInput
                              formikField="endDate"
                              label="Project End Date"
                              isRequired={false}
                            />
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <TextInput
                              isRequired={false}
                              formikField="rate"
                              label="Rate"
                            />
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <TextInput
                              formikField="cost"
                              label="Cost"
                              isRequired={false}
                            />
                          </Grid>
                        </Grid>
                      </fieldset>

                      {/* Client Details Section */}
                      <fieldset style={{ borderTop: '1px solid #70829A', padding: '16px', margin: '24px 0' }}>
                        <legend style={{
                          fontSize: '17px',
                          fontWeight: 500,
                          fontFamily: 'Inter',
                          marginTop: "-25px",
                          marginLeft: "-17px",
                          backgroundColor: "white",
                          width: "auto",
                          lineHeight: "1",
                          letterSpacing: 0,
                          color: "#70829A",
                          padding: "0 8px"
                        }}>
                          Client Details
                        </legend>

                        <Grid container spacing={3}>
                          <Grid item xs={12} md={4}>
                            <DropDownInput
                              formikField="companyId"
                              inputLabel="Company"
                              isRequired={false}
                              options={companies.map(c => ({ value: c.id, label: c.companyName }))}
                              value={values.companyId}
                            />
                          </Grid>

                          <Grid item xs={12} md={4}>
                            <DropDownInput
                              formikField="branchId"
                              inputLabel="Branch"
                              isRequired={false}
                            //   disabled={!selectedCompany}
                              options={[{ value: '', label: 'Select Branch' }]}
                              value={values.branchId}
                            />
                          </Grid>

                          <Grid item xs={12} md={4}>
                            <DropDownInput
                              formikField="contactPerson"
                              inputLabel="Contact Person"
                              isRequired={false}
                              options={[{ value: '', label: 'Select Contact Person' }]}
                              value={values.contactPerson}
                            />
                          </Grid>
                        </Grid>
                      </fieldset>

                      {/* Lead Details Section */}
                      <fieldset style={{ borderTop: '1px solid #70829A', padding: '16px', margin: '24px 0' }}>
                        <legend style={{
                          fontSize: '17px',
                          fontWeight: 500,
                          fontFamily: 'Inter',
                          marginTop: "-25px",
                          marginLeft: "-17px",
                          backgroundColor: "white",
                          width: "auto",
                          lineHeight: "1",
                          letterSpacing: 0,
                          color: "#70829A",
                          padding: "0 8px"
                        }}>
                          Lead Details
                        </legend>

                        <Grid container spacing={3}>
                          {/* Row 1: Lead Inquiry Date, Assigned To, Lead Source */}
                          <Grid item xs={12} md={4}>
                            <TextInput
                              formikField='leadInquiryDate'
                              label='Lead Inquiry Date'
                              isRequired={false}
                            />
                          </Grid>
                          <Grid item xs={12} md={4}>
                            <DropDownInput
                              formikField='leadAssignedTo'
                              inputLabel='Lead Assigned To'
                              isRequired={false}
                              options={[{ value: '', label: 'Select Lead Assigned To' }]}
                              value={values.leadAssignedTo}
                              placeholder='Select employee'
                            />

                          </Grid>
                          <Grid item xs={12} md={4}>
                            <DropDownInput
                              formikField="leadSource"
                              inputLabel="Lead Source"
                              isRequired={false}
                              options={[{ value: '', label: 'Select Lead Source' }]}
                              value={values.leadSource}
                              placeholder="Select lead source"
                            />

                          </Grid>

                          {/* Dynamic Referral Rows */}
                          {values.referrals.map((referral: any, index: any) => (
                            <Grid container spacing={3} sx={{ margin: "auto" }} key={referral.id}>
                              <Grid item xs={12} md={4}>
                                <Box sx={{ display: 'flex', flexDirection: "column", gap: 1 }}>
                                  <DropDownInput
                                    formikField={`referrals[${index}].referralType`}
                                    inputLabel='Referral Type'
                                    isRequired={false}
                                    options={referralTypes.map(type => ({
                                      value: type.id,
                                      label: type.name || 'Uncategorized Referral Type'
                                    }))}
                                    placeholder='Select referral type'
                                  />
                                </Box>
                              </Grid>
                              <Grid item xs={12} md={4}>
                                <Box sx={{ display: 'flex', flexDirection: "column", gap: 1 }}>
                                  <DropDownInput
                                    inputLabel="Referring Company"
                                    placeholder="Select company"
                                    isRequired={false}
                                    formikField={`referrals[${index}].referringCompany`}
                                    options={companies.map((c) => ({
                                      value: c.id,
                                      label: c.companyName,
                                    }))}
                                    onChange={(value: any) => {
                                      const companyValue = value?.value || value;
                                      setFieldValue(`referrals[${index}].referringCompany`, companyValue);
                                    }}
                                    value={
                                      values.referrals[index]?.referringCompany
                                        ? {
                                          value: values.referrals[index].referringCompany,
                                          label: companies.find((c) => c.id === values.referrals[index].referringCompany)?.companyName || "",
                                        }
                                        : null
                                    }
                                  />
                                  <div>
                                    {index === 0 && (
                                      <Button
                                        size="small"
                                        onClick={() => { /* Add new company logic */ }}
                                        sx={{ whiteSpace: 'nowrap', color: "#9D4141" }}
                                      >
                                        + New Company
                                      </Button>
                                    )}
                                  </div>
                                </Box>
                              </Grid>
                              <Grid item xs={12} md={4}>
                                <Box sx={{ display: 'flex', flexDirection: "column", gap: 1 }}>
                                  <DropDownInput
                                    inputLabel="Referring Contact"
                                    placeholder="Select contact person"
                                    isRequired={false}
                                    formikField={`referrals[${index}].referringContact`}
                                    options={contacts.map((contact) => ({
                                      value: contact.id,
                                      label: contact.fullName || 'Unnamed Contact',
                                    }))}
                                    onChange={(value: any) => {
                                      const contactId = value?.value || value;
                                      setFieldValue(`referrals[${index}].referringContact`, contactId);
                                    }}
                                    value={
                                      values.referrals[index]?.referringContact
                                        ? {
                                          value: values.referrals[index].referringContact,
                                          label: contacts.find((c) => c.id === values.referrals[index].referringContact)?.fullName || "",
                                        }
                                        : null
                                    }
                                  />
                                  <div>
                                    {index === 0 && (
                                      <Button
                                        size="small"
                                        onClick={() => { /* Add new contact logic */ }}
                                        sx={{ whiteSpace: 'nowrap', color: "#9D4141" }}
                                      >
                                        + New Contact
                                      </Button>
                                    )}
                                  </div>
                                </Box>
                              </Grid>


                            </Grid>
                          ))}

                          {/* Add Another Referral Button */}
                          <Grid item xs={12}>
                            <Button
                              variant="outlined"

                              startIcon={<Add />}
                              onClick={() => {
                                const newReferral = {
                                  id: Date.now().toString(),
                                  referralType: '',
                                  referringCompany: '',
                                  referringContact: ''
                                };
                                setFieldValue('referrals', [...values.referrals, newReferral]);
                              }}
                              sx={{
                                mt: 1, width: "100%", p: "10px 0px", borderStyle: 'dotted',
                                borderColor: '#DBB3B3',
                                borderWidth: '1px',
                                borderRadius: '12px',
                                color: "#9D4141"
                              }}
                            >
                              Add another Referral
                            </Button>
                          </Grid>
                        </Grid>
                      </fieldset>

                      <Box sx={{ display: 'flex', justifyContent: 'flex-start', gap: 2, mt: 3 }}>

                        <Button
                          type="submit"
                          variant="contained"
                          color="primary"
                          disabled={isSubmitting}
                          sx={{
                            backgroundColor: '#9D4141',
                            '&:hover': { backgroundColor: '#7e3434' },
                          }}
                        >
                          Update
                        </Button>
                      </Box>
                    </Box>
                  </FormikForm>
                )}
              </Formik>
            </Box>

          </Dialog>
        </div>
    )
}

export default FormModalBlank;