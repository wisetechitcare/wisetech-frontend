import React from 'react';

/**
 * Intelligent Search Filter for Material React Table.
 * Implements OR logic between keywords across all searchable fields.
 */
export const intelligentSearchFilterFn = (row: any, id: string, filterValue: string): boolean => {
  if (!filterValue || filterValue.trim() === '') return true;

  const keywords = filterValue.toLowerCase().trim().split(/\s+/).filter(k => k.length > 0);
  if (keywords.length === 0) return true;

  const rowData = row.original;
  const searchableValues: string[] = [];

  const extractValues = (obj: any) => {
    if (!obj) return;
    Object.values(obj).forEach(value => {
      if (value === null || value === undefined) return;
      if (typeof value === 'object') {
        const obj = value as any;
        if (obj.name) searchableValues.push(String(obj.name).toLowerCase());
        if (obj.fullName) searchableValues.push(String(obj.fullName).toLowerCase());
        if (obj.title) searchableValues.push(String(obj.title).toLowerCase());
      } else {
        searchableValues.push(String(value).toLowerCase());
      }
    });
  };

  extractValues(rowData);

  return keywords.some(keyword => 
    searchableValues.some(val => val.includes(keyword))
  );
};

/**
 * HighlightMatch component for highlighting search terms in text.
 */
export const HighlightMatch: React.FC<{ text: string; query: string }> = ({ text, query }) => {
  if (!query || !query.trim() || !text) return <>{text || ''}</>;

  const keywords = query.toLowerCase().trim().split(/\s+/).filter(k => k.length > 0);
  if (keywords.length === 0) return <>{text}</>;

  const escapedKeywords = keywords.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const regex = new RegExp(`(${escapedKeywords.join('|')})`, 'gi');
  
  const parts = String(text).split(regex);

  return (
    <>
      {parts.map((part, i) => (
        regex.test(part) ? (
          <mark 
            key={i} 
            style={{ 
              backgroundColor: '#fff3cd', 
              color: 'inherit',
              padding: '0 1px', 
              borderRadius: '2px',
              borderBottom: '1px solid #ffd33d'
            }}
          >
            {part}
          </mark>
        ) : part
      ))}
    </>
  );
};
