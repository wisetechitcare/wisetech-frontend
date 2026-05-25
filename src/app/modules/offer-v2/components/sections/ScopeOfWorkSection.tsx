import React from 'react';
import { OfferData } from '../../types/offer.types';
import { BookOpen, Zap, Cctv, Wind, Droplets, Flame, Leaf, Building2, Waves } from 'lucide-react';

interface ScopeOfWorkSectionProps {
  id?: string;
  offer: OfferData;
  content?: any;
}

export const ScopeOfWorkSection: React.FC<ScopeOfWorkSectionProps> = ({ id, offer, content }) => {
  const getIcon = (categoryId: string) => {
    switch (categoryId) {
      case 'electrical': return <Zap size={24} color="#c81010" strokeWidth={2} />;
      case 'extra-low-voltage': return <Cctv size={24} color="#c81010" strokeWidth={2} />;
      case 'hvac': return <Wind size={24} color="#c81010" strokeWidth={2} />;
      case 'plumbing': return <Droplets size={24} color="#c81010" strokeWidth={2} />;
      case 'fire-protection': return <Flame size={24} color="#c81010" strokeWidth={2} />;
      case 'moef-document': return <Leaf size={24} color="#c81010" strokeWidth={2} />;
      case 'high-rise-document': return <Building2 size={24} color="#c81010" strokeWidth={2} />;
      case 'crz-document': return <Waves size={24} color="#c81010" strokeWidth={2} />;
      default: return <BookOpen size={24} color="#c81010" strokeWidth={2} />;
    }
  };

  const title = content?.title || 'SCOPE OF WORK';
  const categories = content?.categories || [];

  return (
    <div id={id} style={{ display: 'flex', flexDirection: 'column', flex: 1, position: 'relative', paddingBottom: '40px' }}>

      {/* Content */}
      <div style={{ flex: 1, fontSize: '13px', lineHeight: '1.6', outline: 'none', whiteSpace: 'pre-wrap' }} contentEditable suppressContentEditableWarning>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '40px', gap: '15px' }}>
          <BookOpen size={40} color="#c81010" strokeWidth={1.5} />
          <div>
            <div style={{ color: '#c81010', fontWeight: 'bold', fontSize: '16px', textDecoration: 'underline' }}>Annexure-I</div>
            <div style={{ color: '#c81010', fontWeight: 'bold', fontSize: '22px', textDecoration: 'underline' }}>{title}</div>
          </div>
        </div>

        {categories.map((category: any, index: number) => (
          <div key={index} style={{ marginBottom: '30px', pageBreakInside: 'avoid' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              {getIcon(category.id)}
              <div style={{ color: '#c81010', fontWeight: 'bold', fontSize: '14px' }}>{category.title}</div>
            </div>

            <div style={{ paddingLeft: '34px' }}>
              {category.intro && <div style={{ marginBottom: '10px' }}>{category.intro}</div>}
              
              <ul style={{ listStyleType: 'disc', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {/* Main Items */}
                {category.items && category.items.map((item: string, idx: number) => (
                  <li key={`item-${idx}`}>{item}</li>
                ))}

                {/* Subsections */}
                {category.subsections && category.subsections.map((sub: any, sIdx: number) => (
                  <li key={`sub-${sIdx}`}>
                    <span style={{ textDecoration: 'underline' }}>{sub.title}</span>
                    <ul style={{ listStyleType: sub.type || 'circle', paddingLeft: '20px', marginTop: '4px' }}>
                      {sub.items && sub.items.map((subItem: string, siIdx: number) => (
                        <li key={`si-${siIdx}`}>{subItem}</li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}

      </div>

    </div>
  );
};
