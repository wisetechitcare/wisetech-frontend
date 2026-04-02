import React from 'react';
import { FormHeaderProps } from './types';

const FormHeader: React.FC<FormHeaderProps> = ({ mode, levelNumber, onClose }) => {
  const getTitle = () => {
    switch (mode) {
      case 'addLevel':
        return `Add level ${levelNumber || ''}`;
      case 'editLevel':
        return `Edit level ${levelNumber || ''}`;
      case 'addEmployee':
        return `Add Employee to level ${levelNumber || ''}`;
      case 'addMultipleEmployees':
        return `Add Employees to level ${levelNumber || ''}`;
      case 'editEmployee':
        return `Edit Employee`;
      default:
        return 'Form';
    }
  };

  return (
    <div className="d-flex justify-content-between align-items-center mb-4">
      <h2 className="mb-0 fw-semibold" style={{
        fontFamily: 'Barlow',
        fontSize: '24px',
        letterSpacing: '0.24px',
      }}>
        {getTitle()}
      </h2>
      <button
        type="button"
        onClick={onClose}
        className="btn-close"
        aria-label="Close"
        style={{ cursor: 'pointer' }}
      />
    </div>
  );
};

export default FormHeader;
