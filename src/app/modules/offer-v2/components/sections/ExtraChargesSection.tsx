import React from 'react';
import { PlusCircle, Briefcase, Copy, Users } from 'lucide-react';

interface ExtraChargesSectionProps {
  id?: string;
  content?: any;
  savedHtml?: string;
}

export const ExtraChargesSection: React.FC<ExtraChargesSectionProps> = ({ id, content, savedHtml }) => {
  const title = content?.title || 'EXTRA CHARGES / PROJECT EXPENSES REIMBURSEMENT:';
  const intro = content?.intro || 'A mutually agreed reimbursement will be charged over and above the settled fee for the below mentioned extra deliverables:';
  const items = content?.items || [];
  
  // Icon mapper based on keywords, as the old version had specific icons per item
  const getIcon = (text: string) => {
    if (!text) return <PlusCircle size={20} color="#c81010" strokeWidth={2} />;
    const lower = typeof text === 'string' ? text.toLowerCase() : '';
    if (lower.includes('travel') || lower.includes('site visit') || lower.includes('outside')) return <Briefcase size={20} color="#c81010" strokeWidth={2} />;
    if (lower.includes('hard cop') || lower.includes('drawings') || lower.includes('fax')) return <Copy size={20} color="#c81010" strokeWidth={2} />;
    if (lower.includes('meeting') || lower.includes('visit')) return <Users size={20} color="#c81010" strokeWidth={2} />;
    return <PlusCircle size={20} color="#c81010" strokeWidth={2} />;
  };

  return (
    <div id={id} style={{ display: 'flex', flexDirection: 'column', flex: 1, position: 'relative', paddingBottom: '40px' }}>
      <div data-section-id="extra-charges" style={{ flex: 1, fontSize: '13px', lineHeight: '1.6', outline: 'none', whiteSpace: 'pre-wrap' }} contentEditable suppressContentEditableWarning dangerouslySetInnerHTML={savedHtml ? { __html: savedHtml } : undefined}>
        {!savedHtml && (
          <>
        <div style={{ marginBottom: '30px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', paddingLeft: '34px' }}>
            <PlusCircle size={24} color="#c81010" strokeWidth={2} />
            <div style={{ color: '#c81010', fontWeight: 'bold', fontSize: '14px' }}>{title}</div>
          </div>
          <div style={{ paddingLeft: '34px' }}>
            {intro && <p style={{ marginBottom: '15px' }}>{intro}</p>}
            {items.map((item: any, idx: number) => {
              const isString = typeof item === 'string';
              const titleText = isString ? (item.includes(':') ? item.split(':')[0] + ':' : 'Extra Charge:') : (item.title || 'Extra Charge:');
              const itemIcon = getIcon(isString ? item : item.title || '');
              
              return (
                <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '15px', pageBreakInside: 'avoid' }}>
                  <div style={{ fontWeight: 'bold' }}>{idx + 1}.</div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '5px' }}>
                      {itemIcon}
                      <span style={{ color: '#c81010', fontWeight: 'bold' }}>
                        {titleText}
                      </span>
                    </div>
                    {isString ? (
                      <p style={{ textAlign: 'justify' }}>
                        {item.includes(':') ? item.substring(item.indexOf(':') + 1).trim() : item}
                      </p>
                    ) : (
                      item.paragraphs?.map((p: string, pIdx: number) => (
                        <p key={pIdx} style={{ textAlign: 'justify', marginBottom: '10px' }}>
                          {p}
                        </p>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        </>
        )}
      </div>
    </div>
  );
};
