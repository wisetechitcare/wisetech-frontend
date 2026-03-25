import React from 'react';
import { FormFieldProps } from './types';

const FormField: React.FC<FormFieldProps> = ({ label, children }) => (
  <div className="mb-3">
    <label className="form-label fw-medium mb-3" style={{
      fontFamily: 'Inter',
      fontSize: '14px'
    }}>
      {label}
    </label>
    {children}
  </div>
);

export default FormField;
