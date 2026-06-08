import React from 'react';
import { Button } from 'react-bootstrap';
import { PDFDownloadLink, pdf } from '@react-pdf/renderer';
import SalarySlipTemplate from '@pages/employee/salary/SalarySlipTemplate';
import { SalarySlipProps } from '@pages/employee/salary/utils/salarySlipDataTransformer';
import { uploadUserAsset } from '@services/uploader';
import { sendSalarySlipToEmployee } from '@services/employee';
import { successConfirmation, errorConfirmation } from '@utils/modal';

interface SalarySlipSectionProps {
    salarySlipProps: SalarySlipProps | null;
    userId: string;
    employeeId: string;
    loading: boolean;
    setLoading: (loading: boolean) => void;
}

const SalarySlipSection: React.FC<SalarySlipSectionProps> = ({
    salarySlipProps,
    userId,
    employeeId,
    loading,
    setLoading
}) => {
    const handleEmailSalarySlip = async () => {
        if (!salarySlipProps) {
            alert('No salary data available for PDF generation');
            return;
        }

        setLoading(true);
        try {
            const blob = await pdf(<SalarySlipTemplate {...salarySlipProps} />).toBlob();
            const form = new FormData();
            const fileFinal = new File([blob], `${userId}-SalarySlip-${Date.now()}.pdf`, { type: 'application/pdf' });
            form.append("file", fileFinal);
            
            const { data: { path } } = await uploadUserAsset(form, userId, "salaryreport", "salary-docs");
            
            const res = await sendSalarySlipToEmployee({
                path,
                employeeId,
                salaryData: salarySlipProps
            });

            if (res?.statusCode === 200 && !res.hasError) {
                successConfirmation("Salary slip sent successfully");
            } else {
                errorConfirmation("Failed to send salary slip. Please try again.");
            }
        } catch (error) {
            console.error("Failed to send salary slip:", error);
            errorConfirmation("Failed to send salary slip. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="d-flex flex-column align-items-stretch flex-sm-row justify-content-sm-end align-items-sm-center mb-4 gap-3">
            {salarySlipProps ? (
                <PDFDownloadLink 
                    document={<SalarySlipTemplate {...salarySlipProps} />} 
                    fileName={`SalarySlip_${userId}.pdf`}
                    style={{ textDecoration: 'none' }}
                >
                    {/* @ts-ignore */}
                    {({ loading: pdfLoading }: any) => (
                        <Button disabled={pdfLoading} className="w-100">
                            {pdfLoading ? 'Preparing PDF...' : 'Download Report (Pdf)'}
                        </Button>
                    )}
                </PDFDownloadLink>
            ) : (
                <Button disabled>No Data Available for PDF</Button>
            )}

            {salarySlipProps && (
                <Button 
                    className="wt-btn-primary" 
                    onClick={handleEmailSalarySlip}
                    disabled={loading}
                >
                    {loading ? "Please wait..." : "Email Salary Slip"}
                </Button>
            )}
        </div>
    );
};

export default React.memo(SalarySlipSection);
