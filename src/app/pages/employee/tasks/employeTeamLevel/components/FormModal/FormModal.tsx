import React, { useState, useEffect } from 'react';
import { Modal } from 'react-bootstrap';
import { FormModalProps, FormSubmitData } from './types';
import FormHeader from './FormHeader';
import FormField from './FormField';
import EmployeeSelect from './EmployeeSelect';
import FormActions from './FormActions';
import { Employee } from '../../types';

const FormModal: React.FC<FormModalProps> = ({
  isOpen,
  onClose,
  mode,
  levelData,
  levelNumber,
  employeeData,
  onSubmit,
  onDelete,
  availableEmployees = []
}) => {

  console.log("employee data ==========================>informData",availableEmployees,)
  const [levelName, setLevelName] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | undefined>();
  const [selectedEmployees, setSelectedEmployees] = useState<Employee[]>([]);
  const [employeeName, setEmployeeName] = useState('');
  const [employeePosition, setEmployeePosition] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    console.log('FormModal useEffect:', { isOpen, mode, levelData, levelNumber, employeeData });
    if (isOpen) {
      // Reset form when modal opens
      if (mode === 'editLevel' && levelData) {
        setLevelName(levelData.title);
      } else if (mode === 'editEmployee' && employeeData) {
        setEmployeeName(employeeData.name);
        setEmployeePosition(employeeData.position);
      } else {
        setLevelName('');
        setEmployeeName('');
        setEmployeePosition('');
      }
      setSelectedEmployee(undefined);
      setSelectedEmployees([]);
      setSearchQuery('');
    }
  }, [isOpen, mode, levelData, employeeData]);

  const handleDropdownToggle = (isOpen: boolean) => {
    setIsDropdownOpen(isOpen);
  };

  const filteredEmployees = availableEmployees.filter(employee =>
    employee.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = () => {
    const data: FormSubmitData = {};

    if (mode === 'addLevel' || mode === 'editLevel') {
      if (!levelName.trim()) return;
      data.levelName = levelName.trim();
    }

    if (mode === 'addEmployee') {
      if (!selectedEmployee) return;
      data.selectedEmployee = selectedEmployee;
    }

    if (mode === 'addMultipleEmployees') {
      if (!selectedEmployees || selectedEmployees.length === 0) return;
      data.selectedEmployees = selectedEmployees;
    }

    if (mode === 'editEmployee') {
      if (!employeeName.trim() || !employeePosition.trim()) return;
      data.employeeName = employeeName.trim();
      data.employeePosition = employeePosition.trim();
    }

    onSubmit(data);
    onClose();
  };

  const handleDelete = () => {
    if (mode === 'editLevel') {
      console.log('Delete level:', levelData?.id);
    } else if (mode === 'editEmployee') {
      console.log('Delete employee:', employeeData?.id);
    }
    onDelete?.();
    onClose();
  };

  const isSubmitDisabled = () => {
    if (mode === 'addLevel' || mode === 'editLevel') {
      return !levelName.trim();
    }
    if (mode === 'addEmployee') {
      return !selectedEmployee;
    }
    if (mode === 'addMultipleEmployees') {
      return !selectedEmployees || selectedEmployees.length === 0;
    }
    if (mode === 'editEmployee') {
      return !employeeName.trim() || !employeePosition.trim();
    }
    return false;
  };

  console.log('FormModal render:', { isOpen, mode });

  return (
    <Modal show={isOpen} onHide={onClose} centered size="lg">
      <Modal.Body className="p-4 p-md-12">
        <FormHeader mode={mode} levelNumber={levelNumber} onClose={onClose} />

        <div>
          {(mode === 'addLevel' || mode === 'editLevel') && (
            <FormField label="Level Name">
              <input
                type="text"
                value={levelName}
                onChange={(e) => setLevelName(e.target.value)}
                placeholder="Enter level name"
                className="form-control"
                style={{
                  backgroundColor: '#eef1f7',
                  border: 'none',
                  borderRadius: '7px',
                  padding: '14px 16px',
                  fontFamily: 'Inter',
                  fontWeight: 500,
                  fontSize: '14px'
                }}
                autoFocus
              />
            </FormField>
          )}

          {mode === 'addEmployee' && (
            <FormField label="Choose Employee">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search employee..."
                className="form-control mb-3"
                style={{
                  backgroundColor: '#eef1f7',
                  border: 'none',
                  borderRadius: '7px',
                  padding: '14px 16px',
                  fontFamily: 'Inter',
                  fontWeight: 500,
                  fontSize: '14px'
                }}
              />
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '12px',
                maxHeight: '400px',
                overflowY: 'auto',
                padding: '4px'
              }}>
                {filteredEmployees.map((employee) => {
                  const isSelected = selectedEmployee?.id === employee.id;
                  return (
                    <div
                      key={employee.id}
                      onClick={() => setSelectedEmployee(employee)}
                      style={{
                        cursor: 'pointer',
                        padding: '8px',
                        borderRadius: '8px',
                        backgroundColor: isSelected ? '#fff5f5' : 'transparent',
                        border: `1.5px solid ${isSelected ? '#9D4141' : '#e5e7eb'}`,
                        transition: 'all 0.2s ease-in-out',
                        boxShadow: isSelected ? '0 2px 8px rgba(157, 65, 65, 0.1)' : 'none'
                      }}
                      className="d-flex align-items-center gap-2"
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.borderColor = '#d1d5db';
                          e.currentTarget.style.backgroundColor = '#f9fafb';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.borderColor = '#e5e7eb';
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }
                      }}
                    >
                      <div className="d-flex align-items-center justify-content-center" style={{ width: '20px', flexShrink: 0 }}>
                        <div
                          style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '4px',
                            backgroundColor: isSelected ? '#9D4141' : '#ffffff',
                            border: `2px solid ${isSelected ? '#9D4141' : '#d1d5db'}`,
                            position: 'relative',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s ease-in-out'
                          }}
                        >
                          {isSelected && (
                            <svg
                              width="12"
                              height="12"
                              viewBox="0 0 16 16"
                              fill="none"
                              style={{ position: 'relative', zIndex: 1 }}
                            >
                              <path
                                d="M3 8L6.5 11.5L13 5"
                                stroke="white"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                        </div>
                      </div>
                      <div className="d-flex align-items-center gap-2" style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          overflow: 'hidden',
                          backgroundColor: '#D9D9D9',
                          flexShrink: 0,
                          border: '2px solid #ffffff',
                          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.08)'
                        }}>
                          {employee.avatar && (
                            <img
                              src={employee.avatar}
                              alt={employee.name}
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover'
                              }}
                            />
                          )}
                        </div>
                        <p style={{
                          fontFamily: 'Inter',
                          fontWeight: 500,
                          fontSize: '13px',
                          color: isSelected ? '#9D4141' : '#2f2f2f',
                          margin: 0,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          transition: 'color 0.2s ease-in-out'
                        }}>
                          {employee.name}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </FormField>
          )}

          {mode === 'addMultipleEmployees' && (
            <FormField label="Choose Employee">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search employee..."
                className="form-control mb-3"
                style={{
                  backgroundColor: '#eef1f7',
                  border: 'none',
                  borderRadius: '7px',
                  padding: '14px 16px',
                  fontFamily: 'Inter',
                  fontWeight: 500,
                  fontSize: '14px'
                }}
              />
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                maxHeight: '400px',
                overflowY: 'auto',
                padding: '4px'
              }}>
                {filteredEmployees.map((employee) => {
                  const isSelected = selectedEmployees.some(emp => emp.id === employee.id);
                  return (
                    <div
                      key={employee.id}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedEmployees(selectedEmployees.filter(emp => emp.id !== employee.id));
                        } else {
                          setSelectedEmployees([...selectedEmployees, employee]);
                        }
                      }}
                      style={{
                        cursor: 'pointer',
                        padding: '8px',
                        borderRadius: '8px',
                        backgroundColor: isSelected ? '#fff5f5' : 'transparent',
                        border: `1.5px solid ${isSelected ? '#9d4141' : '#e5e7eb'}`,
                        transition: 'all 0.2s ease-in-out',
                        boxShadow: isSelected ? '0 2px 8px rgba(157, 65, 65, 0.1)' : 'none'
                      }}
                      className="d-flex align-items-center gap-2"
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.borderColor = '#d1d5db';
                          e.currentTarget.style.backgroundColor = '#f9fafb';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.borderColor = '#e5e7eb';
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }
                      }}
                    >
                      <div className="d-flex align-items-center justify-content-center" style={{ width: '20px', flexShrink: 0 }}>
                        <div
                          style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '4px',
                            backgroundColor: isSelected ? '#9D4141' : '#ffffff',
                            border: `2px solid ${isSelected ? '#9D4141' : '#d1d5db'}`,
                            position: 'relative',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s ease-in-out'
                          }}
                        >
                          {isSelected && (
                            <svg
                              width="12"
                              height="12"
                              viewBox="0 0 16 16"
                              fill="none"
                              style={{ position: 'relative', zIndex: 1 }}
                            >
                              <path
                                d="M3 8L6.5 11.5L13 5"
                                stroke="white"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                        </div>
                      </div>
                      <div className="d-flex align-items-center gap-2" style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          overflow: 'hidden',
                          backgroundColor: '#D9D9D9',
                          flexShrink: 0,
                          border: '2px solid #ffffff',
                          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.08)'
                        }}>
                          {employee.avatar && (
                            <img
                              src={employee.avatar}
                              alt={employee.name}
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover'
                              }}
                            />
                          )}
                        </div>
                        <p style={{
                          fontFamily: 'Inter',
                          fontWeight: 500,
                          fontSize: '13px',
                          color: isSelected ? '#9d4141' : '#2f2f2f',
                          margin: 0,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          transition: 'color 0.2s ease-in-out'
                        }}>
                          {employee.name}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </FormField>
          )}

          {mode === 'editEmployee' && (
            <>
              <FormField label="Employee Name">
                <input
                  type="text"
                  value={employeeName}
                  onChange={(e) => setEmployeeName(e.target.value)}
                  placeholder="Enter employee name"
                  className="form-control"
                  style={{
                    backgroundColor: '#eef1f7',
                    border: 'none',
                    borderRadius: '7px',
                    padding: '14px 16px',
                    fontFamily: 'Inter',
                    fontWeight: 500,
                    fontSize: '14px'
                  }}
                  autoFocus
                />
              </FormField>
              <FormField label="Employee Position">
                <input
                  type="text"
                  value={employeePosition}
                  onChange={(e) => setEmployeePosition(e.target.value)}
                  placeholder="Enter employee position"
                  className="form-control"
                  style={{
                    backgroundColor: '#eef1f7',
                    border: 'none',
                    borderRadius: '7px',
                    padding: '14px 16px',
                    fontFamily: 'Inter',
                    fontWeight: 500,
                    fontSize: '14px'
                  }}
                />
              </FormField>
            </>
          )}
        </div>

        <FormActions
          mode={mode}
          onSubmit={handleSubmit}
          onDelete={(mode === 'editLevel' || mode === 'editEmployee') ? handleDelete : undefined}
          isSubmitDisabled={isSubmitDisabled()}
        />
      </Modal.Body>
    </Modal>
  );
};

export default FormModal;
