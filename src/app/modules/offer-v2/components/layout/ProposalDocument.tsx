import React from 'react';

interface ProposalDocumentProps {
  id?: string;
  templateName?: string;
  children: React.ReactNode;
}

export const ProposalDocument: React.FC<ProposalDocumentProps> = ({ id, templateName, children }) => {
  return (
    <div
      id={id}
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '40px',
        fontFamily: '"Times New Roman", Times, serif',
        color: '#333',
        padding: '20px 0'
      }}
      className="proposal-document-container"
    >
      <style>
        {`
          @media print {
            body {
              background: white !important;
            }
            .proposal-document-container {
              padding: 0 !important;
              gap: 0 !important;
              display: block !important;
            }
            .proposal-page {
              margin: 0 !important;
              box-shadow: none !important;
              padding: 0 !important;
              width: 100% !important;
              min-height: auto !important;
              display: block !important;
              page-break-after: auto !important;
            }
            .proposal-page-content {
              display: block !important;
            }
            .global-header {
              position: static;
              display: block !important;
            }
            .global-footer {
              position: static;
              margin-top: 40px;
              display: block !important;
            }
          }
        `}
      </style>

      {React.Children.map(children, (child, index) => {
        if (!child) return null;
        
        const isCoverPage = index === 0;

        return (
          <div 
            className="proposal-page proposal-document-preview"
            style={{
              width: '794px',
              minHeight: '1123px',
              backgroundColor: 'white',
              padding: '40px',
              boxShadow: '0 0 20px rgba(0,0,0,0.12)',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              boxSizing: 'border-box'
            }}
          >
            {!isCoverPage && (
              <div className="global-header" style={{ marginBottom: '40px' }}>
                <img src="/header.png" alt="WiseTech Header" style={{ width: '100%', maxHeight: '80px', objectFit: 'contain', objectPosition: 'left center' }} />
              </div>
            )}

            <div className="proposal-page-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', outline: 'none' }}>
              {child}
            </div>

            {!isCoverPage && (
              <div className="global-footer" style={{ marginTop: 'auto', borderTop: '2px solid #ddd', paddingTop: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '10px', color: '#999', paddingBottom: '10px', position: 'relative' }}>
                <div style={{ position: 'absolute', left: 0, fontWeight: 'bold' }}>
                  {templateName || ''}
                </div>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <span>1st Floor | Saraswati Compound | Subhash Estate | Next to Millat Hospital | SV Road | Jogeshwari (W) | Mumbai 400102 | India |</span>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
