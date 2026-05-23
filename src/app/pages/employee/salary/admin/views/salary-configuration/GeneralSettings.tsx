import { fetchAllEmployeesSelectedData, updateEmployee } from '@services/employee';
import React, { useState, useEffect } from 'react';
import { Modal } from 'react-bootstrap';
import { getAvatar } from '@utils/avatar';
import { fetchConfiguration, updateConfigurationById, createNewConfiguration } from '@services/company';
import { EXCLUDE_FROM_LATE_ATTENDANCE, PAYMENT_MODE } from '@constants/configurations-key';
import { successConfirmation } from '@utils/modal';

// Employee Interface
interface IEmployee {
  id: string;
  name: string;
  designation: string;
  avatar: string;
  gender: number;
}

// Transform API response to IEmployee format
const transformEmployeeData = (apiData: any): IEmployee[] => {
  if (!apiData?.data?.employees) {
    console.warn('No employee data received');
    return [];
  }

  return apiData.data.employees
    .filter((emp: any) => emp.isActive !== false)
    .map((emp: any) => ({
      id: emp.id || '',
      name: emp.users
        ? `${emp.users.firstName || ''} ${emp.users.lastName || ''}`.trim()
        : 'Unknown',
      designation: emp.designations?.role || 'N/A',
      avatar: getAvatar(emp.avatar || null, emp.gender ?? 0),
      gender: emp.gender ?? 0,
    }));
};

interface EmployeeSelectionModalProps {
  show: boolean;
  handleClose: () => void;
  onSave: (selectedIds: string[]) => void;
  employees: IEmployee[];
  initialSelection: string[];
  title: string;
}

