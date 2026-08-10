import { useCallback, useEffect, useMemo, useState } from 'react';
import { Option } from '@models/dropdown';
import { fetchAllReimbursementTypesFromDb } from '@utils/statistics';
import { getAllCompanyTypes, getAllClientCompanies } from '@services/companies';
import { getReimbursementProjectOptions, getAllProjectStatuses } from '@services/projects';

/**
 * Everything the expense form needs to populate and cascade its dropdowns.
 *
 * This logic existed three times — in the direct form, the drafts form and the edit modal —
 * roughly 180 lines apiece: the same five fetches, the same File-Location scoping, the same
 * reverse-autofill from a project back to its company. The copies had already drifted on which
 * lookups they loaded and how they restored a saved selection.
 *
 * It is a hook rather than a component because the three forms' BEHAVIOUR is identical while
 * their layout is not — one is a page section, two are modals with different column widths.
 * Merging the markup would have meant a props-driven layout switch; merging the behaviour costs
 * nothing and is where the duplication actually was.
 */

interface ProjectRow {
    id: string;
    title?: string | null;
    projectPrefix?: string | null;
    fileLocationCompanyType?: string | null;
    fileLocationCompany?: string | null;
    status?: { id?: string; name?: string } | null;
}

interface ClientCompanyRow {
    id: string;
    companyName: string;
    companyTypeId?: string | null;
}

type SetFieldValue = (field: string, value: unknown) => void;

export interface ReimbursementFormLookups {
    /** Expense categories, carrying their caps and requiresLocation flag. */
    reimbursementOptions: Option[];
    /** Company types that are actually used as a project's File Location. */
    companyTypeOptions: Option[];
    /** Companies under the selected type, scoped the same way. */
    filteredCompanies: ClientCompanyRow[];
    projectOptions: Option[];
    projectsLoading: boolean;

    selectedReimbursementFor: Option | null;
    selectedClientType: Option | null;
    selectedClientCompany: Option | null;
    selectedProject: Option | null;

    handleCategoryChange: (option: Option | null, setFieldValue: SetFieldValue) => void;
    handleClientTypeChange: (option: Option | null, setFieldValue: SetFieldValue) => void;
    handleClientCompanyChange: (option: Option | null, setFieldValue: SetFieldValue) => void;
    handleProjectChange: (option: Option | null, setFieldValue: SetFieldValue) => void;
    /** Clears every selection — for "add another" after a save. */
    reset: () => void;
}

/** The record being edited, when there is one. Its saved selections are restored on load. */
export interface LookupSeed {
    reimbursementTypeId?: string | null;
    clientTypeId?: string | null;
    clientCompanyId?: string | null;
    projectId?: string | null;
    leadId?: string | null;
}

