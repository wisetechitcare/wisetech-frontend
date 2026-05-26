import React from 'react';
import { Notebook, IndianRupee, PieChart } from 'lucide-react';

interface PaymentScheduleSectionProps {
  id?: string;
  content?: any;
  savedHtml?: string;
}

export const PaymentScheduleSection: React.FC<PaymentScheduleSectionProps> = ({ id, content, savedHtml }) => {
  const title = content?.title || 'REMUNERATION & SCHEDULE OF PAYMENT';
  const intro = content?.intro || 'Fee towards Gross Built-up area \u2026';
  const highlights = content?.highlights || [];
  const tables = content?.tables || [];
  const notes = content?.notes || [
    "GST Tax shall be applicable on all the above payments which shall be additionally paid at the then prevailing rates.",
    "All adjustments on the total fee in case of any increase or decrease in the total built-up area shall be reconciled after the Design Detailing Stage of the project.",
    "Payment against a stage completion shall be paid to WISETECH MEP CONSULTANTS PVT LTD within 15 days of submission of the invoice for the stage completed."
  ];

  return (
    <div id={id} style={{ display: 'flex', flexDirection: 'column', flex: 1, position: 'relative', paddingBottom: '40px' }}>

      {/* Content */}
      <div data-section-id="payment-schedule" style={{ flex: 1, fontSize: '13px', lineHeight: '1.6', outline: 'none', whiteSpace: 'pre-wrap' }} contentEditable suppressContentEditableWarning dangerouslySetInnerHTML={savedHtml ? { __html: savedHtml } : undefined}>
        {!savedHtml && (
          <>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '30px', gap: '15px' }}>
          <Notebook size={40} color="#c81010" strokeWidth={1.5} />
          <div>
            <div style={{ color: '#c81010', fontWeight: 'bold', fontSize: '16px', textDecoration: 'underline' }}>ANNEXURE-III</div>
            <div style={{ color: '#c81010', fontWeight: 'bold', fontSize: '18px', textDecoration: 'underline' }}>{title}</div>
          </div>
        </div>

        <div style={{ marginBottom: '20px', paddingLeft: '34px' }}>
          <p style={{ marginBottom: '15px' }}>{intro}</p>
          {highlights.length > 0 && (
            <ul style={{ listStyleType: 'disc', paddingLeft: '20px', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {highlights.map((h: string, idx: number) => (
                <li key={idx} style={{ fontWeight: 'bold' }}>{h}</li>
              ))}
            </ul>
          )}
        </div>

        {tables.map((table: any, index: number) => {
          const isFeeTable = table.title?.includes("FEE") && !table.title?.includes("BREAK UP");
          const Icon = isFeeTable ? IndianRupee : PieChart;
          
          return (
            <div key={index} style={{ marginBottom: '30px', pageBreakInside: 'avoid' }}>
              {table.title && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                  <Icon size={24} color="#c81010" strokeWidth={2} />
                  <div style={{ color: '#c81010', fontWeight: 'bold', fontSize: '14px', textDecoration: isFeeTable ? 'none' : 'underline' }}>{table.title}</div>
                </div>
              )}

              <div style={{ paddingLeft: '34px' }}>
                {table.intro && <p style={{ marginBottom: '15px', whiteSpace: 'pre-wrap' }}>{table.intro}</p>}
                
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#1c345c', color: 'white' }}>
                      {table.headers?.map((header: string, hIdx: number) => (
                        <th key={hIdx} style={{ border: '1px solid #1c345c', padding: '5px' }}>{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {table.rows?.map((row: string[], rIdx: number) => (
                      <tr key={rIdx}>
                        {row.map((cell: string, cIdx: number) => {
                          const isNumeric = cIdx === 0 || cIdx > 1; // Assuming first column is Sr No, and later are numbers/rates
                          return (
                            <td key={cIdx} style={{ border: '1px solid #ccc', padding: '5px', textAlign: isNumeric ? 'center' : 'left' }}>
                              {cell}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                    {table.footer && table.footer.length > 0 && (
                      <tr style={{ backgroundColor: isFeeTable ? '#f0f0f0' : '#a6c0e8', fontWeight: 'bold' }}>
                        {table.footer.map((cell: string, cIdx: number) => {
                          const colSpan = (cIdx === 1 && table.footer.length < (table.headers?.length || 0)) ? (table.headers.length - table.footer.length + 1) : 1;
                          if (!cell && cIdx === 0 && table.footer.length < table.headers.length) return null; // Skip empty first cell if we are using colspan
                          
                          return (
                            <td key={cIdx} colSpan={colSpan} style={{ border: isFeeTable ? '1px solid #ccc' : '1px solid #1c345c', padding: '5px', textAlign: cIdx > 0 ? 'center' : 'left' }}>
                              {cell}
                            </td>
                          );
                        })}
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}

        <div style={{ paddingLeft: '34px', marginBottom: '30px', pageBreakInside: 'avoid' }}>
          <p style={{ fontWeight: 'bold', marginBottom: '10px' }}>Note:</p>
          <ul style={{ listStyleType: 'none', paddingLeft: '20px', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {notes.map((note: string, idx: number) => (
              <li key={idx} style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '-15px' }}>✓</span>
                {note}
              </li>
            ))}
          </ul>
        </div>
        </>
        )}
      </div>

    </div>
  );
};
