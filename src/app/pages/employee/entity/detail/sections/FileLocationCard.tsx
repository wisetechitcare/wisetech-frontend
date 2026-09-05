import React, { useEffect, useState } from 'react';
import { DetailCard, DetailRow } from '@app/modules/detail-page/DetailPageComponents';
import { DASH } from '../entityViewModel';
import type { EntityVM } from '../facets';
import { getAllClientCompanies, getAllCompanyTypes } from '@services/companies';

/**
 * Where the source files live on the company machine/drive.
 *
 * Its own component because it renders on BOTH the Leads tab and the Documents
 * tab: the path is what someone opening a lead actually needs, and the Documents
 * tab is where it belongs by subject. One component, so the id→name resolution
 * below cannot drift between the two.
 *
 * Renders nothing when the record carries no location — an empty "File Location"
 * card is noise on every lead that never had one.
 */
/**
 * Exported so a caller that wraps this card in its own spacing can skip the
 * wrapper too — otherwise an absent location still leaves a margin behind.
 */
export const hasFileLocation = (vm: EntityVM): boolean =>
  !!(vm.fileLocation.path || vm.fileLocation.company || vm.fileLocation.companyType);

const FileLocationCard: React.FC<{ vm: EntityVM }> = ({ vm }) => {
  const fl = vm.fileLocation;

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

  if (!hasFileLocation(vm)) return null;

  const companyLabel = fl.company ? (companyMap.get(String(fl.company)) || fl.company) : DASH;
  const typeLabel = fl.companyType ? (typeMap.get(String(fl.companyType)) || fl.companyType) : DASH;

  return (
    <DetailCard title="File Location" subtitle="Where the source files live" icon="bi bi-folder2-open" accentColor="amber">
      <DetailRow label="Document Path" value={fl.path || DASH} />
      <DetailRow label="File Company" value={companyLabel} />
      <DetailRow label="File Company Type" value={typeLabel} isLast />
    </DetailCard>
  );
};

export default FileLocationCard;
