import React from 'react';

interface PageNavigatorProps {
  currentPage: number;
  totalPages: number;
  onPageSelect: (page: number) => void;
}

export const PageNavigator: React.FC<PageNavigatorProps> = ({ currentPage, totalPages, onPageSelect }) => {
  const sections = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div style={{ width: '200px', background: '#f8f9fa', padding: '20px', borderRight: '1px solid #ddd', height: '100vh', position: 'sticky', top: 0 }}>
      <h3 style={{ marginTop: 0, fontSize: '16px', borderBottom: '1px solid #ddd', paddingBottom: '10px' }}>Sections</h3>
      
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '5px' }}>
        {sections.map((p) => (
          <li key={p}>
            <button
              onClick={() => {
                onPageSelect(p);
                const element = document.getElementById(`section-${p}`);
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '8px 12px',
                background: currentPage === p ? '#e9ecef' : 'transparent',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: currentPage === p ? 'bold' : 'normal',
                color: currentPage === p ? '#0d6efd' : '#333'
              }}
            >
              Section {p}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};
