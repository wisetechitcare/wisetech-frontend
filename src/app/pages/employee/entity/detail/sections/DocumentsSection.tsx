import React, { useEffect, useState } from 'react';
import { DetailCard, DetailRow } from '@app/modules/detail-page/DetailPageComponents';
import { EmptyState } from '../widgets';
import { DASH } from '../entityViewModel';
import type { EntityVM } from '../facets';
import { getAllClientCompanies, getAllCompanyTypes } from '@services/companies';

const Td: React.FC<{ children?: React.ReactNode; strong?: boolean }> = ({ children, strong }) => (
  <td style={{ padding: '11px 12px', borderBottom: '1px solid #F4F6F9', fontSize: 13, color: strong ? '#1E293B' : '#475569', fontWeight: strong ? 700 : 500, whiteSpace: 'nowrap' }}>
    {children}
  </td>
);

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
  const fl = vm.fileLocation;
  const hasFileLocation = !!(fl.path || fl.company || fl.companyType);

  // `fl.company` / `fl.companyType` come through as raw ids (the API doesn't return
  // the display names), so resolve them to names — same lookup the leads table uses.
  // Falls back to the raw value if the id isn't found (or if a name was already sent).
  const [companyMap, setCompanyMap] = useState<Map<string, string>>(new Map());
  const [typeMap, setTypeMap] = useState<Map<string, string>>(new Map());
  useEffect(() => {
    if (!fl.company && !fl.companyType) return;
    let active = true;
    (async () => {
      try {
        const [companiesRes, typesRes]: [any, any] = await Promise.all([
          getAllClientCompanies(true),
          getAllCompanyTypes(),
        ]);
        if (!active) return;
        const companies = companiesRes?.data?.companies || companiesRes?.companies || [];
        const types = typesRes?.companyTypes || [];
        setCompanyMap(new Map(companies.map((c: any) => [String(c.id), c.companyName])));
        setTypeMap(new Map(types.map((t: any) => [String(t.id), t.name])));
      } catch {
        /* keep raw id as fallback */
      }
    })();
    return () => { active = false; };
  }, [fl.company, fl.companyType]);

  const companyLabel = fl.company ? (companyMap.get(String(fl.company)) || fl.company) : DASH;
  const typeLabel = fl.companyType ? (typeMap.get(String(fl.companyType)) || fl.companyType) : DASH;

  return (
    <div className="d-flex flex-column gap-5">
      {hasFileLocation && (
        <DetailCard title="File Location" subtitle="Where the source files live" icon="bi bi-folder2-open" accentColor="amber">
          <DetailRow label="Document Path" value={fl.path || DASH} />
          <DetailRow label="File Company" value={companyLabel} />
          <DetailRow label="File Company Type" value={typeLabel} isLast />
        </DetailCard>
      )}
      <DetailCard
        title="Generated Documents"
        subtitle={`${docs.length} proposal${docs.length === 1 ? '' : 's'}`}
        icon="bi bi-file-earmark-text"
        accentColor="purple"
        actions={
          onExport ? (
            <button type="button" onClick={onExport} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#7239ea', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontFamily: 'Inter', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              <i className="bi bi-plus-lg" /> Generate
            </button>
          ) : undefined
        }
      >
        {docs.length === 0 ? (
          <EmptyState icon="bi bi-file-earmark-text" title="No generated documents" message="Proposals exported for this record will be listed here with their revisions and download links." hint="Use Export to generate a proposal" />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Inter' }}>
              <thead>
                <tr style={{ textAlign: 'left' }}>
                  {['Document', 'Template', 'Rev.', 'Generated', 'By', 'Download'].map(h => (
                    <th key={h} style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5, padding: '10px 12px', borderBottom: '1px solid #EEF2F6', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {docs.map((d, i) => (
                  <tr key={i}>
                    <Td strong>{d.name}</Td>
                    <Td>{d.template || DASH}</Td>
                    <Td>{d.revision ?? DASH}</Td>
                    <Td>{d.date || DASH}</Td>
                    <Td>{d.by || DASH}</Td>
                    <Td>
                      <div style={{ display: 'flex', gap: 10 }}>
                        {d.pdf && <DocLink href={d.pdf} icon="bi bi-file-earmark-pdf" label="PDF" />}
                        {d.docx && <DocLink href={d.docx} icon="bi bi-file-earmark-word" label="DOCX" />}
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DetailCard>

      {/* DMS uploads (drawings / contracts / files) injected by the shell */}
      {children}
    </div>
  );
};

export default DocumentsSection;
