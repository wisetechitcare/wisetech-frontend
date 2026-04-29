import React, { useEffect, useState } from 'react';
import { Modal, Button } from 'react-bootstrap';
import { Formik, FormikProps } from 'formik';
import * as Yup from 'yup';
import dayjs from 'dayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TextField } from '@mui/material';
import { createSalaryHistory, fetchSalaryHistory } from '@services/company';
import { successConfirmation, errorConfirmation } from '@utils/modal';
import { formatNumber } from '@utils/statistics';
import { useSelector } from 'react-redux';
import { RootState } from '@redux/store';

interface SalaryIncrementModalProps {
    show: boolean;
    onHide: () => void;
    employee: {
        id: string;
        ctcInLpa?: string;
    };
    onSuccess?: () => void;
    fromAdmin?: boolean;
}

interface FormValues {
    effectiveFrom: string;
    ctcInLpa: string;
}

const salaryIncrementSchema = Yup.object({
    effectiveFrom: Yup.date()
        .min(dayjs().startOf('month').toDate(), 'Please choose current month or a future month')
        .required('Starting month is required'),
    ctcInLpa: Yup.number()
        .positive('CTC must be a positive number')
        .required('New CTC is required')
        .typeError('CTC must be a valid number')
});

const SalaryIncrementModal: React.FC<SalaryIncrementModalProps> = ({
    show,
    onHide,
    employee,
    onSuccess,
    fromAdmin = false
}) => {
    const [loading, setLoading] = useState(false);
    const [selectedDate, setSelectedDate] = useState(dayjs());
    const selectedEmployee = useSelector((state: RootState) => state.employee.selectedEmployee)
    const [salaryHistory, setSalaryHistory] = useState<any[]>([]);
    const [ctcInLPA, setCtcInLPA] = useState('');
    let employeeName = `${selectedEmployee.users.firstName}`;
    // const ctcInLPA = salaryHistory?.[0]?.ctcInLpa;
    let initialValues: FormValues = {
        effectiveFrom: dayjs().startOf('month').format('YYYY-MM-DD'),
        ctcInLpa: ctcInLPA
    };

    console.log("salaryHistory:: ",salaryHistory);
    

    const handleSubmit = async (values: FormValues) => {
        try {
            setLoading(true);
            
            const payload = {
                employeeId: employee.id,
                effectiveFrom: values.effectiveFrom,
                ctcInLpa: parseFloat(values.ctcInLpa),
                createdBy: undefined // This should be set from user context if available
            };

            await createSalaryHistory(payload);
            
            successConfirmation('Salary increment created successfully');
            onHide();
            if (onSuccess) {
                onSuccess();
            }
        } catch (error: any) {
            console.error('Error creating salary increment:', error);
            const errorMessage = error?.response?.data?.message || 'Failed to create salary increment. Please try again.';
            errorConfirmation(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleDateChange = (newValue: any, formikProps: FormikProps<FormValues>) => {
        if (newValue && newValue.isValid()) {
            const formattedDate = newValue.format('YYYY-MM-DD');
            formikProps.setFieldValue('effectiveFrom', formattedDate);
            setSelectedDate(newValue);
        }
    };

    const formatCTCDisplay = (value: string) => {
        if (!value) return '';
        const numValue = parseFloat(value);
        if (isNaN(numValue)) return value;
        return formatNumber(numValue);
    };

    const handleClose = () => {
        setSelectedDate(dayjs());
        onHide();
    };

    useEffect(()=>{
        const fetchSalaryHistoryData = async () => {
            try {
                console.log("selectedDateselectedDate:: ",selectedDate);
                
                const effectiveFromMonth = dayjs(selectedDate).startOf('month').format('YYYY-MM-DD')
                console.log("effectiveFromMonth:: ",effectiveFromMonth);
                const response = await fetchSalaryHistory(employee.id, effectiveFromMonth);
                setCtcInLPA(response?.data?.salaryHistories?.[0]?.ctcInLpa)
                console.log("responseFetchedfetchSalaryHistoryData:: ",response)
                setSalaryHistory(response?.data?.salaryHistories)
            } catch (error) {
                console.error('Error fetching salary history:', error);
            }
        };
        fetchSalaryHistoryData();
    },[selectedDate])


    return (
        <Modal show={show} onHide={handleClose} centered size="lg">
            <Modal.Header closeButton style={{ border: 'none', paddingBottom: '8px' }}>
                <Modal.Title style={{ 
                    fontFamily: 'Barlow, sans-serif',
                    fontWeight: 600,
                    fontSize: '24px',
                    color: 'black',
                    letterSpacing: '0.24px'
                }}>
                    Increment Salary for {employeeName}
                </Modal.Title>
            </Modal.Header>
            <hr style={{ margin: '0 44px', height: '1px', border: 'none', backgroundColor: '#e0e0e0' }} />
            
            <Modal.Body style={{ padding: '28px 44px 40px 44px' }}>
                <Formik
                    initialValues={initialValues}
                    validationSchema={salaryIncrementSchema}
                    onSubmit={handleSubmit}
                >
                    {(formikProps) => {
                        const { values, errors, touched, setFieldValue, setFieldTouched } = formikProps;
                        useEffect(()=>{
                            setFieldValue('ctcInLpa', ctcInLPA)
                        },[ctcInLPA])
                        return (
                            <form onSubmit={formikProps.handleSubmit}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    {/* Month Selection */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        <label style={{
                                            fontFamily: 'Inter, sans-serif',
                                            fontWeight: 500,
                                            fontSize: '14px',
                                            color: 'black',
                                            margin: 0
                                        }}>
                                            Choose starting month for new increment
                                        </label>
                                        
                                        <LocalizationProvider dateAdapter={AdapterDayjs}>
                                            <DatePicker
                                                value={selectedDate}
                                                onChange={(newValue) => handleDateChange(newValue, formikProps)}
                                                views={['year', 'month']}
                                                format="MMMM, YYYY"
                                                minDate={dayjs().startOf('month')}
                                                slotProps={{
                                                    textField: {
                                                        fullWidth: true,
                                                        sx: {
                                                            '& .MuiOutlinedInput-root': {
                                                                backgroundColor: '#eef1f7',
                                                                border: errors.effectiveFrom && touched.effectiveFrom 
                                                                    ? '1px solid #b72b2b' 
                                                                    : 'none',
                                                                borderRadius: '7px',
                                                                fontFamily: 'Inter, sans-serif',
                                                                fontSize: '14px',
                                                                '& fieldset': {
                                                                    border: 'none'
                                                                },
                                                                '&:hover fieldset': {
                                                                    border: 'none'
                                                                },
                                                                '&.Mui-focused fieldset': {
                                                                    border: 'none'
                                                                }
                                                            },
                                                            '& .MuiInputBase-input': {
                                                                padding: '14px 16px',
                                                                fontFamily: 'Inter, sans-serif',
                                                                fontSize: '14px',
                                                                color: 'black'
                                                            }
                                                        }
                                                    }
                                                }}
                                            />
                                        </LocalizationProvider>
                                        
                                        {errors.effectiveFrom && touched.effectiveFrom && (
                                            <p style={{
                                                fontFamily: 'Inter, sans-serif',
                                                fontWeight: 500,
                                                fontSize: '14px',
                                                color: '#b72b2b',
                                                margin: 0
                                            }}>
                                                {errors.effectiveFrom}
                                            </p>
                                        )}
                                    </div>

                                    {/* CTC Input */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        <label style={{
                                            fontFamily: 'Inter, sans-serif',
                                            fontWeight: 500,
                                            fontSize: '14px',
                                            color: 'black',
                                            margin: 0
                                        }}>
                                            New CTC
                                        </label>
                                        
                                        <input
                                            type="text"
                                            value={values.ctcInLpa}
                                            onChange={(e) => {
                                                const value = e.target.value.replace(/[^0-9.]/g, '');
                                                setFieldValue('ctcInLpa', value);
                                            }}
                                            onBlur={() => setFieldTouched('ctcInLpa', true)}
                                            placeholder="Enter CTC amount"
                                            style={{
                                                width: '100%',
                                                backgroundColor: '#eef1f7',
                                                border: 'none',
                                                borderRadius: '7px',
                                                padding: '14px 16px',
                                                fontFamily: 'Inter, sans-serif',
                                                fontSize: '14px',
                                                color: 'black',
                                                outline: 'none'
                                            }}
                                        />
                                        
                                        {values.ctcInLpa && !errors.ctcInLpa && (
                                            <p style={{
                                                fontFamily: 'Inter, sans-serif',
                                                fontSize: '12px',
                                                color: '#666',
                                                margin: 0
                                            }}>
                                                Formatted: {formatCTCDisplay(values.ctcInLpa)}
                                            </p>
                                        )}
                                        
                                        {errors.ctcInLpa && touched.ctcInLpa && (
                                            <p style={{
                                                fontFamily: 'Inter, sans-serif',
                                                fontWeight: 500,
                                                fontSize: '14px',
                                                color: '#b72b2b',
                                                margin: 0
                                            }}>
                                                {errors.ctcInLpa}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Submit Button */}
                                <div style={{ marginTop: '28px' }}>
                                    <Button
                                        type="submit"
                                        disabled={loading || !formikProps.isValid}
                                        style={{
                                            backgroundColor: '#9d4141',
                                            borderColor: '#9d4141',
                                            borderRadius: '6px',
                                            height: '40px',
                                            padding: '0 20px',
                                            fontFamily: 'Inter, sans-serif',
                                            fontWeight: 500,
                                            fontSize: '14px',
                                            color: 'white',
                                            border: 'none',
                                            cursor: loading ? 'not-allowed' : 'pointer',
                                            opacity: loading || !formikProps.isValid ? 0.6 : 1
                                        }}
                                    >
                                        {loading ? (
                                            <span>
                                                Please wait...
                                                <span className="spinner-border spinner-border-sm ms-2" role="status" />
                                            </span>
                                        ) : (
                                            'Submit'
                                        )}
                                    </Button>
                                </div>
                            </form>
                        );
                    }}
                </Formik>
            </Modal.Body>
        </Modal>
    );
};

export default SalaryIncrementModal;