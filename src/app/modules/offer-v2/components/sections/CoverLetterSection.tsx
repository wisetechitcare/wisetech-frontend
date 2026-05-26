import React from 'react';
import { OfferData } from '../../types/offer.types';

interface CoverLetterSectionProps {
  id?: string;
  offer: OfferData;
  content?: any;
  savedHtml?: string;
}

export const CoverLetterSection: React.FC<CoverLetterSectionProps> = ({ id, offer, content, savedHtml }) => {
  const replacePlaceholders = (text: string) => {
    if (!text) return '';
    return text
      .replace(/{{projectName}}/g, offer.projectName || '')
      .replace(/{{location}}/g, offer.projectLocation || '')
      .replace(/{{builtUpArea}}/g, offer.totalProjectArea || '');
  };

  const subject = replacePlaceholders(content?.subject || `Offer for ${offer.services} Design Consultancy Services for the proposed ${offer.projectName}`);
  const greeting = replacePlaceholders(content?.greeting || `Dear Sir,`);
  const introText = replacePlaceholders(content?.introText || `Please find attached along with our offer for rendering ${offer.services} Design Consultancy Services for the proposed ${offer.projectName}`);
  
  const projectBriefFields = content?.projectBrief?.fields || [
    { label: 'Project Name', value: offer.projectName },
    { label: 'Location', value: offer.projectLocation },
    { label: 'Nature of Development', value: 'Residential' },
    { label: 'Total built-up area', value: `Approx. ${offer.totalProjectArea} Sq. ft` }
  ];

  const submissionText = content?.submissionText || 'The submission includes the following annexures;';
  const annexuresList = content?.annexuresList || [
    { id: 'I', label: 'Scope of Services rendered under various disciplines.' },
    { id: 'II', label: 'Phases of Design and Time Schedule for Deliverables.' },
    { id: 'III', label: 'Remuneration and Schedule of Payment' },
    { id: 'IV', label: 'General Terms and Conditions.' }
  ];

  return (
    <div id={id} style={{ display: 'flex', flexDirection: 'column', flex: 1, position: 'relative', paddingBottom: '40px' }}>

      {/* Content */}
      <div data-section-id="cover-letter" style={{ flex: 1, fontSize: '14px', lineHeight: '1.6', outline: 'none', whiteSpace: 'pre-wrap' }} contentEditable suppressContentEditableWarning dangerouslySetInnerHTML={savedHtml ? { __html: savedHtml } : undefined}>
        {!savedHtml && (
          <>

        <div style={{ fontWeight: 'bold', marginBottom: '20px' }}>
          <div>M/s. <span>{offer.companyName}</span></div>
          <div><span>{offer.companyAddress}</span></div>
          <div>
            <span>{offer.companyArea}</span>{offer.companyArea ? ', ' : ''}
            <span>{offer.companyCity}</span>{offer.companyCity ? ' - ' : ''}
            <span>{offer.companyZipcode}</span>
          </div>
          <div>
            <span>{offer.companyState}</span>{offer.companyState ? ', ' : ''}
            <span>{offer.companyCountry}</span>
          </div>
        </div>

        <div style={{ marginBottom: '20px', display: 'flex' }}>
          <div style={{ width: '100px' }}>Kind Attn</div>
          <div>:</div>
          <div style={{ marginLeft: '10px', fontWeight: 'bold' }}>
            <span>{offer.contactTitle ? `${offer.contactTitle} ` : ''}{offer.contactPerson}</span>
          </div>
        </div>

        <div style={{ marginBottom: '30px', display: 'flex' }}>
          <div style={{ width: '100px', fontWeight: 'bold' }}>Sub</div>
          <div style={{ fontWeight: 'bold' }}>:</div>
          <div style={{ marginLeft: '10px', fontWeight: 'bold' }}>
            <span>{subject}</span>
          </div>
        </div>

        <div style={{ marginBottom: '15px' }}>
          {greeting} <span>{offer.contactTitle} {offer.contactPerson}</span>,
        </div>

        <div style={{ marginBottom: '40px' }}>
          <span>{introText}</span>
        </div>

        <div style={{ fontWeight: 'bold', color: '#1c345c', marginBottom: '15px' }}>
          {content?.projectBrief?.title || 'PROJECT BRIEF'}
        </div>

        <ul style={{ listStyleType: 'disc', paddingLeft: '20px', marginBottom: '30px' }}>
          {projectBriefFields.map((field: any, index: number) => (
            <li key={index} style={{ marginBottom: '10px' }}>
              <div style={{ display: 'flex' }}>
                <div style={{ width: '180px' }}>{field.label}</div>
                <div>:</div>
                <div style={{ marginLeft: '10px' }}>
                  <span>{replacePlaceholders(field.value)}</span>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <div style={{ marginBottom: '15px' }}>{submissionText}</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '10px' }}>
          {annexuresList.map((annexure: any, index: number) => (
            <div key={index} style={{ display: 'flex' }}>
              <div style={{ width: '100px' }}>Annexure {annexure.id}</div>
              <div style={{ width: '20px' }}>-</div>
              <div>{annexure.label}</div>
            </div>
          ))}
        </div>
        </>
        )}
      </div>

    </div>
  );
};
