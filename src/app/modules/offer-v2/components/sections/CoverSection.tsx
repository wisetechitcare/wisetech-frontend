import React from 'react';
import { EditableBlock } from '../editor/EditableBlock';
import { OfferData } from '../../types/offer.types';

interface CoverSectionProps {
  id?: string;
  offer: OfferData;
  onUpdate: (field: keyof OfferData, value: string) => void;
  content?: any;
}

export const CoverSection: React.FC<CoverSectionProps> = ({ id, offer, onUpdate, content }) => {
  return (
    <div id={id} style={{ display: 'flex', flexDirection: 'column', minHeight: '1000px', position: 'relative' }}>

      {/* Absolute positioned geometric shapes for top right */}
      <div style={{ position: 'absolute', top: 0, right: -40, width: '250px', height: '250px', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-20px', right: '40px', width: '120px', height: '120px', backgroundColor: '#1c345c', transform: 'rotate(45deg)' }} />
        <div style={{ position: 'absolute', top: '80px', right: '80px', width: '100px', height: '100px', backgroundColor: '#c81010', transform: 'rotate(45deg)' }} />
        <div style={{ position: 'absolute', top: '20px', right: '-30px', width: '130px', height: '130px', backgroundColor: '#c81010', transform: 'rotate(45deg)' }} />
      </div>

      {/* Absolute positioned geometric shapes for bottom left */}
      <div style={{ position: 'absolute', bottom: 0, left: -40, width: '250px', height: '250px', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', bottom: '20px', left: '-50px', width: '120px', height: '120px', backgroundColor: '#c81010', transform: 'rotate(45deg)' }} />
        <div style={{ position: 'absolute', bottom: '-40px', left: '40px', width: '150px', height: '150px', backgroundColor: '#89909a', transform: 'rotate(45deg)' }} />
        <div style={{ position: 'absolute', bottom: '80px', left: '-80px', width: '100px', height: '100px', backgroundColor: '#1c345c', transform: 'rotate(45deg)' }} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, zIndex: 1, position: 'relative' }}>

        {/* Main Title Content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ marginBottom: '80px' }}>
            <h1 style={{ fontSize: '48px', color: '#1c345c', margin: 0, fontWeight: 900 }}>{content?.title || 'MEP'}</h1>
            <h2 style={{ fontSize: '32px', color: '#c81010', margin: 0, fontWeight: 'bold' }}>{content?.subtitle || 'Consultancy Proposal'}</h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '25px', fontSize: '16px' }}>

            <div style={{ display: 'flex' }}>
              <div style={{ width: '150px', fontWeight: 'bold' }}>Kind Attn</div>
              <div style={{ width: '20px' }}>:</div>
              <div style={{ flex: 1, fontWeight: 'bold', display: 'flex', gap: '5px' }}>
                <EditableBlock value={offer.contactTitle} onChange={(val) => onUpdate('contactTitle', val)} placeholder="Mr." />
                <EditableBlock value={offer.contactPerson} onChange={(val) => onUpdate('contactPerson', val)} placeholder="Contact Person" />
              </div>
            </div>

            <div style={{ display: 'flex' }}>
              <div style={{ width: '150px', fontWeight: 'bold' }}>Project Name</div>
              <div style={{ width: '20px' }}>:</div>
              <div style={{ flex: 1, fontWeight: 'bold' }}>
                <EditableBlock value={offer.projectName} onChange={(val) => onUpdate('projectName', val)} placeholder="Project Name" />
              </div>
            </div>

            <div style={{ display: 'flex' }}>
              <div style={{ width: '150px', fontWeight: 'bold' }}>Submitted by</div>
              <div style={{ width: '20px' }}>:</div>
              <div style={{ flex: 1, fontWeight: 'bold' }}>
                <EditableBlock value={offer.submittedBy} onChange={(val) => onUpdate('submittedBy', val)} placeholder="Submitted By" />
              </div>
            </div>

            <div style={{ display: 'flex' }}>
              <div style={{ width: '150px', fontWeight: 'bold' }}>Leads / Offer no.</div>
              <div style={{ width: '20px' }}>:</div>
              <div style={{ flex: 1, fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
                <EditableBlock value={offer.inquiryNumber} onChange={(val) => onUpdate('inquiryNumber', val)} placeholder="Offer No" />
                <span style={{ margin: '0 10px' }}>Rev.</span>
                <EditableBlock value={offer.revisionNumber} onChange={(val) => onUpdate('revisionNumber', val)} placeholder="Revision" />
              </div>
            </div>

            <div style={{ display: 'flex' }}>
              <div style={{ width: '150px', fontWeight: 'bold' }}>Leads / Offer Date.</div>
              <div style={{ width: '20px' }}>:</div>
              <div style={{ flex: 1, fontWeight: 'bold' }}>
                <EditableBlock value={offer.offerDate} onChange={(val) => onUpdate('offerDate', val)} placeholder="Date" />
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
