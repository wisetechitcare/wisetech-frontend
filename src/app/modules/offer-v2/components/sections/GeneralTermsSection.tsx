import React from 'react';
import { Notebook, Calculator, Clock } from 'lucide-react';

interface GeneralTermsSectionProps {
  id?: string;
  offer: any;
  content?: any;
}

export const GeneralTermsSection: React.FC<GeneralTermsSectionProps> = ({ id, offer, content }) => {
  return (
    <div id={id} style={{ display: 'flex', flexDirection: 'column', flex: 1, position: 'relative', paddingBottom: '40px' }}>
      
      {/* Content */}
      <div style={{ flex: 1, fontSize: '13px', lineHeight: '1.6', outline: 'none', whiteSpace: 'pre-wrap' }} contentEditable suppressContentEditableWarning>
        
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '40px', gap: '15px' }}>
          <Notebook size={40} color="#c81010" strokeWidth={1.5} />
          <div>
            <div style={{ color: '#c81010', fontWeight: 'bold', fontSize: '16px', textDecoration: 'underline' }}>ANNEXURE-IV</div>
            <div style={{ color: '#c81010', fontWeight: 'bold', fontSize: '18px', textDecoration: 'underline' }}>{content?.title || 'GENERAL TERMS AND CONDITIONS'}</div>
          </div>
        </div>

        {/* Area Calculation */}
        <div style={{ marginBottom: '30px', pageBreakInside: 'avoid' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', paddingLeft: '34px' }}>
            <Calculator size={20} color="#c81010" strokeWidth={2} />
            <div style={{ color: '#c81010', fontWeight: 'bold', fontSize: '14px' }}>Area Calculation</div>
          </div>
          <div style={{ paddingLeft: '34px' }}>
            <p>{content?.areaCalculation || 'All Designs as per this offer shall be carried for total Built up areas only.'}</p>
          </div>
        </div>

        {/* Project Duration & Cost Escalation */}
        <div style={{ marginBottom: '30px', pageBreakInside: 'avoid' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px', paddingLeft: '34px' }}>
            <Clock size={20} color="#c81010" strokeWidth={2} />
            <div style={{ color: '#c81010', fontWeight: 'bold', fontSize: '14px' }}>Project Duration & Cost Escalation</div>
          </div>
          
          <div style={{ paddingLeft: '34px' }}>
            {content?.projectDuration ? (
              content.projectDuration.map((item: any, idx: number) => (
                <div key={idx} style={{ marginBottom: '15px' }}>
                  <p style={{ fontWeight: 'bold', marginBottom: '5px' }}>{idx + 1}. {item.title}</p>
                  <p style={{ textAlign: 'justify' }}>
                    {item.text.replace('{{completionDate}}', offer?.completionDate || '{completion_date}')}
                  </p>
                </div>
              ))
            ) : (
              <>
                <div style={{ marginBottom: '15px' }}>
                  <p style={{ fontWeight: 'bold', marginBottom: '5px' }}>1. Fee Valid</p>
                  <p style={{ textAlign: 'justify' }}>
                    Total fee indicated is valid up to {offer?.completionDate || '{completion_date}'} This may be deferred depending on the built-up area considered for MEPF Design services. Any extension to this period wherein WISETECH MEP CONSULTANTS PVT LTD would have to continue providing services shall be compensated by the Client at a mutually accepted fee which shall be incremented based on the then prevailing rates for MEPF Consultancy services.
                  </p>
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <p style={{ fontWeight: 'bold', marginBottom: '5px' }}>2. Revision Work</p>
                  <p style={{ textAlign: 'justify' }}>
                    Any major changes requested for by the Client or by the Architect or other Consultants on behalf of the Client, after finalization and approvals by client, the changes may involve cost escalation. This escalation shall be communicated to the client and shall be discussed and mutually agreed upon before proceeding with any changes.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
