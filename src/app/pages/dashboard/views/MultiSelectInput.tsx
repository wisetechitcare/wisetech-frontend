import React, { useState, useMemo, useEffect } from 'react';
import { useThemeMode } from "@metronic/partials";
import HighlightErrors from '@app/modules/errors/components/HighlightErrors';
import Select, { MultiValue, ActionMeta, OnChangeValue, components } from 'react-select'

type OptionType = {
  value: string
  label: string
  id?: string
  color?: string
}
interface MultiSelectInputProps {
  margin?: string;
  isRequired?: boolean;
  label: string;
  formikField: string;
  readonly?: boolean;
  placeholder: string;
  options: any[];
  value: any;
  onChange: (field: string, value: any, shouldValidate?: boolean) => void;
  optionValueKey?: string;
  optionLabelKeys?: string[];
  colorKey?: string; // Key to extract color from option object
}

// Helper function to determine if a color is light or dark for contrast
const isLightColor = (hexColor: string): boolean => {
  if (!hexColor) return true;
  
  // Remove # if present
  const hex = hexColor.replace('#', '');
  
  // Convert to RGB
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // Calculate brightness (0-255)
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  
  // Return true if light (brightness > 128)
  return brightness > 128;
};

// Custom Option component with color indicator
const CustomOption = (props: any) => {
  const { data, children, isSelected, isFocused, ...rest } = props;
  const backgroundColor = data.color;
  
  // Custom styling based on state and color
  const customStyle = {
    backgroundColor: (() => {
      if (isSelected && backgroundColor) {
        return backgroundColor;
      }
      if (isFocused && backgroundColor) {
        return `${backgroundColor}20`; // 20% opacity for hover
      }
      return undefined; // Use default
    })(),
    color: (() => {
      if (isSelected && backgroundColor) {
        return isLightColor(backgroundColor) ? '#000' : '#fff';
      }
      return undefined; // Use default
    })()
  };
  
  return (
    <components.Option {...rest} style={customStyle}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {data.color && (
          <div
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: backgroundColor,
              marginRight: '8px',
              border: '1px solid #dee2e6',
              flexShrink: 0
            }}
          />
        )}
        <span>{children}</span>
      </div>
    </components.Option>
  );
};

function MultiSelectInput({
  margin,
  isRequired,
  label,
  formikField,
  readonly,
  placeholder,
  options,
  value,
  onChange,
  optionValueKey = 'id',
  optionLabelKeys = ['firstName', 'lastName'],
  colorKey = 'color' // Default key to look for color property
}: MultiSelectInputProps) {
  
  const [selectedOptions, setSelectedOptions] = useState<any[]>([])

  const formattedOptions = useMemo(() => {
    if (!Array.isArray(options)) return []

    if (options.length > 0 && 'label' in options[0] && 'value' in options[0]) {
      return options
    }

    return options.map((opt) => {
      // Extract color from nested objects if colorKey contains dot notation (e.g., 'companyType.color')
      const getColorFromPath = (obj: any, path: string) => {
        return path.split('.').reduce((current, key) => current?.[key], obj);
      };

      const color = getColorFromPath(opt, colorKey) || opt[colorKey];
      
      return {
        value: opt[optionValueKey],
        label: optionLabelKeys.map((k) => opt[k]).join(' '),
        color: color, // Include color in formatted options
        id: opt[optionValueKey]
      };
    })
  }, [options, optionValueKey, optionLabelKeys, colorKey])

  useEffect(() => {
    if (!Array.isArray(value) || value.length === 0) {
      setSelectedOptions([])
      return
    }

    if ('label' in value[0] && 'value' in value[0]) {
      setSelectedOptions(value)
    } else {
      const newSelected = value.map((opt) => {
        // Extract color from nested objects if colorKey contains dot notation
        const getColorFromPath = (obj: any, path: string) => {
          return path.split('.').reduce((current, key) => current?.[key], obj);
        };

        const color = getColorFromPath(opt, colorKey) || opt[colorKey];
        
        return {
          value: opt[optionValueKey],
          label: optionLabelKeys.map((k) => opt[k]).join(' '),
          id: opt[optionValueKey],
          color: color // Include color in selected options
        };
      })
      setSelectedOptions(newSelected)
    }
  }, [value, optionValueKey, optionLabelKeys, colorKey])

  const handleChange1 = (selected: any[]) => {
    const updated = (selected || []).map((item) => ({
      ...item,
      id: item.value,
    }))
    setSelectedOptions(updated)
    onChange(formikField, updated)
  }

  const handleChange = (
    newValue: MultiValue<OptionType>,
    actionMeta: ActionMeta<OptionType>
  ) => {
    const updatedSelected = [...(newValue || [])].map((item) => ({
      ...item,
      id: item.value,
    }))
    setSelectedOptions(updatedSelected)
    onChange(formikField, updatedSelected)
  }
  
  return (
    <div className={`${margin || ''} d-flex flex-column mb-7 fv-row`}>
      <label className="d-flex align-items-center fs-6 form-label mb-2">
        <span className={isRequired ? 'required' : ''}>{label}</span>
      </label>
      <Select
        isMulti
        options={formattedOptions}
        placeholder={placeholder}
        value={selectedOptions}
        onChange={handleChange}
        classNamePrefix="react-select"
        className="react-select-styled"
        isDisabled={readonly}
        components={{
          Option: CustomOption
        }}
        styles={{
          // Control styling (main input box)
          control: (base: any, state: any) => ({
            ...base,
            minHeight: '38px'
          }),
          // Dynamic styling for selected values (multiValue)
          multiValue: (base: any, state: any) => {
            const option = state.data as OptionType;
            const backgroundColor = option?.color || '#6c757d'; // Default gray if no color
            
            return {
              ...base,
              backgroundColor: backgroundColor,
              borderRadius: '4px',
              border: '1px solid rgba(0,0,0,0.1)'
            };
          },
          // Dynamic text color for selected value labels
          multiValueLabel: (base: any, state: any) => {
            const option = state.data as OptionType;
            const backgroundColor = option?.color || '#6c757d';
            const textColor = isLightColor(backgroundColor) ? '#000' : '#fff';
            
            return {
              ...base,
              color: textColor,
              fontSize: '12px',
              fontWeight: '500',
              paddingLeft: '6px',
              paddingRight: '6px'
            };
          },
          // Dynamic styling for remove button
          multiValueRemove: (base: any, state: any) => {
            const option = state.data as OptionType;
            const backgroundColor = option?.color || '#6c757d';
            const textColor = isLightColor(backgroundColor) ? '#000' : '#fff';
            
            return {
              ...base,
              color: textColor,
              ':hover': {
                backgroundColor: isLightColor(backgroundColor) ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.2)',
                color: textColor
              }
            };
          }
        }}
      />
    </div>
  );
}

export default MultiSelectInput;