const EmployeeSelectionModal: React.FC<EmployeeSelectionModalProps> = ({
  show,
  handleClose,
  onSave,
  employees,
  initialSelection,
  title,
}) => {
  const [tempSelection, setTempSelection] = useState<string[]>(initialSelection);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setTempSelection(initialSelection);
    setSearchTerm('');
  }, [initialSelection, show]);

  const toggleSelection = (id: string) => {
    setTempSelection((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const filteredEmployees = employees
    .filter(emp => 
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      emp.designation.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      const aSelected = tempSelection.includes(a.id);
      const bSelected = tempSelection.includes(b.id);
      if (aSelected && !bSelected) return -1;
      if (!aSelected && bSelected) return 1;
      return a.name.localeCompare(b.name);
    });

  const modalStyles = {
    header: {
      borderBottom: 'none',
      padding: '30px 40px 20px 40px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    title: {
      fontFamily: 'Barlow, sans-serif',
      fontWeight: 600,
      fontSize: '22px',
      color: '#000000',
      letterSpacing: '0.24px',
      margin: 0,
    },
    searchInput: {
      padding: '10px 16px',
      borderRadius: '8px',
      border: '1px solid #E1E3EA',
      fontFamily: 'Inter, sans-serif',
      fontSize: '14px',
      width: '300px',
      outline: 'none',
    },
    body: {
      padding: '0 40px 28px 40px',
      maxHeight: '600px',
      overflowY: 'auto' as const,
    },
    footer: {
      borderTop: 'none',
      padding: '0 40px 30px 40px',
      display: 'flex',
      justifyContent: 'flex-end',
    },
    employeeCard: (isSelected: boolean) => ({
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      padding: '16px',
      cursor: 'pointer',
      borderRadius: '8px',
      border: isSelected ? '1px solid #9d4141' : '1px solid #E1E3EA',
      backgroundColor: isSelected ? '#fdf3f4' : '#ffffff',
      transition: 'all 0.2s ease',
      height: '100%',
      boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
    }),
    avatar: {
      width: '50px',
      height: '50px',
      borderRadius: '50%',
      objectFit: 'cover' as const,
    },
    infoContainer: {
      display: 'flex',
      flexDirection: 'column' as const,
      flex: 1,
      overflow: 'hidden',
    },
    name: {
      fontFamily: 'Inter, sans-serif',
      fontWeight: 600,
      fontSize: '15px',
      color: '#181C32',
      marginBottom: '2px',
      whiteSpace: 'nowrap' as const,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    },
    designation: {
      fontFamily: 'Inter, sans-serif',
      fontWeight: 500,
      fontSize: '12px',
      color: '#A1A5B7',
      whiteSpace: 'nowrap' as const,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    },
    checkbox: (checked: boolean) => ({
      width: '24px',
      height: '24px',
      borderRadius: '6px', // Slightly squared for card design
      border: checked ? 'none' : '1.5px solid #E1E3EA',
      backgroundColor: checked ? '#9d4141' : 'transparent',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      transition: 'all 0.2s ease',
    }),
    saveBtn: {
      backgroundColor: '#9d4141',
      color: '#ffffff',
      border: 'none',
      borderRadius: '6px',
      padding: '12px 24px',
      fontFamily: 'Inter, sans-serif',
      fontWeight: 500,
      fontSize: '14px',
      cursor: 'pointer',
      transition: 'background-color 0.2s',
    },
  };

  return (
    <Modal show={show} onHide={handleClose} centered size="xl">
      <Modal.Header closeButton style={modalStyles.header}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <Modal.Title style={modalStyles.title}>
              {title}
            </Modal.Title>
          </div>
          <input 
            type="text" 
            placeholder="Search by name or designation..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={modalStyles.searchInput}
          />
        </div>
      </Modal.Header>
      <Modal.Body style={modalStyles.body}>
        <div className="row g-4">
          {filteredEmployees.length > 0 ? filteredEmployees.map((emp) => {
            const isSelected = tempSelection.includes(emp.id);
            return (
              <div key={emp.id} className="col-lg-4 col-md-6 col-sm-12">
                <div
                  style={modalStyles.employeeCard(isSelected)}
                  onClick={() => toggleSelection(emp.id)}
                >
                  <img src={emp.avatar} alt={emp.name} style={modalStyles.avatar} />
                  <div style={modalStyles.infoContainer}>
                    <span style={modalStyles.name} title={emp.name}>{emp.name}</span>
                    <span style={modalStyles.designation} title={emp.designation}>{emp.designation}</span>
                  </div>
                  <div style={modalStyles.checkbox(isSelected)}>
                    {isSelected && (
                      <i className="bi bi-check text-white" style={{ fontSize: '18px', fontWeight: 'bold' }}></i>
                    )}
                  </div>
                </div>
              </div>
            );
          }) : (
            <div className="col-12 text-center text-muted py-5">
              No employees found matching "{searchTerm}"
            </div>
          )}
        </div>
      </Modal.Body>
      <Modal.Footer style={modalStyles.footer}>
        <button style={modalStyles.saveBtn} onClick={() => onSave(tempSelection)}>
          Save Selection ({tempSelection.length})
        </button>
      </Modal.Footer>
    </Modal>
  );
};

function GeneralSettings() {
  const [paymentMode, setPaymentMode] = useState<'Hour Based' | 'Day Based'>('Hour Based');
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [employees, setEmployees] = useState<IEmployee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [configurationId, setConfigurationId] = useState<string>('');
  const [paymentModeConfigurationId, setPaymentModeConfigurationId] = useState<string>('');

  const styles = {
    container: {
      backgroundColor: '#f8f9fa',
      borderRadius: '16px',
      padding: '32px',
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '24px',
      margin: "24px 0px"
    },
    headerTitle: {
      fontFamily: 'Barlow, sans-serif',
      fontWeight: 700,
      fontSize: '28px',
      color: '#181C32',
      marginBottom: '8px',
      letterSpacing: '-0.5px',
    },
    sectionTitle: {
      fontFamily: 'Inter, sans-serif',
      fontWeight: 600,
      fontSize: '16px',
      color: '#181C32',
      marginBottom: '4px',
    },
    sectionDesc: {
      fontFamily: 'Inter, sans-serif',
      fontWeight: 500,
      fontSize: '13px',
      color: '#A1A5B7',
      margin: 0,
    },
    row: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '24px',
      backgroundColor: '#ffffff',
      border: '1px solid #E1E3EA',
      borderRadius: '16px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
      transition: 'box-shadow 0.2s ease',
    },
    dropdown: {
      padding: '10px 16px',
      borderRadius: '8px',
      border: '1px solid #E1E3EA',
      fontFamily: 'Inter, sans-serif',
      fontSize: '14px',
      fontWeight: 500,
      color: '#3F4254',
      minWidth: '220px',
      outline: 'none',
      backgroundColor: '#f9f9f9',
      cursor: 'pointer',
      transition: 'border-color 0.2s ease',
    },
    saveBtn: {
      backgroundColor: '#ffffff',
      border: '1px solid #E1E3EA',
      borderRadius: '8px',
      color: '#3F4254',
      padding: '10px 24px',
      fontFamily: 'Inter, sans-serif',
      fontWeight: 600,
      fontSize: '14px',
      cursor: 'pointer',
      marginLeft: '16px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      transition: 'all 0.2s ease',
    },
    badge: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#fdf3f4',
      color: '#9d4141',
      borderRadius: '8px',
      padding: '6px 12px',
      fontSize: '15px',
      fontWeight: 700,
      fontFamily: 'Inter, sans-serif',
      minWidth: '40px',
    },
    arrowBtn: {
      background: '#ffffff',
      border: '1px solid #E1E3EA',
      borderRadius: '8px',
      cursor: 'pointer',
      padding: '8px 16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#3F4254',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      transition: 'all 0.2s ease',
    }
  };

  useEffect(() => {
    async function fetchAllData() {
      try {
        setLoadingEmployees(true);

        // Fetch both in parallel for better performance
        const [employeesResponse, configResponse, paymentModeResponse] = await Promise.all([
          fetchAllEmployeesSelectedData().catch(err => ({ statusCode: 500, data: { employees: [] } })),
          fetchConfiguration(EXCLUDE_FROM_LATE_ATTENDANCE).catch(err => null),
          fetchConfiguration(PAYMENT_MODE).catch(err => null),
        ]);

        // Process employees
        if (employeesResponse.statusCode === 200) {
          const transformedEmployees = transformEmployeeData(employeesResponse);
          console.log("transformedEmployees:: ", transformedEmployees);
          setEmployees(transformedEmployees);
        }

        // Process excluded employee IDs
        if (configResponse?.data?.configuration) {
          const configurationComplete = JSON.parse(
            configResponse.data.configuration.configuration || '{}'
          );
          console.log("configurationComplete:: ", configurationComplete);
          
          console.log("configResponse:: ", configResponse);
          const configurationId = configResponse?.data?.configuration?.id;
          setConfigurationId(configurationId);
          const employeeIdsList = configurationComplete || [];
          
          console.log("employeeIdsList:: ", employeeIdsList);

          if (Array.isArray(employeeIdsList)) {
            setSelectedEmployeeIds(employeeIdsList);
          }
        }

        console.log("paymentModeResponse:: ",paymentModeResponse);
        const selectedPaymentMode = typeof paymentModeResponse?.data?.configuration?.configuration === 'string' ? JSON.parse(paymentModeResponse?.data?.configuration?.configuration) : paymentModeResponse?.data?.configuration?.configuration;
        console.log("selectedPaymentMode:: ",selectedPaymentMode);
        setPaymentMode(selectedPaymentMode);
        setPaymentModeConfigurationId(paymentModeResponse?.data?.configuration?.id);
        
      } catch (error) {
        console.error("Error fetching data:", error);
        // Set defaults on error
        setEmployees([]);
        setSelectedEmployeeIds([]);
      } finally {
        setLoadingEmployees(false);
      }
    }

    fetchAllData();
  }, []);

  const handleSaveEmployees = async (selectedIds: string[]) => {
    setSelectedEmployeeIds(selectedIds);
    const payload = {
      module: EXCLUDE_FROM_LATE_ATTENDANCE,
      configuration: selectedIds
    };
    if (configurationId) {
      await updateConfigurationById(configurationId, payload);
    } else {
      const res = await createNewConfiguration(payload);
      setConfigurationId(res?.data?.configuration?.id);
    }
    successConfirmation("Excluded from late attendance deduction updated successfully");
    fetchConfiguration(EXCLUDE_FROM_LATE_ATTENDANCE)
    setShowModal(false);
  };



  const handleSubmitPaymentMode = async () => {
    const payload = {
      module: PAYMENT_MODE,
      configuration: [paymentMode]
    };
    if (paymentModeConfigurationId) {
      await updateConfigurationById(paymentModeConfigurationId, payload);
    } else {
      const res = await createNewConfiguration(payload);
      setPaymentModeConfigurationId(res?.data?.configuration?.id);
    }
    successConfirmation("Payment mode updated successfully");
    fetchConfiguration(PAYMENT_MODE)
  };
  

  return (
    <div style={styles.container}>
      <h1 style={styles.headerTitle}>General Settings</h1>

      {/* Payment Mode */}
      <div style={styles.row} onMouseOver={(e) => e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.06)'} onMouseOut={(e) => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.02)'}>
        <div className="d-flex align-items-center gap-3">
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#fdf3f4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9d4141', fontSize: '20px' }}>
            <i className="bi bi-wallet2"></i>
          </div>
          <div>
            <h3 style={styles.sectionTitle}>Payment Mode</h3>
            <p style={styles.sectionDesc}>Select the base payment structure for all employees</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <select
            value={paymentMode}
            onChange={(e) => setPaymentMode(e.target.value as 'Hour Based' | 'Day Based')}
            style={styles.dropdown}
            onFocus={(e) => e.currentTarget.style.borderColor = '#9d4141'}
            onBlur={(e) => e.currentTarget.style.borderColor = '#E1E3EA'}
          >
            <option value="Hour Based">Hour Based</option>
            <option value="Day Based">Day Based</option>
          </select>
          <button 
            style={styles.saveBtn} 
            onClick={handleSubmitPaymentMode}
            onMouseOver={(e) => { e.currentTarget.style.borderColor = '#9d4141'; e.currentTarget.style.color = '#9d4141'; e.currentTarget.style.backgroundColor = '#fdf3f4'; }}
            onMouseOut={(e) => { e.currentTarget.style.borderColor = '#E1E3EA'; e.currentTarget.style.color = '#3F4254'; e.currentTarget.style.backgroundColor = '#ffffff'; }}
          >
            <i className="bi bi-check-lg me-1"></i> Save
          </button>
        </div>
      </div>

      {/* Excluded from late Attendance deduction */}
      <div style={styles.row} onMouseOver={(e) => e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.06)'} onMouseOut={(e) => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.02)'}>
        <div className="d-flex align-items-center gap-3">
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#e1f0fa', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0085db', fontSize: '20px' }}>
            <i className="bi bi-person-x"></i>
          </div>
          <div>
            <h3 style={styles.sectionTitle}>Excluded from late Attendance deduction</h3>
            <p style={styles.sectionDesc}>Manage employees exempt from late attendance penalties</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={styles.badge}>
            {selectedEmployeeIds.length} <span style={{fontSize: '12px', fontWeight: 500, marginLeft: '6px', color: '#a66969'}}>Selected</span>
          </div>
          <button 
            style={styles.arrowBtn} 
            onClick={() => setShowModal(true)}
            onMouseOver={(e) => { e.currentTarget.style.borderColor = '#0085db'; e.currentTarget.style.color = '#0085db'; e.currentTarget.style.backgroundColor = '#e1f0fa'; }}
            onMouseOut={(e) => { e.currentTarget.style.borderColor = '#E1E3EA'; e.currentTarget.style.color = '#3F4254'; e.currentTarget.style.backgroundColor = '#ffffff'; }}
          >
            Configure <i className="bi bi-arrow-right ms-2"></i>
          </button>
        </div>
      </div>

      <EmployeeSelectionModal
        show={showModal}
        handleClose={() => setShowModal(false)}
        onSave={handleSaveEmployees}
        employees={employees}
        initialSelection={selectedEmployeeIds}
        title="Choose Employees to exclude from late attendance deduction"
      />
    </div>
  );
}

export default GeneralSettings;