import React from 'react';
import { Bold, Italic, Underline, List, ListOrdered, FileDown, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';

interface ToolbarProps {
  onExportPdf: () => void;
  onReset: () => Promise<void>;
  isSyncing?: boolean;
  onBack?: () => void;
  templateName?: string;
}

export const Toolbar: React.FC<ToolbarProps> = ({ onExportPdf, onReset, isSyncing, onBack, templateName }) => {
  const handleFormat = (command: string, value?: string) => {
    document.execCommand(command, false, value);
  };

  const buttonStyle: React.CSSProperties = {
    background: 'transparent',
    border: '1px solid #ddd',
    borderRadius: '4px',
    padding: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#333',
    backgroundColor: '#fff'
  };

  return (
    <div style={{
      width: '100%',
      background: '#f8f9fa',
      padding: '10px 20px',
      borderBottom: '1px solid #ddd',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }}>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        {onBack && (
          <button
            onClick={onBack}
            style={{ ...buttonStyle, background: '#f8f9fa', marginRight: '10px' }}
            title="Go Back"
          >
            <span style={{ marginRight: '5px' }}>←</span> Back
          </button>
        )}
        <button style={buttonStyle} onClick={() => handleFormat('bold')} title="Bold (Ctrl+B)">
          <Bold size={18} />
        </button>
        <button style={buttonStyle} onClick={() => handleFormat('italic')} title="Italic (Ctrl+I)">
          <Italic size={18} />
        </button>
        <button style={buttonStyle} onClick={() => handleFormat('underline')} title="Underline (Ctrl+U)">
          <Underline size={18} />
        </button>

        <div style={{ width: '1px', height: '24px', background: '#ccc', margin: '0 5px' }} />

        <button style={buttonStyle} onClick={() => handleFormat('justifyLeft')} title="Align Left">
          <AlignLeft size={18} />
        </button>
        <button style={buttonStyle} onClick={() => handleFormat('justifyCenter')} title="Align Center">
          <AlignCenter size={18} />
        </button>
        <button style={buttonStyle} onClick={() => handleFormat('justifyRight')} title="Align Right">
          <AlignRight size={18} />
        </button>

        <div style={{ width: '1px', height: '24px', background: '#ccc', margin: '0 5px' }} />

        <button style={buttonStyle} onClick={() => handleFormat('insertUnorderedList')} title="Bullet List">
          <List size={18} />
        </button>
        <button style={buttonStyle} onClick={() => handleFormat('insertOrderedList')} title="Numbered List">
          <ListOrdered size={18} />
        </button>
      </div>

      {templateName && (
        <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', fontWeight: 'bold', fontSize: '16px', color: '#555', whiteSpace: 'nowrap' }}>
          {templateName}
        </div>
      )}

      <div style={{ display: 'flex', gap: '10px' }}>
        {onReset && (
          <button
            onClick={onReset}
            style={{
              background: '#f8c032',
              color: '#333',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            Sync Data
          </button>
        )}
        <button
          onClick={onExportPdf}
          style={{
            background: '#0d6efd',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <FileDown size={18} />
          Export PDF
        </button>
      </div>
    </div>
  );
};

