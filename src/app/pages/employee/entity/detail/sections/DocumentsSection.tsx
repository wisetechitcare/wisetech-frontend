import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '@redux/store';
import { DetailCard, DetailRow } from '@app/modules/detail-page/DetailPageComponents';
import { EmptyState } from '../widgets';
import { DASH } from '../entityViewModel';
import type { EntityVM } from '../facets';
import { AppIcon } from '@app/modules/common/components/ui/AppIcon';
import MaterialTable from '@app/modules/common/components/MaterialTable';
import FileLocationCard from './FileLocationCard';

const DocLink: React.FC<{ href: string; icon: string; label: string }> = ({ href, icon, label }) => (
  <a href={href} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#1E3A8A', textDecoration: 'none', fontSize: 12, fontWeight: 600 }}>
    <i className={icon} /> {label}
  </a>
);

/**
 * Documents tab — consolidates generated proposals AND the DMS file modules
 * (passed as `children`) so "Files" is no longer a separate tab.
 */
const DocumentsSection: React.FC<{ vm: EntityVM; onExport?: () => void; children?: React.ReactNode }> = ({
  vm,
  onExport,
  children,
}) => {
  const docs = vm.documents;
  const currentUserId = useSelector((s: RootState) => s.auth?.currentUser?.id);

  // DocVM is already flat (name/template/revision/date/by + the two urls), so the
  // table sorts and searches on real values. Cells render what the <table> did.
  const columns = useMemo(() => [
    {
      accessorKey: 'name',
      header: 'Document',
      Cell: ({ cell }: any) => <span style={{ fontWeight: 700, color: '#1E293B' }}>{cell.getValue()}</span>,
    },
    { accessorKey: 'template', header: 'Template', Cell: ({ cell }: any) => cell.getValue() || DASH },
    { accessorKey: 'revision', header: 'Rev.', Cell: ({ cell }: any) => cell.getValue() ?? DASH },
    { accessorKey: 'date', header: 'Generated', Cell: ({ cell }: any) => cell.getValue() || DASH },
    { accessorKey: 'by', header: 'By', Cell: ({ cell }: any) => cell.getValue() || DASH },
    {
      accessorKey: 'download',
      header: 'Download',
      Cell: ({ row }: any) => (
        <div style={{ display: 'flex', gap: 10 }}>
          {row.original.pdf && <DocLink href={row.original.pdf} icon="bi bi-file-earmark-pdf" label="PDF" />}
          {row.original.docx && <DocLink href={row.original.docx} icon="bi bi-file-earmark-word" label="DOCX" />}
        </div>
      ),
    },
  ], []);

  return (
    <div className="d-flex flex-column gap-5">
      <FileLocationCard vm={vm} />
      <DetailCard
        title="Generated Documents"
        subtitle={`${docs.length} proposal${docs.length === 1 ? '' : 's'}`}
        icon="bi bi-file-earmark-text"
        accentColor="purple"
        actions={
          onExport ? (
            <button type="button" onClick={onExport} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#7239ea', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontFamily: 'Inter', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              <AppIcon name="bi-plus-lg" /> Generate
            </button>
          ) : undefined
        }
      >
        {docs.length === 0 ? (
          <EmptyState icon="bi bi-file-earmark-text" title="No generated documents" message="Proposals exported for this record will be listed here with their revisions and download links." hint="Use Export to generate a proposal" />
        ) : (
          <MaterialTable
            tableName="ProjectGeneratedDocuments"
            employeeId={currentUserId}
            data={docs}
            columns={columns}
            hidePagination
            hideExportCenter
            enableColumnActions={false}
          />
        )}
      </DetailCard>

      {/* DMS uploads (drawings / contracts / files) injected by the shell */}
      {children}
    </div>
  );
};

export default DocumentsSection;
