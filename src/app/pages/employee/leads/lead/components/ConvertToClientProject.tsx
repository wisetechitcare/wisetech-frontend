import React, { useState, useEffect } from 'react';
import { Modal, Button, Typography, Box, Grid, IconButton } from '@mui/material';
import { Formik } from 'formik';
import { Add, Close } from '@mui/icons-material';
import TextInput from '@app/modules/common/inputs/TextInput';
import DropDownInput from '@app/modules/common/inputs/DropdownInput';

interface ConvertToClientProjectProps {
    show: boolean;
    onHide: () => void;
    onConvert: (projectData: any) => void;
    leadName?: string;
}

const ConvertToClientProject: React.FC<ConvertToClientProjectProps> = ({
    show,
    onHide,
    onConvert,
    leadName = ''
}) => {
    const [projectModalOpen, setProjectModalOpen] = useState(show);
    const [projectFormData, setProjectFormData] = useState({
        projectName: leadName ? `${leadName} Project` : '',
        service: '',
        category: '',
        subCategory: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        rate: '',
        cost: '',
        description: '',
        leadInquiryDate: '',
        leadAssignedTo: '',
        leadSource: '',
        referrals: [{
            id: '1',
            serviceId: '',
            companyId: '',
            branchId: '',
            contactPerson: ''
        }]
    });

    // Sample data - replace with your actual data fetching logic
    const services = [{ id: '1', name: 'Web Development' }];
    const categories = [{ id: '1', name: 'Software' }];
    const subcategories = [{ id: '1', name: 'Web Application' }];

    useEffect(() => {
        setProjectModalOpen(show);
        if (leadName && !projectFormData.projectName) {
            setProjectFormData(prev => ({
                ...prev,
                projectName: `${leadName} Project`
            }));
        }
    }, [show, leadName]);

    const handleClose = () => {
        setProjectModalOpen(false);
        onHide();
    };

    // Function to add a new referral row
    const handleAddReferral = (setFieldValue: any, values: any) => {
        const newReferral = {
            id: (values.referrals.length + 1).toString(),
            serviceId: '',
            companyId: '',
            branchId: '',
            contactPerson: ''
        };
        setFieldValue('referrals', [...values.referrals, newReferral]);
    };

    return (
        <Modal
            open={projectModalOpen}
            onClose={handleClose}
            aria-labelledby="modal-project-creation"
            aria-describedby="modal-project-creation-description"
            sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: "80px"
            }}
        >
            <Box sx={{
                position: 'relative',
                width: '90%',
                maxWidth: '1100px',
                maxHeight: '90vh',
                overflowY: 'auto',
                bgcolor: 'background.paper',
                boxShadow: 24,
                p: 4,
                borderRadius: '8px',
            }}>
                <IconButton
                    onClick={handleClose}
                    sx={{
                        position: 'absolute',
                        right: 16,
                        top: 16,
                        color: 'text.secondary',
                    }}
                >
                    <Close />
                </IconButton>

                <Typography variant="h6" component="h2" sx={{ mb: 3, fontWeight: 600 }}>
                    Create New Project
                </Typography>

                <Formik
                    initialValues={projectFormData}
                    onSubmit={(values, { setSubmitting }) => {
                        // Create a single object with all form data
                        // const formData = {
                        //     // Basic Project Info
                        //     projectName: values.projectName,
                        //     service: values.service,
                        //     category: values.category,
                        //     subCategory: values.subCategory,
                            
                        //     // Project Dates
                        //     startDate: values.startDate,
                        //     endDate: values.endDate,
                            
                        //     // Financials
                        //     rate: values.rate,
                        //     cost: values.cost,
                            
                        //     // Project Details
                        //     description: values.description,
                        //     poNumber: values.poNumber,
                        //     poDate: values.poDate,
                        //     projectManager: values.projectManager,
                        //     teamId: values.teamId,
                            
                        //     // Project Address
                        //     projectAddress: values.projectAddress,
                        //     projectZipcode: values.projectZipcode,
                        //     projectMapLocation: values.projectMapLocation,
                        //     countryId: values.countryId,
                        //     stateId: values.stateId,
                        //     cityId: values.cityId,
                        //     localityId: values.localityId,
                            
                        //     // Lead Information
                        //     leadInquiryDate: values.leadInquiryDate,
                        //     leadAssignedTo: values.leadAssignedTo,
                        //     leadSource: values.leadSource,
                            
                        //     // Referrals (array of objects)
                        //     referrals: values.referrals.map(ref => ({
                        //         serviceId: ref.serviceId,
                        //         companyId: ref.companyId,
                        //         branchId: ref.branchId,
                        //         contactPerson: ref.contactPerson
                        //     })),
                            
                        //     // External Stakeholders (array of objects)
                        //     externalStakeholders: values.externalStakeholders?.map(stakeholder => ({
                        //         name: stakeholder.name,
                        //         email: stakeholder.email,
                        //         company: stakeholder.company,
                        //         role: stakeholder.role
                        //     })) || []
                        // };
                        
                        // Log the complete form data as a single object
                        // console.log('Form Data:', JSON.parse(JSON.stringify(formData)));
                        
                        // onConvert(formData);
                        setSubmitting(false);
                        handleClose();
                    }}
                >
                    {({ values, handleChange, handleSubmit, isSubmitting, setFieldValue }) => (
                        <form onSubmit={handleSubmit}>
                            <Box sx={{ mb: 4 }}>
                                <fieldset
                                    style={{
                                        borderTop: '1px solid #70829A',
                                        padding: '16px',
                                        margin: 0,
                                    }}
                                >
                                    <legend
                                        style={{
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
                                            paddingRight: "20px"
                                        }}
                                    >
                                        Project Details
                                    </legend>

                                    <Grid container spacing={3}>
                                        <Grid item xs={12} md={6}>
                                            <TextInput
                                                formikField='projectName'
                                                label='Project Name'
                                                isRequired={true}

                                            />
                                        </Grid>

                                        <Grid item xs={12} md={6}>
                                            <Box sx={{ display: 'flex', flexDirection: "column", gap: 0 }}>
                                                <DropDownInput
                                                    formikField="service"
                                                    inputLabel="Service"
                                                    isRequired={true}
                                                    options={services.map(service => ({
                                                        value: service.id,
                                                        label: service.name || 'Unnamed Service'
                                                    }))}
                                                    placeholder='Select service'
                                                />
                                                <div>
                                                    <Button
                                                        size="small"
                                                        onClick={() => {/* Add new service logic */ }}
                                                        sx={{ whiteSpace: 'nowrap', color: "#9D4141" }}
                                                    >
                                                        + New Service
                                                    </Button>
                                                </div>
                                            </Box>
                                        </Grid>

                                        <Grid item xs={12} md={6}>
                                            <Box sx={{ display: 'flex', flexDirection: "column", gap: 0 }}>
                                                <DropDownInput
                                                    formikField="category"
                                                    inputLabel="Project Category"
                                                    isRequired={true}
                                                    options={categories.map(category => ({
                                                        value: category.id,
                                                        label: category.name || 'Uncategorized'
                                                    }))}
                                                    placeholder='Select category'
                                                />
                                                <div>
                                                    <Button
                                                        size="small"
                                                        onClick={() => {/* Add new category logic */ }}
                                                        sx={{ whiteSpace: 'nowrap', color: "#9D4141" }}
                                                    >
                                                        + New Category
                                                    </Button>
                                                </div>
                                            </Box>
                                        </Grid>

                                        <Grid item xs={12} md={6}>
                                            <Box sx={{ display: 'flex', flexDirection: "column", gap: 0 }}>
                                                <DropDownInput
                                                    formikField="subCategory"
                                                    inputLabel="Project Subcategory"
                                                    isRequired={true}
                                                    options={subcategories.map(subcategory => ({
                                                        value: subcategory.id,
                                                        label: subcategory.name || 'Uncategorized'
                                                    }))}
                                                    placeholder='Select subcategory'
                                                />
                                                <div>
                                                    <Button
                                                        size="small"
                                                        onClick={() => {/* Add new subcategory logic */ }}
                                                        sx={{ whiteSpace: 'nowrap', color: "#9D4141" }}
                                                    >
                                                        + New Subcategory
                                                    </Button>
                                                </div>
                                            </Box>
                                        </Grid>

                                        <Grid item xs={12} md={6}>
                                            <TextInput
                                                formikField='startDate'
                                                label='Start Date'
                                                isRequired={true}

                                            />
                                        </Grid>

                                        <Grid item xs={12} md={6}>
                                            <TextInput
                                                formikField='endDate'
                                                label='End Date'
                                                isRequired={false}

                                            />
                                        </Grid>

                                        <Grid item xs={12} md={6}>
                                            <TextInput
                                                formikField='rate'
                                                label='Rate'
                                                isRequired={false}

                                            />
                                        </Grid>

                                        <Grid item xs={12} md={6}>
                                            <TextInput
                                                formikField='cost'
                                                label='Cost'
                                                isRequired={false}

                                            />
                                        </Grid>

                                        <Grid item xs={12}>
                                            <TextInput
                                                formikField='description'
                                                label='Description'
                                                isRequired={false}

                                            />
                                        </Grid>
                                    </Grid>
                                </fieldset>
                                <fieldset
                                    style={{
                                        borderTop: '1px solid #70829A',
                                        paddingLeft: 0,
                                        padding: '16px',
                                        marginTop: '24px',
                                        marginBottom: '16px'
                                    }}
                                >
                                    <legend
                                        style={{
                                            fontSize: '17x',
                                            fontWeight: 500,
                                            fontFamily: 'Inter',
                                            marginTop: "-25px",
                                            marginLeft: "-17px",
                                            backgroundColor: "white",
                                            width: "auto",
                                            lineHeight: "1",
                                            letterSpacing: 0,
                                            color: "#70829A",
                                            paddingRight: "20px"
                                        }}
                                        className="fw-medium"
                                    >
                                        Client Details
                                    </legend>

                                    <Grid container spacing={3}>
                                        {/* Row 1: Client Company (dropdown), Branch (text), Contact Person (text) */}
                                        <Grid item xs={12} md={3}>
                                            <Box sx={{ display: 'flex', flexDirection: "column", gap: 0 }}>
                                                <DropDownInput
                                                    inputLabel="Services"
                                                    placeholder="Select service"
                                                    isRequired={true}
                                                    formikField="serviceId"
                                                    options={[]}
                                                />
                                            </Box>
                                        </Grid>
                                        <Grid item xs={12} md={3}>
                                            <Box sx={{ display: 'flex', flexDirection: "column", gap: 0 }}>
                                                <DropDownInput
                                                    inputLabel="Company"
                                                    placeholder="Select company"
                                                    isRequired={true}
                                                    formikField="companyId"
                                                    options={[]}
                                                />
                                                <div>
                                                    <Button
                                                        // variant=""
                                                        size="small"
                                                        onClick={() => {/* Add new service logic */ }}
                                                        sx={{ whiteSpace: 'nowrap', color: "#9D4141" }}
                                                    >
                                                        + New Company
                                                    </Button>
                                                </div>
                                            </Box>
                                        </Grid>

                                        {/* Branch Dropdown */}
                                        <Grid item xs={12} md={3}>
                                            <Box sx={{ display: 'flex', flexDirection: "column", gap: 0 }}>
                                                <DropDownInput
                                                    inputLabel="Branch"
                                                    placeholder={"Select branch"}
                                                    isRequired={true}
                                                    formikField="branchId"
                                                    options={[]}
                                                // disabled={!values.companyId}
                                                />
                                                <div>
                                                    <Button
                                                        // variant=""
                                                        size="small"
                                                        onClick={() => {/* Add new service logic */ }}
                                                        sx={{ whiteSpace: 'nowrap', color: "#9D4141" }}
                                                    >
                                                        + New Branch
                                                    </Button>
                                                </div>
                                            </Box>
                                        </Grid>

                                        {/* Role in Company */}
                                        <Grid item xs={12} md={3}>
                                            <Box sx={{ display: 'flex', flexDirection: "column", gap: 0 }}>
                                                <DropDownInput
                                                    inputLabel="Contact Person"
                                                    placeholder="Select contact person"
                                                    isRequired={true}
                                                    formikField="contactPerson"
                                                    options={[]}
                                                />
                                                <div>
                                                    <Button
                                                        // variant=""
                                                        size="small"
                                                        onClick={() => {/* Add new service logic */ }}
                                                        sx={{ whiteSpace: 'nowrap', color: "#9D4141" }}
                                                    >
                                                        + New Contact
                                                    </Button>
                                                </div>
                                            </Box>
                                        </Grid>

                                    </Grid>
                                </fieldset>
                                <fieldset
                                    style={{
                                        borderTop: '1px solid #70829A',
                                        paddingLeft: 0,
                                        padding: '16px',
                                        marginTop: '24px',
                                        marginBottom: '16px'
                                    }}
                                >
                                    <legend
                                        style={{
                                            fontSize: '17x',
                                            fontWeight: 500,
                                            fontFamily: 'Inter',
                                            marginTop: "-25px",
                                            marginLeft: "-17px",
                                            backgroundColor: "white",
                                            width: "auto",
                                            lineHeight: "1",
                                            letterSpacing: 0,
                                            color: "#70829A",
                                            paddingRight: "20px"
                                        }}
                                        className="fw-medium"
                                    >
                                        Add External Stakeholders
                                    </legend>

                                    <Grid container spacing={3}>

                                        {/* Dynamic Referral Rows */}
                                        {values.referrals.map((referral, index) => (
                                            <React.Fragment key={referral.id}>
                                                <Grid item xs={12} md={3}>
                                                    <Box sx={{ display: 'flex', flexDirection: "column", gap: 0 }}>
                                                        <DropDownInput
                                                            inputLabel="Services"
                                                            placeholder="Select service"
                                                            isRequired={true}
                                                            formikField={`referrals[${index}].serviceId`}
                                                            options={[]}
                                                        />
                                                    </Box>
                                                </Grid>
                                                <Grid item xs={12} md={3}>
                                                    <Box sx={{ display: 'flex', flexDirection: "column", gap: 0 }}>
                                                        <DropDownInput
                                                            inputLabel="Company"
                                                            placeholder="Select company"
                                                            isRequired={true}
                                                            formikField={`referrals[${index}].companyId`}
                                                            options={[]}
                                                        />
                                                        <div>
                                                            <Button
                                                                size="small"
                                                                onClick={() => { /* Add new company logic */ }}
                                                                sx={{ whiteSpace: 'nowrap', color: "#9D4141" }}
                                                            >
                                                                + New Company
                                                            </Button>
                                                        </div>
                                                    </Box>
                                                </Grid>
                                                <Grid item xs={12} md={3}>
                                                    <Box sx={{ display: 'flex', flexDirection: "column", gap: 0 }}>
                                                        <DropDownInput
                                                            inputLabel="Branch"
                                                            placeholder="Select branch"
                                                            isRequired={true}
                                                            formikField={`referrals[${index}].branchId`}
                                                            options={[]}
                                                        />
                                                        <div>
                                                            <Button
                                                                size="small"
                                                                onClick={() => { /* Add new branch logic */ }}
                                                                sx={{ whiteSpace: 'nowrap', color: "#9D4141" }}
                                                            >
                                                                + New Branch
                                                            </Button>
                                                        </div>
                                                    </Box>
                                                </Grid>
                                                <Grid item xs={12} md={3}>
                                                    <Box sx={{ display: 'flex', flexDirection: "column", gap: 0 }}>
                                                        <DropDownInput
                                                            inputLabel="Contact Person"
                                                            placeholder="Select contact person"
                                                            isRequired={true}
                                                            formikField={`referrals[${index}].contactPerson`}
                                                            options={[]}
                                                        />
                                                        <div>
                                                            <Button
                                                                size="small"
                                                                onClick={() => { /* Add new contact logic */ }}
                                                                sx={{ whiteSpace: 'nowrap', color: "#9D4141" }}
                                                            >
                                                                + New Contact
                                                            </Button>
                                                        </div>
                                                    </Box>
                                                </Grid>
                                            </React.Fragment>
                                        ))}

                                        {/* Add Another Referral Button */}
                                        <Grid item xs={12}>
                                            <Button
                                                variant="outlined"
                                                startIcon={<Add />}
                                                onClick={() => handleAddReferral(setFieldValue, values)}
                                                sx={{
                                                    mt: 1,
                                                    width: "100%",
                                                    p: "10px 0px",
                                                    borderStyle: 'dotted',
                                                    borderColor: '#DBB3B3',
                                                    borderWidth: '1px',
                                                    color: '#9D4141',
                                                    '&:hover': {
                                                        borderColor: '#9D4141',
                                                        backgroundColor: 'rgba(157, 65, 65, 0.04)'
                                                    }
                                                }}
                                            >
                                                Add Another Referral
                                            </Button>
                                        </Grid>
                                    </Grid>
                                </fieldset>
                                <fieldset
                                    style={{
                                        borderTop: '1px solid #70829A',
                                        paddingLeft: 0,
                                        padding: '16px',
                                        marginTop: '24px',
                                        marginBottom: '16px'
                                    }}
                                >
                                    <legend
                                        style={{
                                            fontSize: '17x',
                                            fontWeight: 500,
                                            fontFamily: 'Inter',
                                            marginTop: "-25px",
                                            marginLeft: "-17px",
                                            backgroundColor: "white",
                                            width: "auto",
                                            lineHeight: "1",
                                            letterSpacing: 0,
                                            color: "#70829A",
                                            paddingRight: "20px"
                                        }}
                                        className="fw-medium"
                                    >
                                        Additional Details
                                    </legend>

                                    <Grid container spacing={3}>
                                        {/* Row 1: Client Company (dropdown), Branch (text), Contact Person (text) */}
                                        <Grid item xs={12} md={12}>
                                            <Box sx={{ display: 'flex', flexDirection: "column", gap: 0 }}>
                                                <DropDownInput
                                                    inputLabel="Services"
                                                    placeholder="Select service"
                                                    isRequired={true}
                                                    formikField="serviceId"
                                                    options={[]}
                                                />
                                            </Box>
                                        </Grid>

                                        <Grid container spacing={3} sx={{mx:"auto"}}>
                                            <Grid item xs={12} md={4}>
                                                <Box sx={{ display: 'flex', flexDirection: "column", gap: 0 }}>
                                                    <TextInput
                                                        formikField='projectAddress'
                                                        label='Project Address'
                                                        isRequired={true}

                                                    />
                                                </Box>
                                            </Grid>
                                            <Grid item xs={12} md={4}>
                                                <Box sx={{ display: 'flex', flexDirection: "column", gap: 0 }}>
                                                    <TextInput
                                                        formikField='projectZipcode'
                                                        label='P. Zipcode'
                                                        isRequired={true}

                                                    />
                                                </Box>
                                            </Grid>

                                            {/* Branch Dropdown */}
                                            <Grid item xs={12} md={4}>
                                                <Box sx={{ display: 'flex', flexDirection: "column", gap: 0 }}>
                                                    <TextInput
                                                        formikField='projectMapLocation'
                                                        label='P. Map Location'
                                                        isRequired={true}

                                                    />
                                                </Box>
                                            </Grid>
                                        </Grid>


                                        <Grid container spacing={3} sx={{mx:"auto"}}>

                                            <Grid item xs={12} md={3}>
                                                <Box sx={{ display: 'flex', flexDirection: "column", gap: 0 }}>
                                                    <DropDownInput
                                                        inputLabel="P. Country"
                                                        placeholder="Select country"
                                                        isRequired={true}
                                                        formikField="countryId"
                                                        options={[]}
                                                    />
                                                </Box>
                                            </Grid>
                                            <Grid item xs={12} md={3}>
                                                <Box sx={{ display: 'flex', flexDirection: "column", gap: 0 }}>
                                                    <DropDownInput
                                                        inputLabel="P. State"
                                                        placeholder="Select state"
                                                        isRequired={true}
                                                        formikField="stateId"
                                                        options={[]}
                                                    />
                                                </Box>
                                            </Grid>
                                            <Grid item xs={12} md={3}>
                                                <Box sx={{ display: 'flex', flexDirection: "column", gap: 0 }}>
                                                    <DropDownInput
                                                        inputLabel="P. City"
                                                        placeholder={"Select city"}
                                                        isRequired={true}
                                                        formikField="cityId"
                                                        options={[]}
                                                    // disabled={!values.companyId}
                                                    />
                                                   
                                                </Box>
                                            </Grid>
                                            <Grid item xs={12} md={3}>
                                                <Box sx={{ display: 'flex', flexDirection: "column", gap: 0 }}>
                                                    <DropDownInput
                                                        inputLabel="P. Locality"
                                                        placeholder="Select locality"
                                                        isRequired={true}
                                                        formikField="localityId"
                                                        options={[]}
                                                    />
                                                </Box>
                                            </Grid>

                                        </Grid>
                                        <Grid container spacing={3} sx={{mx:"auto"}} >
                                            <Grid item xs={12} md={6}>
                                                <Box sx={{ display: 'flex', flexDirection: "column", gap: 0 }}>
                                                    <TextInput
                                                        formikField='poNumber'
                                                        label='PO Number'
                                                        isRequired={true}

                                                    />
                                                </Box>
                                            </Grid>
                                            <Grid item xs={12} md={6}>
                                                <Box sx={{ display: 'flex', flexDirection: "column", gap: 0 }}>
                                                    <TextInput
                                                        formikField='poDate'
                                                        label='PO Date'
                                                        isRequired={true}

                                                    />
                                                </Box>
                                            </Grid>

                                           
                                        </Grid>

                                    </Grid>
                                </fieldset>
                                <fieldset
                                    style={{
                                        borderTop: '1px solid #70829A',
                                        paddingLeft: 0,
                                        padding: '16px',
                                        marginTop: '24px',
                                        marginBottom: '16px'
                                    }}
                                >
                                    <legend
                                        style={{
                                            fontSize: '17x',
                                            fontWeight: 500,
                                            fontFamily: 'Inter',
                                            marginTop: "-25px",
                                            marginLeft: "-17px",
                                            backgroundColor: "white",
                                            width: "auto",
                                            lineHeight: "1",
                                            letterSpacing: 0,
                                            color: "#70829A",
                                            paddingRight: "20px"
                                        }}
                                        className="fw-medium"
                                    >
                                        Team Details
                                    </legend>

                                    <Grid container spacing={3} justifyContent="center" alignItems="center" sx={{ mx:"auto"}}>
                                        
                                        <Grid container spacing={3} >
                                            <Grid item xs={12} md={6}>
                                                <Box sx={{ display: 'flex', flexDirection: "column", gap: 0 }}>
                                                <DropDownInput
                                                            inputLabel="Choose Team"
                                                            placeholder="Select team"
                                                            isRequired={true}
                                                            formikField="teamId"
                                                            options={[]}
                                                        />
                                                </Box>
                                            </Grid>
                                            <Grid item xs={12} md={6}>
                                                <Box sx={{ display: 'flex', flexDirection: "column", gap: 0 }}>
                                                    <TextInput
                                                        formikField='projectManager'
                                                        label='Project Manager'
                                                        isRequired={true}
                                                    />
                                                </Box>
                                            </Grid>

                                           
                                        </Grid>

                                    </Grid>
                                </fieldset>
                                <fieldset
                                    style={{
                                        borderTop: '1px solid #70829A',
                                        paddingLeft: 0,
                                        padding: '16px',
                                        marginTop: '24px',
                                        marginBottom: '16px'
                                    }}
                                >
                                    <legend
                                        style={{
                                            fontSize: '17x',
                                            fontWeight: 500,
                                            fontFamily: 'Inter',
                                            marginTop: "-25px",
                                            marginLeft: "-17px",
                                            backgroundColor: "white",
                                            width: "auto",
                                            lineHeight: "1",
                                            letterSpacing: 0,
                                            color: "#70829A",
                                            paddingRight: "20px"
                                        }}
                                        className="fw-medium"
                                    >
                                        Portal Settings
                                    </legend>
                                    <Grid>
                                        <Grid container spacing={3}>
                                            <Grid item xs={12} md={6}>
                                                <Box sx={{ display: 'flex', flexDirection: "column", gap: 0 }}>
                                                    <DropDownInput
                                                        inputLabel="Project Access"
                                                        placeholder="Select Project Access"
                                                        isRequired={true}
                                                        formikField="projectAccess"
                                                        options={[]}
                                                    />
                                                </Box>
                                            </Grid>
                                            <Grid item xs={12} md={6}>
                                                <Box sx={{ display: 'flex', flexDirection: "column", gap: 0 }}>
                                                    <TextInput
                                                        formikField='description'
                                                        label='Description'
                                                        isRequired={true}

                                                    />
                                                </Box>
                                            </Grid>


                                        </Grid>
                                    </Grid>
                                </fieldset>

                                <Box sx={{ display: 'flex', justifyContent: 'flex-start', gap: 2, mt: 4 }}>
                                  
                                    <Button
                                        type="submit"
                                        variant="contained"
                                        disabled={isSubmitting}
                                        sx={{
                                            minWidth: '120px',
                                            padding: '12px 16px',
                                            backgroundColor: '#9D4141',
                                            '&:hover': { backgroundColor: '#7e3434' },
                                        }}
                                    >
                                        {isSubmitting ? 'Converting...' : 'Convert'}
                                    </Button>
                                </Box>
                            </Box>
                        </form>
                    )}
                </Formik>
            </Box>
        </Modal>
    );
};

export default ConvertToClientProject;