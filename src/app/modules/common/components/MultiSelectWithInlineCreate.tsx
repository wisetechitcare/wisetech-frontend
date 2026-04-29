import React, { useState, forwardRef, useImperativeHandle } from 'react';
import Select, { components, MultiValue, ActionMeta } from 'react-select';
import { Modal } from 'react-bootstrap';
import { useFormikContext } from 'formik';

// TypeScript interfaces
export interface Option {
  value: string;
  label: string;
  color?: string;
}

export interface MultiSelectWithInlineCreateProps {
  formikField: string;
  inputLabel: string;
  options: Option[];
  placeholder?: string;
  isRequired?: boolean;
  disabled?: boolean;
  onCreate?: (name: string) => Promise<Option | void>;
  onRefreshOptions?: () => Promise<void>;
  createModalTitle?: string;
  createButtonText?: string;
  createFieldLabel?: string;
  createFieldPlaceholder?: string;
  isLoading?: boolean;
  className?: string;
}

export interface MultiSelectWithInlineCreateRef {
  refreshOptions: () => Promise<void>;
}

// Custom MenuList component with "Add New" option
const CustomMenuList = ({ onCreate, createButtonText, ...props }: any) => {
  const handleAddNew = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onCreate) {
      onCreate();
    }
  };

  return (
    <components.MenuList {...props}>
      <div
        className="dropdown-add-option"
        onClick={handleAddNew}
        style={{
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          cursor: 'pointer',
          borderBottom: '1px solid #e9ecef',
          color: '#9D4141',
          fontSize: '14px',
          fontWeight: 500
        }}
      >
        <span style={{ marginRight: '8px', fontSize: '16px', fontWeight: 'bold' }}>+</span>
        <span>{createButtonText || 'Add New'}</span>
      </div>
      {props.children}
    </components.MenuList>
  );
};

const MultiSelectWithInlineCreate = forwardRef<MultiSelectWithInlineCreateRef, MultiSelectWithInlineCreateProps>(({
  formikField,
  inputLabel,
  options,
  placeholder = 'Select options...',
  isRequired = false,
  disabled = false,
  onCreate,
  onRefreshOptions,
  createModalTitle = 'Create New Item',
  createButtonText = 'Add New',
  createFieldLabel = 'Name',
  createFieldPlaceholder = 'Enter name...',
  isLoading = false,
  className = ''
}, ref) => {
  const { values, setFieldValue, errors, touched } = useFormikContext<any>();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createValue, setCreateValue] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Get current field value - ensure it's always an array
  const fieldValue = values[formikField] || [];
  const selectedOptions: Option[] = Array.isArray(fieldValue) 
    ? fieldValue.map((val: string) => options.find(opt => opt.value === val)).filter((opt): opt is Option => opt !== undefined)
    : [];

  // Get error state
  const hasError = touched[formikField] && errors[formikField];

  // Handle multi-select change
  const handleChange = (newValue: MultiValue<Option>, actionMeta: ActionMeta<Option>) => {
    const values = newValue ? newValue.map(option => option.value) : [];
    setFieldValue(formikField, values);
  };

  // Handle opening create modal
  const handleOpenCreateModal = () => {
    setShowCreateModal(true);
    setCreateValue('');
  };

  // Handle closing create modal
  const handleCloseCreateModal = () => {
    setShowCreateModal(false);
    setCreateValue('');
    setIsCreating(false);
  };

  // Handle creating new item
  const handleCreate = async () => {
    if (!createValue.trim() || !onCreate) return;

    setIsCreating(true);
    try {
      const newOption = await onCreate(createValue.trim());
      
      if (newOption) {
        // Add the new option to current selection
        const currentValues = Array.isArray(fieldValue) ? fieldValue : [];
        setFieldValue(formikField, [...currentValues, newOption.value]);
      }

      // Refresh options if function provided
      if (onRefreshOptions) {
        await onRefreshOptions();
      }

      handleCloseCreateModal();
    } catch (error) {
      console.error('Error creating new item:', error);
    } finally {
      setIsCreating(false);
    }
  };

  // Handle Enter key in create modal
  const handleCreateKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isCreating) {
      handleCreate();
    }
  };

  // Expose refresh function via ref
  useImperativeHandle(ref, () => ({
    refreshOptions: async () => {
      if (onRefreshOptions) {
        await onRefreshOptions();
      }
    }
  }));

  return (
    <>
      <div className={`d-flex flex-column fv-row ${className}`}>
        <label className={`form-label ${isRequired ? 'required' : ''}`}>
          {inputLabel}
        </label>
        
        <Select
          isMulti
          name={formikField}
          options={options}
          value={selectedOptions}
          onChange={handleChange}
          placeholder={placeholder}
          isDisabled={disabled}
          isLoading={isLoading}
          isClearable
          className={`react-select-styled ${hasError ? 'is-invalid' : ''}`}
          classNamePrefix="react-select"
          components={onCreate ? { 
            MenuList: (props) => CustomMenuList({ 
              ...props, 
              onCreate: handleOpenCreateModal, 
              createButtonText 
            }) 
          } : undefined}
          styles={hasError ? {
            control: (base) => ({
              ...base,
              borderColor: '#dc3545',
              '&:hover': {
                borderColor: '#dc3545',
              },
            }),
          } : undefined}
        />

        {hasError && (
          <div className="fv-plugins-message-container">
            <div className="fv-help-block">
              <span role="alert">{errors[formikField] as string}</span>
            </div>
          </div>
        )}
      </div>

      {/* Create New Item Modal */}
      {onCreate && (
        <Modal show={showCreateModal} onHide={handleCloseCreateModal} centered>
          <Modal.Header closeButton>
            <Modal.Title>{createModalTitle}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div className="fv-row">
              <label className="required fs-6 fw-bold form-label mb-2">
                {createFieldLabel}
              </label>
              <input
                type="text"
                className="form-control form-control-solid"
                placeholder={createFieldPlaceholder}
                value={createValue}
                onChange={(e) => setCreateValue(e.target.value)}
                onKeyPress={handleCreateKeyPress}
                disabled={isCreating}
                autoFocus
              />
            </div>
          </Modal.Body>
          <Modal.Footer>
            <button
              type="button"
              className="btn btn-light"
              onClick={handleCloseCreateModal}
              disabled={isCreating}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleCreate}
              disabled={!createValue.trim() || isCreating}
            >
              {isCreating ? (
                <>
                  <span className="spinner-border spinner-border-sm align-middle ms-2"></span>
                  Creating...
                </>
              ) : (
                'Create'
              )}
            </button>
          </Modal.Footer>
        </Modal>
      )}
    </>
  );
});

MultiSelectWithInlineCreate.displayName = 'MultiSelectWithInlineCreate';

export default MultiSelectWithInlineCreate;