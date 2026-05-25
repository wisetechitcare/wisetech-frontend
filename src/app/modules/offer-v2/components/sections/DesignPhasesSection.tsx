import React from 'react';
import { Calendar, Pencil, PenTool, ClipboardList } from 'lucide-react';

interface DesignPhasesSectionProps {
  id?: string;
  content?: any;
}

export const DesignPhasesSection: React.FC<DesignPhasesSectionProps> = ({ id, content }) => {
  const title = content?.title || 'PHASES OF DESIGN AND TIME SCHEDULE';
  const intro = content?.intro || 'Design and Engineering work will be carried out by\nWISETECH MEP CONSULTANTS PVT LTD in the following stages:';
  const phases = content?.phases || [];

  const getIcon = (phaseId: string) => {
    switch (phaseId) {
      case 'concept-design': return <Pencil size={24} color="#c81010" strokeWidth={2} />;
      case 'design-detailing': return <PenTool size={24} color="#c81010" strokeWidth={2} />;
      case 'tendering': return <ClipboardList size={24} color="#c81010" strokeWidth={2} />;
      case 'contracting': return <PenTool size={24} color="#c81010" strokeWidth={2} />;
      default: return <Pencil size={24} color="#c81010" strokeWidth={2} />;
    }
  };

  return (
    <div id={id} style={{ display: 'flex', flexDirection: 'column', flex: 1, position: 'relative', paddingBottom: '40px' }}>

      {/* Content */}
      <div style={{ flex: 1, fontSize: '13px', lineHeight: '1.6', outline: 'none', whiteSpace: 'pre-wrap' }} contentEditable suppressContentEditableWarning>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '40px', gap: '15px' }}>
          <Calendar size={40} color="#c81010" strokeWidth={1.5} />
          <div>
            <div style={{ color: '#c81010', fontWeight: 'bold', fontSize: '16px', textDecoration: 'underline' }}>ANNEXURE-II</div>
            <div style={{ color: '#c81010', fontWeight: 'bold', fontSize: '18px', textDecoration: 'underline' }}>{title}</div>
          </div>
        </div>

        <div style={{ marginBottom: '30px', pageBreakInside: 'avoid' }}>
          <p style={{ marginBottom: '20px' }}>{intro}</p>
        </div>

        {phases.map((phase: any, index: number) => (
          <div key={index} style={{ marginBottom: '30px', pageBreakInside: 'avoid' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
              {getIcon(phase.id)}
              <div style={{ color: '#c81010', fontWeight: 'bold', fontSize: '14px', textDecoration: phase.id !== 'concept-design' ? 'underline' : 'none' }}>{phase.title}</div>
            </div>

            <div style={{ paddingLeft: '34px' }}>
              {phase.introList && (
                <ul style={{ listStyleType: 'none', paddingLeft: '0', marginBottom: '15px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {phase.introList.map((item: string, iIdx: number) => (
                    <li key={iIdx}>{item}</li>
                  ))}
                </ul>
              )}

              {phase.paragraphs && phase.paragraphs.map((p: string, pIdx: number) => (
                <p key={pIdx} style={{ marginBottom: '15px', textAlign: 'justify' }}>{p}</p>
              ))}

              {phase.deliverables && (
                <>
                  <p style={{ marginBottom: '10px', textDecoration: 'underline' }}>Deliverables in this stage shall include:</p>
                  <ul style={{ listStyleType: 'disc', paddingLeft: '20px', marginBottom: '15px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {phase.deliverables.map((item: string, dIdx: number) => (
                      <li key={dIdx}>{item}</li>
                    ))}
                  </ul>
                </>
              )}

              {phase.notes && (
                <>
                  <p style={{ textDecoration: 'underline', marginBottom: '10px' }}>Note:</p>
                  <ul style={{ listStyleType: 'disc', paddingLeft: '20px', marginBottom: '15px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {phase.notes.map((item: string, nIdx: number) => (
                      <li key={nIdx}>{item}</li>
                    ))}
                  </ul>
                </>
              )}

              {phase.completionText && (
                <p style={{ marginBottom: '20px', textAlign: 'justify', whiteSpace: 'pre-wrap' }}>{phase.completionText}</p>
              )}
            </div>
          </div>
        ))}

      </div>

    </div>
  );
};
