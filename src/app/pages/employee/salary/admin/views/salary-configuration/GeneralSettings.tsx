import { fetchAllEmployeesSelectedData } from '@services/employee';
import React, { useState, useEffect } from 'react';
import { Modal } from 'react-bootstrap';
import { getAvatar } from '@utils/avatar';
import { fetchConfiguration,updateConfigurationById } from '@services/company';
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

  return apiData.data.employees.map((emp: any) => ({
    id: emp.id || '',
    name: emp.users
      ? `${emp.users.firstName || ''} ${emp.users.lastName || ''}`.trim()
      : 'Unknown',
    designation: emp.designations?.role || 'N/A',
    avatar: getAvatar(emp.avatar || null, emp.gender ?? 0),
    gender: emp.gender ?? 0,
  }));
};

interface ExcludeLateAttendanceModalProps {
  show: boolean;
  handleClose: () => void;
  onSave: (selectedIds: string[]) => void;
  employees: IEmployee[];
  initialSelection: string[];
}

const ExcludeLateAttendanceModal: React.FC<ExcludeLateAttendanceModalProps> = ({
  show,
  handleClose,
  onSave,
  employees,
  initialSelection,
}) => {
  const [tempSelection, setTempSelection] = useState<string[]>(initialSelection);

  useEffect(() => {
    setTempSelection(initialSelection);
  }, [initialSelection, show]);

  const toggleSelection = (id: string) => {
    setTempSelection((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const modalStyles = {
    header: {
      borderBottom: 'none',
      padding: '40px 44px 24px 44px',
    },
    title: {
      fontFamily: 'Barlow, sans-serif',
      fontWeight: 600,
      fontSize: '24px',
      color: '#000000',
      letterSpacing: '0.24px',
      margin: 0,
    },
    body: {
      padding: '0 44px 28px 44px',
      maxHeight: '500px',
      overflowY: 'auto' as const,
    },
    footer: {
      borderTop: 'none',
      padding: '0 44px 40px 44px',
      display: 'flex',
      justifyContent: 'flex-start',
    },
    employeeItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px',
      cursor: 'pointer',
      borderRadius: '8px',
      transition: 'background-color 0.2s',
    },
    checkbox: (checked: boolean) => ({
      width: '25px',
      height: '25px',
      borderRadius: '50%',
      border: checked ? 'none' : '1.5px solid #E1E3EA',
      backgroundColor: checked ? '#9d4141' : 'transparent',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      transition: 'all 0.2s ease',
    }),
    avatar: {
      width: '40px',
      height: '40px',
      borderRadius: '50%',
      objectFit: 'cover' as const,
    },
    name: {
      fontFamily: 'Inter, sans-serif',
      fontWeight: 500,
      fontSize: '14px',
      color: '#2f2f2f',
      flex: 1,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap' as const,
    },
    saveBtn: {
      backgroundColor: '#9d4141',
      color: '#ffffff',
      border: 'none',
      borderRadius: '6px',
      padding: '10px 20px',
      height: '40px',
      fontFamily: 'Inter, sans-serif',
      fontWeight: 500,
      fontSize: '14px',
      cursor: 'pointer',
      transition: 'background-color 0.2s',
    },
  };

  return (
    <Modal show={show} onHide={handleClose} centered size="lg">
      <Modal.Header closeButton style={modalStyles.header}>
        <Modal.Title style={modalStyles.title}>
          Choose Employees to excluded from late attendance deduction
        </Modal.Title>
      </Modal.Header>
      <Modal.Body style={modalStyles.body}>
        <div className="row g-4">
          {employees.map((emp) => {
            const isSelected = tempSelection.includes(emp.id);
            return (
              <div key={emp.id} className="col-md-4 col-sm-6 col-12">
                <div
                  style={modalStyles.employeeItem}
                  onClick={() => toggleSelection(emp.id)}
                >
                  <div style={modalStyles.checkbox(isSelected)}>
                    {isSelected && (
                      <i className="bi bi-check text-white" style={{ fontSize: '18px', fontWeight: 'bold' }}></i>
                    )}
                  </div>
                  <img src={emp.avatar} alt={emp.name} style={modalStyles.avatar} />
                  <span style={modalStyles.name}>{emp.name}</span>
                </div>
              </div>
            );
          })}
        </div>
      </Modal.Body>
      <Modal.Footer style={modalStyles.footer}>
        <button style={modalStyles.saveBtn} onClick={() => onSave(tempSelection)}>
          Save
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
      backgroundColor: '#ffffff',
      borderRadius: '12px',
      padding: '24px',
      boxShadow: '0px 0px 20px 0px rgba(76, 87, 125, 0.02)',
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '24px',
      margin: "24px 0px"
    },
    headerTitle: {
      fontFamily: 'Inter, sans-serif',
      fontWeight: 600,
      fontSize: '18px',
      color: '#181C32',
      marginBottom: '4px',
    },
    sectionTitle: {
      fontFamily: 'Inter, sans-serif',
      fontWeight: 600,
      fontSize: '14px',
      color: '#181C32',
      marginBottom: '4px',
    },
    sectionDesc: {
      fontFamily: 'Inter, sans-serif',
      fontWeight: 500,
      fontSize: '12px',
      color: '#A1A5B7',
      margin: 0,
    },
    row: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '16px 0',
    },
    dropdown: {
      padding: '10px 16px',
      borderRadius: '6px',
      border: '1px solid #E1E3EA',
      fontFamily: 'Inter, sans-serif',
      fontSize: '14px',
      color: '#181C32',
      minWidth: '200px',
      outline: 'none',
      backgroundColor: '#fff',
      cursor: 'pointer',
    },
    saveBtn: {
      backgroundColor: '#9d4141',
      color: '#ffffff',
      border: 'none',
      borderRadius: '6px',
      padding: '10px 24px',
      fontFamily: 'Inter, sans-serif',
      fontWeight: 500,
      fontSize: '14px',
      cursor: 'pointer',
      marginLeft: '12px',
    },
    badge: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#fadcd9',
      color: '#9d4141',
      borderRadius: '50%',
      width: '32px',
      height: '32px',
      fontSize: '14px',
      fontWeight: 600,
      fontFamily: 'Inter, sans-serif',
    },
    arrowBtn: {
      background: 'transparent',
      border: 'none',
      cursor: 'pointer',
      padding: '8px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }
  };

  useEffect(() => {
    async function fetchAllData() {
      try {
        setLoadingEmployees(true);

        // Fetch both in parallel for better performance
        const [employeesResponse, configResponse, paymentModeResponse] = await Promise.all([
          fetchAllEmployeesSelectedData(),
          fetchConfiguration(EXCLUDE_FROM_LATE_ATTENDANCE),
          fetchConfiguration(PAYMENT_MODE)
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
    console.log("selectedId:: ",selectedIds);
    const payload = {
            module: EXCLUDE_FROM_LATE_ATTENDANCE,
            configuration: selectedIds
          };
    await updateConfigurationById(configurationId, payload);
    successConfirmation("Excluded from late attendance deduction updated successfully");
    fetchConfiguration(EXCLUDE_FROM_LATE_ATTENDANCE)
    setShowModal(false);
  };


  const handleSubmitPaymentMode = async () => {
    const payload = {
            module: PAYMENT_MODE,
            configuration: [paymentMode]
          };
    await updateConfigurationById(paymentModeConfigurationId, payload);
    successConfirmation("Payment mode updated successfully");
    fetchConfiguration(PAYMENT_MODE)
    // setShowModal(false);
  };
  

  return (
    <div style={styles.container}>
      <h1 style={styles.headerTitle}>General Settings</h1>

      {/* Payment Mode */}
      <div style={{ ...styles.row, borderBottom: '1px dashed #E1E3EA' }}>
        <div>
          <h3 style={styles.sectionTitle}>Payment mode</h3>
          {/* <p style={styles.sectionDesc}>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p> */}
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <select
            value={paymentMode}
            onChange={(e) => setPaymentMode(e.target.value as 'Hour Based' | 'Day Based')}
            style={styles.dropdown}
          >
            <option value="Hour Based">Hour Based</option>
            <option value="Day Based">Day Based</option>
          </select>
          <button style={styles.saveBtn} onClick={handleSubmitPaymentMode}>
            save
          </button>
        </div>
      </div>

      {/* Excluded from late Attendance deduction */}
      <div style={styles.row}>
        <div>
          <h3 style={styles.sectionTitle}>Excluded from late Attendance deduction</h3>
          {/* <p style={styles.sectionDesc}>Lorem ipsum dolor sit amet, consectetur</p> */}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={styles.badge}>
            {selectedEmployeeIds.length}
          </div>
          <button style={styles.arrowBtn} onClick={() => setShowModal(true)}>
            <i className="bi bi-arrow-right fs-2 text-danger"></i>
          </button>
        </div>
      </div>

      <ExcludeLateAttendanceModal
        show={showModal}
        handleClose={() => setShowModal(false)}
        onSave={handleSaveEmployees}
        employees={employees}
        initialSelection={selectedEmployeeIds}
      />
    </div>
  );
}

export default GeneralSettings;