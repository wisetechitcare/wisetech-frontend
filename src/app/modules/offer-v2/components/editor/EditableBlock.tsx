import React from 'react';

interface EditableBlockProps {
  value: string;
  onChange: (val: string) => void;
  multiline?: boolean;
  placeholder?: string;
  style?: React.CSSProperties;
}

export const EditableBlock: React.FC<EditableBlockProps> = ({ value, onChange, multiline, placeholder, style }) => {
  const commonStyle: React.CSSProperties = {
    padding: '4px 8px',
    border: '1px solid transparent',
    borderRadius: '4px',
    backgroundColor: 'transparent',
    transition: 'border 0.2s',
    outline: 'none',
    minHeight: multiline ? '3em' : 'auto',
    display: 'inline-block',
    width: '100%',
    ...style
  };

  const handleBlur = (e: React.FocusEvent<HTMLElement>) => {
    onChange(e.currentTarget.innerText);
  };

  return (
    <div
      contentEditable
      suppressContentEditableWarning
      onBlur={handleBlur}
      style={{
        ...commonStyle,
      }}
      data-placeholder={placeholder}
      dangerouslySetInnerHTML={{ __html: value || '' }}
    />
  );
};
