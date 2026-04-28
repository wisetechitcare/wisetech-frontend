import React, { useState, useCallback } from 'react';
import { EmployeeSelectProps } from './types';
import LazyImage from '../LazyImage';

const EmployeeSelect: React.FC<EmployeeSelectProps> = React.memo(({
  selectedEmployee,
  selectedEmployees,
  availableEmployees,
  onSelect,
  onMultiSelect,
  multiSelect = false,
  onDropdownToggle
}) => {
  const [isOpen, setIsOpen] = useState(false);

  console.log('EmployeeSelect render - availableEmployees:', availableEmployees.length, availableEmployees);
  console.log('MultiSelect mode:', multiSelect, 'Selected employees:', selectedEmployees?.length || 0);

  const handleSelect = useCallback((employee: any) => {
    if (multiSelect && onMultiSelect) {
      const currentSelected = selectedEmployees || [];
      const isAlreadySelected = currentSelected.some(emp => emp.id === employee.id);

      if (isAlreadySelected) {
        const newSelection = currentSelected.filter(emp => emp.id !== employee.id);
        onMultiSelect(newSelection);
      } else {
        const newSelection = [...currentSelected, employee];
        onMultiSelect(newSelection);
      }
    } else {
      onSelect(employee);
      setIsOpen(false);
    }
  }, [onSelect, onMultiSelect, multiSelect, selectedEmployees]);

  const toggleOpen = useCallback(() => {
    setIsOpen(prev => {
      const newIsOpen = !prev;
      onDropdownToggle?.(newIsOpen);
      return newIsOpen;
    });
  }, [onDropdownToggle]);

  return (
    <div className="position-relative">
      <div
        className="d-flex align-items-center justify-content-between"
        style={{
          backgroundColor: '#eef1f7',
          border: 'none',
          borderRadius: '7px',
          padding: '14px 16px',
          cursor: 'pointer',
          fontFamily: 'Inter',
          fontWeight: 500,
          fontSize: '14px'
        }}
        onClick={toggleOpen}
      >
        {multiSelect ? (
          <div className="d-flex align-items-center gap-2 flex-grow-1">
            {selectedEmployees && selectedEmployees.length > 0 ? (
              <div className="d-flex align-items-center gap-2 flex-grow-1">
                {selectedEmployees.length === 1 ? (
                  <>
                    <div className="rounded-circle overflow-hidden" style={{ width: '32px', height: '32px', position: 'relative' }}>
                      {selectedEmployees[0].avatar.includes('dicebear.com') ? (
                        <img
                          src={selectedEmployees[0].avatar}
                          alt={`${selectedEmployees[0].name} avatar`}
                          className="w-100 h-100"
                          style={{ objectFit: 'cover' }}
                        />
                      ) : (
                        <LazyImage
                          src={selectedEmployees[0].avatar}
                          alt={`${selectedEmployees[0].name} avatar`}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                        />
                      )}
                    </div>
                    <span className="text-truncate">{selectedEmployees[0].name}</span>
                  </>
                ) : (
                  <div className="d-flex align-items-center gap-2 flex-grow-1">
                    <div className="d-flex align-items-center">
                      {selectedEmployees.slice(0, 3).map((emp, index) => (
                        <div
                          key={emp.id}
                          className="rounded-circle overflow-hidden border border-2 border-white"
                          style={{
                            width: '24px',
                            height: '24px',
                            marginLeft: index > 0 ? '-8px' : '0',
                            zIndex: 3 - index,
                            position: 'relative'
                          }}
                        >
                          {emp.avatar.includes('dicebear.com') ? (
                            <img
                              src={emp.avatar}
                              alt={`${emp.name} avatar`}
                              className="w-100 h-100"
                              style={{ objectFit: 'cover' }}
                            />
                          ) : (
                            <LazyImage
                              src={emp.avatar}
                              alt={`${emp.name} avatar`}
                              style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                            />
                          )}
                        </div>
                      ))}
                      {selectedEmployees.length > 3 && (
                        <div
                          className="rounded-circle d-flex align-items-center justify-content-center border border-2 border-white"
                          style={{
                            width: '24px',
                            height: '24px',
                            backgroundColor: '#9D4141',
                            color: 'white',
                            fontSize: '10px',
                            fontWeight: '600',
                            marginLeft: '-8px'
                          }}
                        >
                          +{selectedEmployees.length - 3}
                        </div>
                      )}
                    </div>
                    <span>
                      {selectedEmployees.length} employee{selectedEmployees.length !== 1 ? 's' : ''} selected
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <span style={{ color: '#8998ab' }}>Select employees</span>
            )}
          </div>
        ) : (
          selectedEmployee ? (
            <div className="d-flex align-items-center gap-2">
              <div className="rounded-circle overflow-hidden" style={{ width: '32px', height: '32px', position: 'relative' }}>
                {selectedEmployee.avatar.includes('dicebear.com') ? (
                  <img
                    src={selectedEmployee.avatar}
                    alt={`${selectedEmployee.name} avatar`}
                    className="w-100 h-100"
                    style={{ objectFit: 'cover' }}
                  />
                ) : (
                  <LazyImage
                    src={selectedEmployee.avatar}
                    alt={`${selectedEmployee.name} avatar`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                  />
                )}
              </div>
              <span>{selectedEmployee.name} </span>
            </div>
          ) : (
            <span style={{ color: '#8998ab' }}>Select an employee</span>
          )
        )}
        <div style={{ transform: 'rotate(180deg)', marginTop: '10px' }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="9" viewBox="0 0 15 9" fill="none">
            <path
              d="M8.20808 7.78996C7.81733 8.18179 7.18266 8.18179 6.79192 7.78996L0.974179 1.95613C0.345555 1.32577 0.792025 0.25 1.68226 0.250001L13.3177 0.250002C14.208 0.250002 14.6544 1.32577 14.0258 1.95613L8.20808 7.78996Z"
              fill="#9D4141"
              transform="rotate(180 7.5 4.5)"
            />
          </svg>
        </div>
      </div>

      {isOpen && (
        <div
          className="position-absolute mt-1 bg-white border rounded shadow-sm"
          style={{
            top: '100%',
            left: 0,
            right: 0,
            maxHeight: '200px',
            overflowY: 'auto',
            zIndex: 1000,
            borderColor: '#dee3eb !important',
            borderRadius: '7px'
          }}
        >
          {availableEmployees.length > 0 ? (
            <>
              {availableEmployees.map((employee) => {
                const isSelected = multiSelect
                  ? selectedEmployees?.some(emp => emp.id === employee.id)
                  : false;

                return (
                  <div
                    key={employee.id}
                    className="d-flex align-items-center gap-2 p-3 border-bottom"
                    style={{
                      cursor: 'pointer',
                      backgroundColor: isSelected ? '#f0f9ff' : 'transparent'
                    }}
                    onClick={() => handleSelect(employee)}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor = '#f7f9fc';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = isSelected ? '#f0f9ff' : 'transparent';
                    }}
                  >
                    {multiSelect && (
                      <div
                        className="d-flex align-items-center justify-content-center border border-2 rounded"
                        style={{
                          width: '16px',
                          height: '16px',
                          borderColor: '#9D4141 !important',
                          backgroundColor: isSelected ? '#9D4141' : 'white'
                        }}
                      >
                        {isSelected && (
                          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                            <path
                              d="M8.5 1L3.5 6L1.5 4"
                              stroke="white"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </div>
                    )}

                    <div className="rounded-circle overflow-hidden" style={{ width: '32px', height: '32px', position: 'relative' }}>
                      {employee.avatar.includes('dicebear.com') ? (
                        <img
                          src={employee.avatar}
                          alt={`${employee.name} avatar`}
                          className="w-100 h-100"
                          style={{ objectFit: 'cover' }}
                        />
                      ) : (
                        <LazyImage
                          src={employee.avatar}
                          alt={`${employee.name} avatar`}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                        />
                      )}
                    </div>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: '14px' }}>{employee.name}</div>
                      <div style={{ fontSize: '12px', color: '#8998ab' }}>{employee.position}</div>
                    </div>
                  </div>
                );
              })}
              <div
                className="d-flex align-items-center gap-2 p-3 border-top border-2"
                style={{
                  cursor: 'pointer',
                  borderColor: '#9D4141 !important',
                  backgroundColor: '#f8f9fa'
                }}
                onClick={() => {
                  setIsOpen(false);
                  onDropdownToggle?.(false);
                  console.log('Add new employee clicked');
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#e9ecef';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#f8f9fa';
                }}
              >
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center"
                  style={{
                    width: '32px',
                    height: '32px',
                    backgroundColor: '#9D4141'
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M8 1V15M1 8H15"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '14px', color: '#9D4141' }}>
                    Add New Employee
                  </div>
                  <div style={{ fontSize: '12px', color: '#6c757d' }}>
                    Create a new employee profile
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-4" style={{ color: '#8998ab', fontSize: '14px' }}>
              <div className="d-flex justify-content-center align-items-center mb-2">
                <div className="spinner-border spinner-border-sm" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
              Loading employees...
            </div>
          )}
        </div>
      )}
    </div>
  );
})

EmployeeSelect.displayName = 'EmployeeSelect';

export default EmployeeSelect;
