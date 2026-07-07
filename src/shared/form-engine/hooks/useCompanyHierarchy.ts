import { useState, useCallback } from "react";
import { fetchSubCompaniesByMainCompanyId } from "@services/company";
import {
  getAllClientContacts,
  getClientContactsByCompanyId,
} from "@services/companies";
import { CompanyHierarchyState } from "../types/formEngine.types";

const sortByName = (list: any[], nameKey = "companyName") =>
  [...list].sort((a, b) => (a[nameKey] || "").localeCompare(b[nameKey] || ""));

/**
 * useCompanyHierarchy
 *
 * Global reusable hook for the cascading company hierarchy pattern:
 *   Company Type → Company → Sub-Company → Contact
 *
 * Designed for FieldArray contexts where each row (index) has its own
 * independent cascade state. Reusable across Lead, Project, Vendor, Client,
 * and any future module that manages company relationships.
 *
 * @param allCompanies  Full list of companies from the API (fetched by parent)
 */
export function useCompanyHierarchy(allCompanies: any[]): CompanyHierarchyState {
  const [filteredCompanies, setFilteredCompanies] = useState<Record<number, any[]>>({});
  const [filteredSubCompanies, setFilteredSubCompanies] = useState<Record<number, any[]>>({});
  const [filteredContacts, setFilteredContacts] = useState<Record<number, any[]>>({});

  // Step 1: Company Type selected → filter companies by type
  const handleCompanyTypeChange = useCallback(
    (index: number, typeId: string) => {
      if (!typeId) {
        setFilteredCompanies((prev) => ({ ...prev, [index]: [] }));
        return;
      }
      const filtered = allCompanies.filter(
        (c) => String(c.companyTypeId) === String(typeId)
      );
      setFilteredCompanies((prev) => ({
        ...prev,
        [index]: sortByName(filtered),
      }));
    },
    [allCompanies]
  );

  // Step 2: Company selected → load sub-companies + contacts for that company
  const handleCompanyChange = useCallback(
    async (index: number, companyId: string) => {
      if (!companyId) {
        setFilteredSubCompanies((prev) => ({ ...prev, [index]: [] }));
        setFilteredContacts((prev) => ({ ...prev, [index]: [] }));
        return;
      }
      try {
        const [subRes, contactRes] = await Promise.all([
          fetchSubCompaniesByMainCompanyId(companyId),
          getClientContactsByCompanyId(companyId),
        ]);
        const subData = subRes?.data?.subCompanies || subRes?.subCompanies || [];
        const contacts = (contactRes?.data?.contacts || []).filter(
          (c: any) => !c.subCompanyId
        );
        setFilteredSubCompanies((prev) => ({ ...prev, [index]: subData }));
        setFilteredContacts((prev) => ({
          ...prev,
          [index]: sortByName(contacts, "fullName"),
        }));
      } catch {
        setFilteredSubCompanies((prev) => ({ ...prev, [index]: [] }));
        setFilteredContacts((prev) => ({ ...prev, [index]: [] }));
      }
    },
    []
  );

  // Step 3: Sub-Company selected → load contacts for that sub-company
  const handleSubCompanyChange = useCallback(
    async (index: number, subCompanyId: string, companyId: string) => {
      if (!subCompanyId) {
        if (companyId) {
          try {
            const res = await getClientContactsByCompanyId(companyId);
            const contacts = res?.data?.contacts || [];
            setFilteredContacts((prev) => ({
              ...prev,
              [index]: sortByName(contacts, "fullName"),
            }));
          } catch {}
        } else {
          setFilteredContacts((prev) => ({ ...prev, [index]: [] }));
        }
        return;
      }
      try {
        const [subRes, parentRes] = await Promise.all([
          getAllClientContacts({ subCompanyId }),
          companyId
            ? getClientContactsByCompanyId(companyId)
            : Promise.resolve({ data: { contacts: [] } }),
        ]);
        const subContacts = subRes?.data?.contacts || subRes?.contacts || [];
        const parentContacts = (
          parentRes?.data?.contacts || []
        ).filter((pc: any) => !pc.subCompanyId);

        // Merge sub-company contacts + parent contacts (deduplicated)
        const combined = [
          ...subContacts,
          ...parentContacts.filter(
            (pc: any) => !subContacts.some((sc: any) => sc.id === pc.id)
          ),
        ];
        setFilteredContacts((prev) => ({
          ...prev,
          [index]: sortByName(combined, "fullName"),
        }));
      } catch {
        setFilteredContacts((prev) => ({ ...prev, [index]: [] }));
      }
    },
    []
  );

  // Preload all cascade states from saved data (edit mode / conversion mode)
  const preloadCascades = useCallback(
    async (
      entries: Array<{
        companyTypeId?: string;
        companyId?: string;
        subCompanyId?: string;
      }>
    ) => {
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        if (entry.companyTypeId) {
          handleCompanyTypeChange(i, entry.companyTypeId);
        }
        if (entry.companyId) {
          await handleCompanyChange(i, entry.companyId);
        }
        if (entry.subCompanyId && entry.companyId) {
          await handleSubCompanyChange(i, entry.subCompanyId, entry.companyId);
        }
      }
    },
    [handleCompanyTypeChange, handleCompanyChange, handleSubCompanyChange]
  );

  return {
    filteredCompanies,
    filteredSubCompanies,
    filteredContacts,
    handleCompanyTypeChange,
    handleCompanyChange,
    handleSubCompanyChange,
    preloadCascades,
  };
}
