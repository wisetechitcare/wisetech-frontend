import React from 'react';
import type { EntityVM } from '../facets';
import FileLocationCard from './FileLocationCard';

/** Documents tab body: the file-location pointer plus the DMS file modules (passed as `children`). */
const DocumentsSection: React.FC<{ vm: EntityVM; children?: React.ReactNode }> = ({ vm, children }) => (
  <div className="d-flex flex-column gap-5">
    <FileLocationCard vm={vm} />
    {children}
  </div>
);

export default DocumentsSection;
