import React, { useState, useEffect } from 'react';
import { IconButton } from '@mui/material';
import { Edit, Check, Close } from '@mui/icons-material';

interface PrefixInlineEditProps {
  value: string; // Full prefix like "testLead/2024-25/32"
  label: string; // Display label like "INQUIRY NO." or "PROJECT NO."
  onChange: (newPrefix: string) => void;
  disabled?: boolean;
  className?: string;
}

interface PrefixParts {
  prefix: string;
  year: string;
  count: string;
}

const PrefixInlineEdit: React.FC<PrefixInlineEditProps> = ({
  value,
  label,
  onChange,
  disabled = false,
  className = '',
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValues, setEditValues] = useState<PrefixParts>({
    prefix: '',
    year: '',
    count: '',
  });
  const [errors, setErrors] = useState<Partial<PrefixParts>>({});

  // Parse prefix value into parts old without unique number edit 
  // const parsePrefix = (prefixValue: string): PrefixParts => {
  //   if (!prefixValue || !prefixValue.includes('/')) {
  //     return { prefix: '', year: '', count: '' };
  //   }
    
  //   const parts = prefixValue.split('/');
  //   return {
  //     prefix: parts[0] || '',
  //     year: parts[1] || '',
  //     count: parts[2] || '',
  //   };
  // };

  // Parse prefix value into parts new with unique number edit
  const parsePrefix = (prefixValue: string): PrefixParts => {
    if (!prefixValue || !prefixValue.includes('/')) {
      return { prefix: '', year: '', count: '' };
    }

    const parts = prefixValue.split('/').filter(Boolean);

    // Support values where "prefix" itself may contain '/'.
    // We treat the last 2 segments as year + count, everything before as prefix.
    // Examples:
    // - "WT/Lead/2025-26/11" => prefix="WT/Lead", year="2025-26", count="11"
    // - "Lead/2025-26/11"   => prefix="Lead",   year="2025-26", count="11"
    // - "X/11" (invalid)    => handled by empty fallbacks
    if (parts.length >= 3) {
      const count = parts[parts.length - 1] || '';
      const year = parts[parts.length - 2] || '';
      const prefix = parts.slice(0, parts.length - 2).join('/') || '';
      return { prefix, year, count };
    }

    // Fallback for unexpected formats (keeps behavior safe)
    return {
      prefix: parts[0] || '',
      year: parts[1] || '',
      count: parts[2] || '',
    };
  };

  // Update edit values when prop value changes
  useEffect(() => {
    setEditValues(parsePrefix(value));
  }, [value]);

  // Validation function
  const validateValues = (values: PrefixParts): Partial<PrefixParts> => {
    const errors: Partial<PrefixParts> = {};
    
    if (!values.prefix.trim()) {
      errors.prefix = 'Prefix is required';
    }
    
    if (!values.year.trim()) {
      errors.year = 'Year is required';
    }
    
    if (!values.count.trim()) {
      errors.count = 'Count is required';
    } else if (!/^\d+$/.test(values.count.trim())) {
      errors.count = 'Only numbers are allowed';
    }
    
    return errors;
  };

  const handleEdit = () => {
    if (disabled) return;
    setIsEditing(true);
    setErrors({});
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditValues(parsePrefix(value)); // Reset to original values
    setErrors({});
  };

  // old save logic
  // const handleSave = () => {
  //   const validationErrors = validateValues(editValues);
  //   setErrors(validationErrors);
    
  //   if (Object.keys(validationErrors).length === 0) {
  //     const newPrefix = `${editValues.prefix.trim()}/${editValues.year.trim()}/${editValues.count.trim()}`;
  //     onChange(newPrefix);
  //     setIsEditing(false);
  //   }
  // };

  //new save logic
  const handleSave = () => {
    const validationErrors = validateValues(editValues);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length === 0) {
      // Preserve multi-segment prefix (e.g., "WT/Lead")
      const cleanedPrefix = editValues.prefix
        .split('/')
        .map((p) => p.trim())
        .filter(Boolean)
        .join('/');

      const newPrefix = `${cleanedPrefix}/${editValues.year.trim()}/${editValues.count.trim()}`;
      onChange(newPrefix);
      setIsEditing(false);
    }
  };

  const handleInputChange = (field: keyof PrefixParts, newValue: string) => {
    // Special handling for count field - only allow integers
    if (field === 'count') {
      // Allow empty string for clearing
      if (newValue === '') {
        setEditValues(prev => ({
          ...prev,
          [field]: newValue,
        }));
      }
      // Only allow positive integers (no decimal points, no negative signs)
      else if (/^\d+$/.test(newValue)) {
        setEditValues(prev => ({
          ...prev,
          [field]: newValue,
        }));
        
        // Clear error for this field when valid input is entered
        if (errors[field]) {
          setErrors(prev => ({
            ...prev,
            [field]: undefined,
          }));
        }
      }
      // If invalid input, show error immediately
      else {
        setErrors(prev => ({
          ...prev,
          [field]: 'Only numbers are allowed',
        }));
      }
    } else {
      // For other fields (prefix and year), allow normal input
      setEditValues(prev => ({
        ...prev,
        [field]: newValue,
      }));
      
      // Clear error for this field when user starts typing
      if (errors[field]) {
        setErrors(prev => ({
          ...prev,
          [field]: undefined,
        }));
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (!value) {
    return (
      <div className={`d-flex flex-column align-items-end ${className}`}>
        <span style={{ fontSize: "14px", fontFamily: "Inter", color: "#798DB3" }}>
          {label}
        </span>
        <span style={{ fontSize: "14px", fontFamily: "Inter", color: "#999999" }}>
          Not generated
        </span>
      </div>
    );
  }

  return (
    <div className={`d-flex flex-column align-items-end ${className}`}>
      <span style={{ fontSize: "14px", fontFamily: "Inter", color: "#798DB3" }}>
        {label}
      </span>
      
      {isEditing ? (
        <div className="d-flex flex-column" style={{ fontSize: "14px", fontFamily: "Inter" }}>
          {/* Input Row */}
          <div className="d-flex align-items-center gap-1 mb-1">
            <div className="d-flex flex-column">
              <input
                type="text"
                value={editValues.prefix}
                onChange={(e) => handleInputChange('prefix', e.target.value)}
                onKeyDown={handleKeyPress}
                className={`form-control form-control-sm ${errors.prefix ? 'is-invalid' : ''}`}
                style={{ 
                  width: '80px', 
                  fontSize: '12px',
                  textAlign: 'center',
                  padding: '2px 4px',
                  height: 'auto',
                  minHeight: '24px',
                  backgroundImage: 'none'
                }}
                placeholder="Prefix"
                autoFocus
              />
            </div>
            
            <span style={{ color: "#000000", fontWeight: 500 }}>/</span>
            
            <div className="d-flex flex-column">
              <input
                type="text"
                value={editValues.year}
                onChange={(e) => handleInputChange('year', e.target.value)}
                onKeyDown={handleKeyPress}
                className={`form-control form-control-sm ${errors.year ? 'is-invalid' : ''}`}
                style={{ 
                  width: '70px', 
                  fontSize: '12px',
                  textAlign: 'center',
                  padding: '2px 4px',
                  height: 'auto',
                  minHeight: '24px',
                  backgroundImage: 'none'
                }}
                placeholder="Year"
              />
            </div>
            
            <span style={{ color: "#000000", fontWeight: 500 }}>/</span>
            
            <div className="d-flex flex-column">
              <input
                type="text"
                value={editValues.count}
                onChange={(e) => handleInputChange('count', e.target.value)}
                onKeyDown={handleKeyPress}
                className={`form-control form-control-sm ${errors.count ? 'is-invalid' : ''}`}
                style={{ 
                  width: '50px', 
                  fontSize: '12px',
                  textAlign: 'center',
                  padding: '2px 4px',
                  height: 'auto',
                  minHeight: '24px',
                  backgroundImage: 'none'
                }}
                placeholder="Count"
              />
            </div>
            
            <IconButton
              size="small"
              onClick={handleSave}
              style={{ padding: '2px', marginLeft: '4px' }}
              title="Save"
            >
              <Check style={{ fontSize: '16px', color: '#28a745' }} />
            </IconButton>
            
            <IconButton
              size="small"
              onClick={handleCancel}
              style={{ padding: '2px' }}
              title="Cancel"
            >
              <Close style={{ fontSize: '16px', color: '#dc3545' }} />
            </IconButton>
          </div>
          
          {/* Error Row - Only show if there are any errors */}
          {(errors.prefix || errors.year || errors.count) && (
            <div className="d-flex align-items-start gap-1" style={{ minHeight: '15px' }}>
              <div style={{ width: '80px', fontSize: '10px', color: '#dc3545' }}>
                {errors.prefix || ''}
              </div>
              
              <span style={{ width: '8px' }}></span> {/* Spacer for "/" */}
              
              <div style={{ width: '70px', fontSize: '10px', color: '#dc3545' }}>
                {errors.year || ''}
              </div>
              
              <span style={{ width: '8px' }}></span> {/* Spacer for "/" */}
              
              <div style={{ width: '50px', fontSize: '10px', color: '#dc3545' }}>
                {errors.count || ''}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="d-flex align-items-center gap-1">
          <span style={{ fontSize: "14px", fontFamily: "Inter", color: "#000000" }}>
            {value}
          </span>
          {!disabled && (
            <IconButton
              size="small"
              onClick={handleEdit}
              style={{ padding: '2px', marginLeft: '4px' }}
              title="Edit prefix"
            >
              <Edit style={{ fontSize: '14px', color: '#6c757d' }} />
            </IconButton>
          )}
        </div>
      )}
    </div>
  );
};

export default PrefixInlineEdit;