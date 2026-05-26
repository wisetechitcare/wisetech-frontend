import React from 'react';
import { Presentation } from 'lucide-react';

interface MeetingScheduleSectionProps {
  id?: string;
  content?: any;
  savedHtml?: string;
}

export const MeetingScheduleSection: React.FC<MeetingScheduleSectionProps> = ({ id, content, savedHtml }) => {
  const title = content?.title || 'Meeting Schedule';
  const intro = content?.intro || 'Please find below the on-site meeting schedule for the project.';
  const tables = content?.tables || [];

  return (
    <div id={id} style={{ display: 'flex', flexDirection: 'column', flex: 1, position: 'relative', paddingBottom: '40px' }}>
      
      {/* Content */}
      <div data-section-id="meeting-schedule" style={{ flex: 1, fontSize: '13px', lineHeight: '1.6', outline: 'none', whiteSpace: 'pre-wrap' }} contentEditable suppressContentEditableWarning dangerouslySetInnerHTML={savedHtml ? { __html: savedHtml } : undefined}>
        {!savedHtml && (
          <>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', paddingLeft: '34px', pageBreakInside: 'avoid' }}>
          <Presentation size={24} color="#c81010" strokeWidth={2} />
          <div style={{ color: '#c81010', fontWeight: 'bold', fontSize: '14px', textDecoration: 'underline' }}>{title}</div>
        </div>

        <div style={{ paddingLeft: '34px', marginBottom: '20px', pageBreakInside: 'avoid' }}>
          {intro && <p style={{ marginBottom: '15px' }}>{intro}</p>}

          {tables.map((table: any, index: number) => {
            const hasSubheaders = table.headers && table.headers.length > 2;

            return (
              <React.Fragment key={index}>
                {table.intro && <p style={{ marginBottom: '15px', fontWeight: 'bold', whiteSpace: 'pre-wrap' }}>{table.intro}</p>}
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginBottom: '15px' }}>
                  <thead>
                    {hasSubheaders ? (
                      <>
                        <tr>
                          <th style={{ backgroundColor: '#6495ed', color: 'white', border: '1px solid #1c345c', padding: '8px', textAlign: 'center', verticalAlign: 'middle' }} rowSpan={2}>{table.headers[0]}</th>
                          <th style={{ backgroundColor: '#6495ed', color: 'white', border: '1px solid #1c345c', padding: '8px', textAlign: 'center' }} colSpan={3}>Per Day Investment</th>
                        </tr>
                        <tr>
                          <th style={{ backgroundColor: '#6495ed', color: 'white', border: '1px solid #1c345c', padding: '8px', textAlign: 'center' }}>{table.headers[1]}</th>
                          <th style={{ backgroundColor: '#6495ed', color: 'white', border: '1px solid #1c345c', padding: '8px', textAlign: 'center' }}>{table.headers[2]}</th>
                          <th style={{ backgroundColor: '#6495ed', color: 'white', border: '1px solid #1c345c', padding: '8px', textAlign: 'center' }}>{table.headers[3]}</th>
                        </tr>
                      </>
                    ) : (
                      <tr style={{ backgroundColor: '#6495ed', color: 'white' }}>
                        {table.headers?.map((header: string, hIdx: number) => (
                          <th key={hIdx} style={{ border: '1px solid #1c345c', padding: '8px', textAlign: 'left', width: hIdx === 0 ? '60%' : '40%' }}>{header}</th>
                        ))}
                      </tr>
                    )}
                  </thead>
                  <tbody>
                    {table.rows?.map((row: string[], rIdx: number) => {
                      const isSubheading = row[1] === "" && !hasSubheaders;
                      
                      if (isSubheading) {
                        return (
                          <tr key={rIdx}>
                            <td style={{ border: '1px solid #ccc', padding: '8px', fontWeight: 'bold', textDecoration: 'underline' }} colSpan={table.headers?.length || 2}>{row[0]}</td>
                          </tr>
                        );
                      }

                      return (
                        <tr key={rIdx}>
                          {row.map((cell: string, cIdx: number) => (
                            <td key={cIdx} style={{ border: '1px solid #ccc', padding: '8px', fontWeight: cIdx > 0 && !hasSubheaders ? 'bold' : 'normal' }}>
                              {cell}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                    {table.footer && (
                      <tr>
                        {table.footer.map((cell: string, fIdx: number) => (
                          <td key={fIdx} style={{ border: '1px solid #ccc', padding: '8px', fontWeight: 'bold' }}>{cell}</td>
                        ))}
                      </tr>
                    )}
                  </tbody>
                </table>
              </React.Fragment>
            );
          })}
        </div>
        </>
        )}
      </div>

    </div>
  );
};