export function useReimbursementFormLookups(seed?: LookupSeed | null): ReimbursementFormLookups {
    const [reimbursementOptions, setReimbursementOptions] = useState<Option[]>([]);
    const [allCompanyTypeOptions, setAllCompanyTypeOptions] = useState<Option[]>([]);
    const [companyTypeOptions, setCompanyTypeOptions] = useState<Option[]>([]);
    const [allClientCompanies, setAllClientCompanies] = useState<ClientCompanyRow[]>([]);
    const [filteredCompanies, setFilteredCompanies] = useState<ClientCompanyRow[]>([]);
    const [allProjects, setAllProjects] = useState<ProjectRow[]>([]);
    const [projectOptions, setProjectOptions] = useState<Option[]>([]);
    const [ongoingStatusIds, setOngoingStatusIds] = useState<string[]>([]);
    const [projectsLoading, setProjectsLoading] = useState(true);

    const [selectedReimbursementFor, setSelectedReimbursementFor] = useState<Option | null>(null);
    const [selectedClientType, setSelectedClientType] = useState<Option | null>(null);
    const [selectedClientCompany, setSelectedClientCompany] = useState<Option | null>(null);
    const [selectedProject, setSelectedProject] = useState<Option | null>(null);

    // ── Load once ─────────────────────────────────────────────────────────────
    // allSettled, so one failing lookup cannot blank the whole form — every dropdown that CAN
    // load still loads.
    useEffect(() => {
        let cancelled = false;
        setProjectsLoading(true);

        Promise.allSettled([
            fetchAllReimbursementTypesFromDb(),
            getAllCompanyTypes(),
            getAllClientCompanies(),
            getAllProjectStatuses(),
            getReimbursementProjectOptions(),
        ]).then((results) => {
            if (cancelled) return;
            const val = (r: PromiseSettledResult<any>) => (r.status === 'fulfilled' ? r.value : undefined);
            const [typesR, typeListR, companiesR, statusesR, projectsR] = results;

            const types: any[] = val(typesR) || [];
            setReimbursementOptions(
                types
                    .map((r) => ({
                        value: r.id,
                        label: r.type,
                        icon: r.icon,
                        amountLimit: r.amountLimit ?? null,
                        // Owned by the category config — the form no longer guesses From/To from
                        // the category name.
                        requiresLocation: r.requiresLocation ?? true,
                    }))
                    .sort((a, b) => a.label.localeCompare(b.label)),
            );

            const allTypes: Option[] = ((val(typeListR)?.companyTypes) || [])
                .map((ct: any) => ({ value: ct.id, label: ct.name }))
                .sort((a: Option, b: Option) => a.label.localeCompare(b.label));
            setAllCompanyTypeOptions(allTypes);

            const companiesRes = val(companiesR) || {};
            const companies: ClientCompanyRow[] =
                companiesRes?.data?.companies ||
                companiesRes?.clientCompanies ||
                companiesRes?.data?.clientCompanies ||
                companiesRes?.companies ||
                [];
            setAllClientCompanies(companies);

            const projectsRes = val(projectsR) || {};
            const projects: ProjectRow[] = projectsRes?.data?.projects || projectsRes?.projects || [];
            setAllProjects(projects);

            // Company Type/Name are scoped to those actually used as a project's File Location,
            // not the full client-company master list.
            const usedTypeIds = new Set(projects.map((p) => p.fileLocationCompanyType).filter(Boolean));
            setCompanyTypeOptions(allTypes.filter((t) => usedTypeIds.has(t.value)));

            const statuses: any[] = val(statusesR)?.projectStatuses || [];
            setOngoingStatusIds(
                statuses.filter((s) => s.name?.trim().toLowerCase() === 'on ongoing').map((s) => s.id),
            );
        }).finally(() => { if (!cancelled) setProjectsLoading(false); });

        return () => { cancelled = true; };
    }, []);

    const computeFilteredCompaniesForType = useCallback((typeId: string): ClientCompanyRow[] => {
        const usedCompanyIds = new Set(
            allProjects
                .filter((p) => p.fileLocationCompanyType === typeId)
                .map((p) => p.fileLocationCompany)
                .filter(Boolean),
        );
        return allClientCompanies
            .filter((c) => c.companyTypeId === typeId && usedCompanyIds.has(c.id))
            .sort((a, b) => a.companyName.localeCompare(b.companyName));
    }, [allProjects, allClientCompanies]);

    // Lead-as-master: a saved row carries leadId; the picker speaks in project ids.
    const seedProjectId = seed?.leadId || seed?.projectId || null;

    // ── Restore a saved record's selections once the lookups have loaded ──────
    useEffect(() => {
        if (!seed || allCompanyTypeOptions.length === 0 || allClientCompanies.length === 0) return;

        if (seed.reimbursementTypeId && reimbursementOptions.length > 0) {
            setSelectedReimbursementFor(
                reimbursementOptions.find((o) => o.value === seed.reimbursementTypeId) ?? null);
        }

        if (seed.clientTypeId) {
            // Resolved against the FULL master list, not the File-Location-scoped one, so editing
            // an older record never shows a blank Type.
            setSelectedClientType(allCompanyTypeOptions.find((c) => c.value === seed.clientTypeId) ?? null);

            let filtered = computeFilteredCompaniesForType(seed.clientTypeId);
            if (seed.clientCompanyId) {
                const match = allClientCompanies.find((c) => c.id === seed.clientCompanyId);
                if (match) {
                    setSelectedClientCompany({ value: match.id, label: match.companyName });
                    // Legacy data may name a company that is not a File Location for any project.
                    // Still show it, so editing does not silently drop it.
                    if (!filtered.some((c) => c.id === match.id)) {
                        filtered = [...filtered, match].sort((a, b) => a.companyName.localeCompare(b.companyName));
                    }
                }
            }
            setFilteredCompanies(filtered);
        }
    }, [seed?.reimbursementTypeId, seed?.clientTypeId, seed?.clientCompanyId,
        allCompanyTypeOptions, allClientCompanies, reimbursementOptions, computeFilteredCompaniesForType]);

    // ── Project options, derived so the field stays searchable regardless of the
    //    company selection. Choosing a company narrows it; choosing a project backfills.
    useEffect(() => {
        if (allProjects.length === 0) { setProjectOptions([]); return; }

        let list = allProjects;
        if (selectedClientCompany?.value) {
            list = list.filter((p) => p.fileLocationCompany === selectedClientCompany.value);
        } else if (selectedClientType?.value) {
            list = list.filter((p) => p.fileLocationCompanyType === selectedClientType.value);
        }
        // Keep the saved project even if it is no longer ongoing — otherwise opening an old
        // record shows a blank where its project used to be.
        list = list.filter((p) => (p.status?.id && ongoingStatusIds.includes(p.status.id)) || p.id === seedProjectId);

        const opts: Option[] = [...list]
            .sort((a, b) => (a.title || '').localeCompare(b.title || ''))
            .map((p) => ({
                value: p.id,
                label: p.projectPrefix ? `${p.projectPrefix} - ${p.title}` : (p.title ?? p.id),
            }));
        setProjectOptions(opts);

        if (seedProjectId) {
            const match = opts.find((o) => o.value === seedProjectId);
            if (match) setSelectedProject(match);
        }
    }, [allProjects, selectedClientType, selectedClientCompany, ongoingStatusIds, seedProjectId]);

    // ── Cascade ───────────────────────────────────────────────────────────────

    const handleCategoryChange = useCallback((option: Option | null, setFieldValue: SetFieldValue) => {
        setSelectedReimbursementFor(option);
        setFieldValue('reimbursementTypeId', option?.value || '');
    }, []);

    const handleClientTypeChange = useCallback((option: Option | null, setFieldValue: SetFieldValue) => {
        setSelectedClientType(option);
        setFieldValue('clientTypeId', option?.value || '');
        setSelectedClientCompany(null);
        setFieldValue('clientCompanyId', '');
        setSelectedProject(null);
        setFieldValue('projectId', '');
        setFilteredCompanies(option?.value ? computeFilteredCompaniesForType(option.value) : []);
    }, [computeFilteredCompaniesForType]);

    const handleClientCompanyChange = useCallback((option: Option | null, setFieldValue: SetFieldValue) => {
        setSelectedClientCompany(option);
        setFieldValue('clientCompanyId', option?.value || '');
        // The project effect repopulates for the new company.
        setSelectedProject(null);
        setFieldValue('projectId', '');
    }, []);

    /**
     * Reverse autofill: picking a project backfills its company type and company from the
     * project's File Location, so the two directions agree however the user got there.
     */
    const handleProjectChange = useCallback((option: Option | null, setFieldValue: SetFieldValue) => {
        setSelectedProject(option);
        setFieldValue('projectId', option?.value || '');
        if (!option?.value) return;

        const project = allProjects.find((p) => p.id === option.value);
        if (!project) return;

        if (project.fileLocationCompanyType) {
            const typeMatch = allCompanyTypeOptions.find((t) => t.value === project.fileLocationCompanyType);
            if (typeMatch) {
                setSelectedClientType(typeMatch);
                setFieldValue('clientTypeId', typeMatch.value);
                setFilteredCompanies(computeFilteredCompaniesForType(typeMatch.value));
            }
        }
        if (project.fileLocationCompany) {
            const companyMatch = allClientCompanies.find((c) => c.id === project.fileLocationCompany);
            if (companyMatch) {
                setSelectedClientCompany({ value: companyMatch.id, label: companyMatch.companyName });
                setFieldValue('clientCompanyId', companyMatch.id);
            }
        }
    }, [allProjects, allCompanyTypeOptions, allClientCompanies, computeFilteredCompaniesForType]);

    const reset = useCallback(() => {
        setSelectedReimbursementFor(null);
        setSelectedClientType(null);
        setSelectedClientCompany(null);
        setSelectedProject(null);
        setFilteredCompanies([]);
    }, []);

    return useMemo(() => ({
        reimbursementOptions, companyTypeOptions, filteredCompanies, projectOptions, projectsLoading,
        selectedReimbursementFor, selectedClientType, selectedClientCompany, selectedProject,
        handleCategoryChange, handleClientTypeChange, handleClientCompanyChange, handleProjectChange,
        reset,
    }), [
        reimbursementOptions, companyTypeOptions, filteredCompanies, projectOptions, projectsLoading,
        selectedReimbursementFor, selectedClientType, selectedClientCompany, selectedProject,
        handleCategoryChange, handleClientTypeChange, handleClientCompanyChange, handleProjectChange, reset,
    ]);
}
