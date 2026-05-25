import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface NotInScopeSectionProps {
  id?: string;
  content?: any;
}

export const NotInScopeSection: React.FC<NotInScopeSectionProps> = ({ id, content }) => {
  const title = content?.title || 'Not including in our scope of work';
  const intro = content?.intro || 'The following shall not be part of our scope of work:';
  const categories = content?.categories || [];

  return (
    <div id={id} style={{ display: 'flex', flexDirection: 'column', flex: 1, position: 'relative', paddingBottom: '40px' }}>
      
      {/* Content */}
      <div style={{ flex: 1, fontSize: '12px', lineHeight: '1.4', outline: 'none', whiteSpace: 'pre-wrap' }} contentEditable suppressContentEditableWarning>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', paddingLeft: '34px', pageBreakInside: 'avoid' }}>
          <AlertTriangle size={24} color="#c81010" strokeWidth={2} />
          <div style={{ color: '#c81010', fontWeight: 'bold', fontSize: '14px', textDecoration: 'underline' }}>{title}</div>
        </div>

        <div style={{ paddingLeft: '34px' }}>
          <p style={{ marginBottom: '10px' }}>{intro}</p>
          
          <ol style={{ paddingLeft: '20px', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {categories.map((category: any, index: number) => (
              <li key={index} style={{ pageBreakInside: 'avoid' }}>
                <span style={{ fontWeight: 'bold' }}>{category.title}</span><br/>
                {category.subtitle && <>{category.subtitle}<br/></>}
                
                {category.subcategories && category.subcategories.map((sub: any, sIdx: number) => (
                  <div key={sIdx} style={{ paddingLeft: '15px', marginTop: '5px' }}>
                    {sub.title && <span style={{ fontWeight: 'bold' }}>{String.fromCharCode(97 + sIdx)}) {sub.title}</span>}
                    <ol style={{ listStyleType: sub.title ? 'lower-roman' : 'lower-alpha', paddingLeft: '20px', marginTop: '2px' }}>
                      {sub.items.map((item: string, iIdx: number) => {
                        // Highlighting common bracketed text
                        const match = item.match(/(\(Scope of.*?\))|(\(By.*?\))/i);
                        if (match) {
                          const parts = item.split(match[0]);
                          return (
                            <li key={iIdx}>
                              {parts[0]} <span style={{ textDecoration: 'underline' }}>{match[0]}</span> {parts[1]}
                            </li>
                          );
                        }
                        return <li key={iIdx}>{item}</li>;
                      })}
                    </ol>
                  </div>
                ))}
              </li>
            ))}
          </ol>
        </div>

      </div>

    </div>
  );
};
