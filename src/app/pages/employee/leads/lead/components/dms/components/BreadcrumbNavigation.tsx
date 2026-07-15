import React from 'react';
import { motion } from 'framer-motion';
import { KTIcon } from '@metronic/helpers';
import { useDMS } from '../store/DmsContext';

export const BreadcrumbNavigation: React.FC = () => {
  const { state, dispatch, isGlobalMode } = useDMS();

  const handleClick = (index: number) => {
    if (index === -1) {
      dispatch({ type: 'SET_CURRENT_FOLDER', payload: null });
      dispatch({ type: 'SET_BREADCRUMBS', payload: [] });
    } else {
      const crumb = state.breadcrumbs[index];
      dispatch({ type: 'SET_CURRENT_FOLDER', payload: crumb.id });
      dispatch({ type: 'SET_BREADCRUMBS', payload: state.breadcrumbs.slice(0, index + 1) });
    }
  };

  const rootFolder = state.folders.find(f => f.parentId === null);
  const rootName = state.searchFilters.query ? 'Search Results' : (rootFolder?.name || 'All Files');

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '8px 16px', flexWrap: 'wrap' }}>
      <motion.span
        onClick={() => handleClick(-1)}
        whileHover={{ color: '#1E3A8A' }}
        style={{ 
          fontSize: '13px', 
          color: state.breadcrumbs.length === 0 ? '#1e293b' : '#64748b', 
          fontWeight: state.breadcrumbs.length === 0 ? 600 : 500,
          cursor: 'pointer', fontFamily: 'Inter',
          display: 'flex', alignItems: 'center', gap: '6px'
        }}
      >
        <KTIcon iconName={state.searchFilters.query ? 'magnifier' : 'home'} className="fs-5" /> 
        {state.searchFilters.query ? 'Search Results' : (isGlobalMode ? 'Global Repository' : 'Lead Documents')}
      </motion.span>
      {state.breadcrumbs.map((crumb, i) => (
        <React.Fragment key={crumb.id}>
          <span style={{ color: '#cbd5e1', fontSize: '12px', margin: '0 2px' }}>/</span>
          <motion.span
            onClick={() => handleClick(i)}
            whileHover={{ color: '#1E3A8A' }}
            style={{
              fontSize: '13px',
              color: i === state.breadcrumbs.length - 1 ? '#1e293b' : '#64748b',
              fontWeight: i === state.breadcrumbs.length - 1 ? 600 : 500,
              cursor: 'pointer', fontFamily: 'Inter',
            }}
          >
            {crumb.name}
          </motion.span>
        </React.Fragment>
      ))}
    </div>
  );
};

export default BreadcrumbNavigation;
