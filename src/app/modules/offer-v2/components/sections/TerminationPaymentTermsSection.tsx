import React from 'react';
import { XCircle, CreditCard } from 'lucide-react';

interface TerminationPaymentTermsSectionProps {
  id?: string;
  content?: any;
  savedHtml?: string;
}

export const TerminationPaymentTermsSection: React.FC<TerminationPaymentTermsSectionProps> = ({ id, content, savedHtml }) => {
  const items = content?.items || [];
  const closing = content?.closing || {};

  const getIcon = (title: string) => {
    if (title?.toLowerCase().includes('terminate')) return <XCircle size={24} color="#c81010" strokeWidth={2} />;
    return <CreditCard size={24} color="#c81010" strokeWidth={2} />;
  };

  return (
    <div id={id} style={{ display: 'flex', flexDirection: 'column', flex: 1, position: 'relative', paddingBottom: '40px' }}>
      
      {/* Content */}
      <div data-section-id="termination-terms" style={{ flex: 1, fontSize: '13px', lineHeight: '1.6', outline: 'none', whiteSpace: 'pre-wrap' }} contentEditable suppressContentEditableWarning dangerouslySetInnerHTML={savedHtml ? { __html: savedHtml } : undefined}>
        {!savedHtml && (
          <>
        {items.map((item: any, index: number) => {
          const isTerminate = item.title?.toLowerCase().includes('terminate');
          
          return (
            <div key={index} style={{ marginBottom: '30px', pageBreakInside: 'avoid' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px', paddingLeft: '34px' }}>
                {getIcon(item.title)}
                <div style={{ color: isTerminate ? '#1c345c' : '#c81010', fontWeight: 'bold', fontSize: '14px' }}>
                  {isTerminate ? (
                    <>
                      <span style={{ color: '#1c345c' }}>{item.title.split('/')[0]} /</span>
                      <span style={{ color: '#c81010' }}>{item.title.split('/')[1] || ''}</span>
                    </>
                  ) : (
                    <span>{item.title}</span>
                  )}
                </div>
              </div>
              
              <div style={{ paddingLeft: '34px' }}>
                <ol style={{ paddingLeft: '20px', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '15px', listStyleType: 'decimal' }}>
                  {item.paragraphs?.map((p: string, pIdx: number) => (
                    <li key={pIdx} style={{ textAlign: 'justify' }}>
                      {p.replace(/^[0-9]+\.\s*/, '') /* Remove numbering from JSON if any, as <ol> handles it */}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          );
        })}

        <div style={{ paddingLeft: '34px', marginBottom: '40px', pageBreakInside: 'avoid' }}>
          {closing.validity && (
            <p style={{ marginBottom: '20px', textAlign: 'justify' }}>
              {closing.validity}
            </p>
          )}
          
          {closing.signoff && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {closing.signoff.split('\n\n').map((line: string, idx: number, arr: string[]) => {
                const isFirst = idx === 0;
                const isCompany = line.includes('WISETECH');
                const isName = idx === arr.length - 1;
                
                return (
                  <React.Fragment key={idx}>
                    {isFirst && <p style={{ marginBottom: '20px' }}>{line}</p>}
                    {isCompany && (
                      <>
                        <p style={{ color: '#1c345c', fontWeight: 'bold' }}>{line}</p>
                        <div style={{ position: 'relative', width: '200px', height: '80px', marginTop: '10px', marginBottom: '10px' }}>
                          {/* Fake signature/stamp */}
                          <div style={{ position: 'absolute', top: '10px', left: '10px', transform: 'rotate(-10deg)', color: '#000080', fontSize: '24px', fontFamily: '"Brush Script MT", cursive', opacity: 0.8 }}>
                            M. Mobeen
                          </div>
                          <div style={{ position: 'absolute', top: '5px', left: '80px', width: '70px', height: '70px', borderRadius: '50%', border: '2px solid rgba(0,0,128,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: 'rotate(15deg)' }}>
                            <div style={{ width: '60px', height: '60px', borderRadius: '50%', border: '1px solid rgba(0,0,128,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontSize: '8px', color: 'rgba(0,0,128,0.6)' }}>
                              WISETECH MEP
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                    {isName && !isCompany && (
                      <p style={{ color: '#1c345c', fontWeight: 'bold' }}>{line}</p>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          )}
        </div>
        </>
        )}
      </div>

    </div>
  );
};
