import React, { useRef, useEffect } from 'react';
import { KTIcon } from '@metronic/helpers';
import { payrollService } from '@modules/payroll/services/payrollService';
import { uploadUserAsset } from '@services/uploader';
import { sendContractBillToEmployee } from '@services/employee';
import { errorConfirmation } from '@utils/modal';
import { toast } from 'react-toastify';
import { Employee } from '@redux/slices/employee';

interface ContractBillSectionProps {
  employee: Employee | null;
  userId: string;
  employeeId: string;
  salaryId: string;
  loading: boolean;
  setLoading: (loading: boolean) => void;
}

const ContractBillSection: React.FC<ContractBillSectionProps> = ({
  employee,
  userId,
  employeeId,
  salaryId,
  loading,
  setLoading
}) => {
  const [isDownloading, setIsDownloading] = React.useState(false);
  const [isSending, setIsSending] = React.useState(false);
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isContractEmployee = !!(employee && (employee as any)?.professionalFeesEnabled);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDownloadContractBill = async () => {
    if (!salaryId) {
      alert('No contract bill data available for PDF generation');
      return;
    }

    setLoading(true);
    setIsDownloading(true);
    setDropdownOpen(false);

    try {
      const blob = await payrollService.downloadContractBill(salaryId);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      const empName = `${employee?.users?.firstName || ''} ${employee?.users?.lastName || ''}`.trim();
      const monthYear = new Date().toLocaleDateString('en-IN', {
        month: 'short',
        year: 'numeric'
      });
      link.setAttribute(
        'download',
        `Contract_Bill_${empName}_${monthYear}.pdf`.trim()
      );
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (e) {
      console.error(e);
      errorConfirmation('Failed to download contract bill PDF');
    } finally {
      setLoading(false);
      setIsDownloading(false);
    }
  };

  const handleEmailContractBill = async () => {
    if (!salaryId) {
      alert('No contract bill data available for PDF generation');
      return;
    }

    setLoading(true);
    setIsSending(true);
    setDropdownOpen(false);

    try {
      const blob = await payrollService.downloadContractBill(salaryId);
      const form = new FormData();
      const fileFinal = new File(
        [blob],
        `${userId}-ContractBill-${Date.now()}.pdf`,
        { type: 'application/pdf' }
      );
      form.append('file', fileFinal);

      const { data: { path } } = await uploadUserAsset(
        form,
        userId,
        'contractbill',
        'contract-docs'
      );

      const res = await sendContractBillToEmployee({
        path,
        employeeId,
      });

      if (res?.statusCode === 200 && !res.hasError) {
        const email = (employee as any)?.companyEmailId || (employee as any)?.users?.personalEmailId || 'Employee';
        toast.success(
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '4px', fontSize: '0.95rem' }}>
              Email Sent Successfully
            </div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '8px' }}>
              Contract bill delivered to:
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                backgroundColor: '#f8fafc',
                padding: '6px 10px',
                borderRadius: '8px',
                fontSize: '0.8rem',
                color: '#334155',
                fontWeight: 600,
                border: '1px solid #e2e8f0'
              }}>
                <span style={{ marginRight: '8px', fontSize: '1.1em' }}>✉️</span>
                {email}
              </div>
            </div>
          </div>,
          {
            position: 'bottom-right',
            autoClose: 6000,
            style: {
              borderRadius: '12px',
              padding: '16px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
            }
          }
        );
      } else {
        errorConfirmation('Failed to send contract bill. Please try again.');
      }
    } catch (error) {
      console.error('Failed to send contract bill:', error);
      errorConfirmation('Failed to send contract bill. Please try again.');
    } finally {
      setLoading(false);
      setIsSending(false);
    }
  };

  if (!isContractEmployee) {
    return null;
  }

  return (
    <div
      className="d-flex flex-wrap justify-content-end align-items-center gap-3"
      style={{ pointerEvents: 'auto', filter: 'none', marginBottom: '1rem' }}
      ref={dropdownRef}
    >
      {salaryId && (
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            disabled={loading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '10px 22px',
              border: '1.5px solid #AA393D',
              borderRadius: '8px',
              background: 'transparent',
              color: '#AA393D',
              fontWeight: 600,
              fontSize: '14px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              transition: 'all 0.2s',
              whiteSpace: 'nowrap',
            } as React.CSSProperties}
            onMouseEnter={(e) => {
              if (!loading) {
                (e.currentTarget as HTMLButtonElement).style.background = '#AA393D';
                (e.currentTarget as HTMLButtonElement).style.color = '#fff';
              }
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
              (e.currentTarget as HTMLButtonElement).style.color = '#AA393D';
            }}
          >
            <KTIcon iconName="file-invoice" className="fs-5" />
            Contract Bill
            <KTIcon iconName="down" className="fs-6" />
          </button>

          {dropdownOpen && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '8px',
                backgroundColor: '#fff',
                border: '1.5px solid #e2e8f0',
                borderRadius: '8px',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                zIndex: 1000,
                minWidth: '200px',
                overflow: 'hidden',
              }}
            >
              <button
                onClick={handleDownloadContractBill}
                disabled={loading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  width: '100%',
                  padding: '12px 16px',
                  border: 'none',
                  background: 'transparent',
                  color: '#334155',
                  fontWeight: 500,
                  fontSize: '14px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  borderBottom: '1px solid #f1f5f9',
                  transition: 'all 0.2s',
                  textAlign: 'left',
                } as React.CSSProperties}
                onMouseEnter={(e) => {
                  if (!loading) {
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#f8fafc';
                  }
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
                }}
              >
                <span style={{ color: '#AA393D', display: 'flex', alignItems: 'center' }}>
                  <KTIcon iconName="file-down" className="fs-5" />
                </span>
                <span>{isDownloading ? 'Downloading...' : 'Download Bill'}</span>
              </button>

              <button
                onClick={handleEmailContractBill}
                disabled={loading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  width: '100%',
                  padding: '12px 16px',
                  border: 'none',
                  background: 'transparent',
                  color: '#334155',
                  fontWeight: 500,
                  fontSize: '14px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  textAlign: 'left',
                } as React.CSSProperties}
                onMouseEnter={(e) => {
                  if (!loading) {
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#f8fafc';
                  }
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
                }}
              >
                <span style={{ color: '#AA393D', display: 'flex', alignItems: 'center' }}>
                  <KTIcon iconName="sms" className="fs-5" />
                </span>
                <span>{isSending ? 'Sending...' : 'Email Bill'}</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default React.memo(ContractBillSection);
