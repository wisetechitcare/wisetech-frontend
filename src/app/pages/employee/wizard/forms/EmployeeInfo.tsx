import { useEffect, useMemo, useState } from "react";
import { useFormikContext } from "formik";
import { fetchBranches, fetchWorkingMethods } from "@services/options";
import { useDepartmentDesignations } from "@/hooks/useDepartmentDesignations";
import { fetchOrganizationTree } from "@services/company";
import { getAllEmployeeLevels } from "@services/employee";
import { getAllTeams } from "@services/projects";
import { fetchAllOrganizationConfigurations, fetchAllEmployeeConfigurations } from "@services/configurations";
import { WtFieldFormik } from "@app/modules/common/components/ui";
import HierarchicalTaskSelect, { buildTaskOptions, type HierarchicalTaskOption } from "@app/pages/employee/tasks/components/HierarchicalTaskSelect";
import { IOrgNode } from "@models/company";

function EmployeeInfo() {
    const { values, setFieldValue, setValues } = useFormikContext<any>();
    const [orgTree, setOrgTree] = useState<IOrgNode[]>([]);
    const [allBranches, setAllBranches] = useState<any[]>([]);
    // Departments, job profiles and which job profiles each department offers — the one shared source.
    const dd = useDepartmentDesignations();
    const [branchOptions, setBrancheOptions] = useState([]);
const [employeeTypeOptions, setEmployeeTypeOptions] = useState([]);
    const [workingMethodOptions, setWorkingMethodOptions] = useState([]);
    const [teamOptions, setTeamOptions] = useState([]);
    const [employeeLevelOptions, setEmployeeLevelOptions] = useState([]);
    const [shiftOptions, setShiftOptions] = useState([]);
    const [experienceLevelOptions, setExperienceLevelOptions] = useState([]);


    useEffect(() => {
        async function getOrgTree() {
            try {
                const res = await fetchOrganizationTree();
                if (!res.hasError) setOrgTree(res.data?.organizations ?? []);
            } catch (e) { console.error('Failed to load organization tree', e); }
        }

        async function getAllBranches() {
            const { data: { branches } } = await fetchBranches();
            setAllBranches(branches || []);
            const options = (branches || []).map((branch: any) => ({ value: branch.id, label: branch.name }));
            setBrancheOptions(options);
        }


        async function getAllWorkingMethods() {
            const { data: { workingMethods } } = await fetchWorkingMethods();
            const options = workingMethods.map((method: any) => ({ value: method.id, label: method.type }));
            setWorkingMethodOptions(options);
        }

        async function getAllEmployeeTypes() {
            // Using new configuration API - fetchAllEmployeeConfigurations with EMPLOYEE_TYPE
            try {
                const response = await fetchAllEmployeeConfigurations("EMPLOYEE_TYPE");
                if (response?.data?.employeeConfigurations) {
                    const options = response.data.employeeConfigurations.map((type: any) => ({
                        value: type.id,
                        label: type.name
                    }));
                    setEmployeeTypeOptions(options);
                }
            } catch (error) {
                console.error("Error fetching employee types:", error);
            }

            // Old API call - kept for reference
            // const { data: { employeeTypes } } = await fetchEmployeeTypes();
            // const options = employeeTypes.map((type: any) => ({ value: type.id, label: type.type }));
            // setEmployeeTypeOptions(options);
        }

        // Reporting Manager (reportsToId) is now loaded in StepAppSettings > ReportingConfig

        async function getTeams() {
            const { data: { teams } } = await getAllTeams(1, 1000);
            const options = teams.map((team: any) => ({ value: team.id, label: team.name }));
            setTeamOptions(options);
        }

        async function getEmployeeLevels() {
            const { data: { employeeLevels } } = await getAllEmployeeLevels(1, 1000);
            const options = employeeLevels.map((level: any) => ({ value: level.id, label: level.name }));
            setEmployeeLevelOptions(options);
        }

        async function getShifts() {
            try {
                const response = await fetchAllOrganizationConfigurations("SHIFT");
                if (response?.data?.organizationConfigurations) {
                    const options = response.data.organizationConfigurations.map((config: any) => ({
                        value: config.id,
                        label: config.name
                    }));
                    setShiftOptions(options);
                }
            } catch (error) {
                console.error("Error fetching shifts:", error);
            }
        }

        async function getExperienceLevels() {
            try {
                const response = await fetchAllEmployeeConfigurations("EMPLOYEE_LEVEL");
                if (response?.data?.employeeConfigurations) {
                    const options = response.data.employeeConfigurations.map((config: any) => ({
                        value: config.id,
                        label: config.name
                    }));
                    setExperienceLevelOptions(options);
                }
            } catch (error) {
                console.error("Error fetching experience levels:", error);
            }
        }

        getOrgTree();
        getAllBranches();

        getAllWorkingMethods();
        getAllEmployeeTypes();
        getTeams();
        getEmployeeLevels();
        getShifts();
        getExperienceLevels();
    }, []);

    // ── Hierarchy: Organization → Sub-Organization → Branch ────────────────────
    const orgId = values.organizationId || '';
    const subOrgId = values.subOrganizationId || '';
    const effectiveOrgId = subOrgId || orgId;

    const orgOptions = useMemo(() => orgTree.map(o => ({ value: o.id, label: o.name })), [orgTree]);

    const selectedRootOrg = useMemo(() => orgTree.find(o => o.id === orgId), [orgTree, orgId]);
    const subOrgOptions = useMemo(() => (selectedRootOrg?.children ?? []).map(s => ({ value: s.id, label: s.name })), [selectedRootOrg]);
    const hasSubOrgs = subOrgOptions.length > 0;

    // Branches scoped to the chosen org (or sub-org if one is selected).
    const scopedBranchOptions = useMemo(
        () => allBranches.filter((b: any) => b.companyId === effectiveOrgId).map((b: any) => ({ value: b.id, label: b.name })),
        [allBranches, effectiveOrgId]
    );

    // Edit mode: derive the org/sub-org from the employee's existing branch/company.
    useEffect(() => {
        if (!orgTree.length || values.organizationId) return;
        const currentBranch = allBranches.find((b: any) => b.id === values.branchId);
        const cId = currentBranch?.companyId || values.companyId;
        if (!cId) return;
        const flat: { id: string; parentId: string | null }[] = [];
        const walk = (nodes: IOrgNode[], parentId: string | null) =>
            nodes.forEach(n => { flat.push({ id: n.id, parentId }); walk(n.children || [], n.id); });
        walk(orgTree, null);
        const node = flat.find(f => f.id === cId);
        if (!node) return;
        if (node.parentId) {
            setFieldValue('organizationId', node.parentId);
            setFieldValue('subOrganizationId', node.id);
        } else {
            setFieldValue('organizationId', node.id);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orgTree, allBranches]);

    // Reset the dependent fields in a SINGLE update. Firing setFieldValue three
    // times in a row makes Formik re-validate each call against a stale snapshot,
    // which re-adds the "Organization is a required field" error even right after
    // an organization is picked. setValues validates once with all fields updated.
    const handleOrgChange = (value: string) => {
        setValues((prev: any) => ({ ...prev, organizationId: value || '', subOrganizationId: '', branchId: '' }), true);
    };
    /**
     * Job profiles are a TREE — the same self-referencing table the preset-task configure page
     * nests — narrowed to the chosen department's job profiles once that department has been given
     * some in Configure. The saved value stays listed, so an older record never appears blank.
     */
    const departmentOptions = useMemo(() => dd.departments.map((d) => ({ value: d.id, label: d.name })), [dd.departments]);
    const designationOptions: HierarchicalTaskOption[] = useMemo(
        () => buildTaskOptions(
            dd.designationTreeFor(values.departmentId, values.designationId).map((d) => ({ id: d.id, name: d.role, parentId: d.parentId })),
        ),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [dd.designationTreeFor, values.departmentId, values.designationId],
    );
    const designationGuide = dd.designationHint(values.departmentId, values.designationId, { one: 'job profile', many: 'job profiles' });

    // A department that does not offer the chosen job profile clears it, rather than leaving a
    // pairing the server will refuse on save.
    const handleDepartmentChange = (nextDepartment: string) => {
        if (values.designationId && !dd.isPairAllowed(nextDepartment, values.designationId)) {
            setFieldValue('designationId', '', false);
        }
    };
    // Choosing a job profile first fills its department when it belongs to exactly one.
    const handleDesignationChange = (opt: { value?: string } | null) => {
        if (!values.departmentId && opt?.value) {
            const only = dd.onlyDepartmentOf(opt.value);
            if (only) setFieldValue('departmentId', only, true);
        }
    };

    const handleSubOrgChange = (value: string) => {
        setValues((prev: any) => ({ ...prev, subOrganizationId: value || '', branchId: '' }), true);
    };

    return (
        <>
  {/* Row 1: Hierarchy — Organization*, Sub-Organization, Choose Branch* — always all three
      fields, never conditionally hidden; Sub-Organization is simply empty/disabled when the
      selected org has none. */}
  <div className="row mb-4">
    <div className="col-lg-4 col-md-6 col-sm-12 mb-3 mb-lg-0">
      <WtFieldFormik
        required
        name="organizationId"
        label="Organization"
        options={orgOptions}
        onValueChange={handleOrgChange}
        searchable
      />
    </div>

    <div className="col-lg-4 col-md-6 col-sm-12 mb-3 mb-lg-0">
      <WtFieldFormik
        name="subOrganizationId"
        label="Sub-Organization"
        options={subOrgOptions}
        onValueChange={handleSubOrgChange}
        disabled={!hasSubOrgs}
        placeholder={hasSubOrgs ? undefined : 'No sub-organizations for this organization'}
        searchable
      />
    </div>

    <div className="col-lg-4 col-md-6 col-sm-12">
      <WtFieldFormik
        required
        name="branchId"
        label="Choose Branch"
        options={scopedBranchOptions}
        disabled={!effectiveOrgId}
        placeholder={!effectiveOrgId ? 'Select an organization first' : undefined}
        searchable
      />
    </div>
  </div>

  {/* Remaining fields: flowing 3-column grid — fills left-to-right with no empty gaps */}
  <div className="row">
    {/* Department first: it decides which job profiles the next field offers. */}
    <div className="col-lg-4 col-md-6 col-sm-12 mb-4">
      <WtFieldFormik
        required
        name="departmentId"
        label="Department"
        options={departmentOptions}
        onValueChange={handleDepartmentChange}
        searchable
      />
    </div>
    <div className="col-lg-4 col-md-6 col-sm-12 mb-4">
      {/* HierarchicalTaskSelect — tree drill-down; not a plain WtField yet. */}
      <HierarchicalTaskSelect
        isRequired
        formikField="designationId"
        inputLabel={
          <span style={{ fontSize: 13.5, fontWeight: 500 }}>Job Profile</span>
        }
        options={designationOptions}
        placeholder="Search and select a job profile…"
        onChange={handleDesignationChange}
        helpText={
          designationGuide.error
            ? <span style={{ fontSize: 12, color: 'var(--bs-danger)' }}>{designationGuide.error}</span>
            : <span style={{ fontSize: 12, color: 'var(--bs-gray-600)' }}>{designationGuide.hint}</span>
        }
      />
    </div>
    <div className="col-lg-4 col-md-6 col-sm-12 mb-4">
      <WtFieldFormik required name="teamId" label="Team" options={teamOptions} searchable />
    </div>
    <div className="col-lg-4 col-md-6 col-sm-12 mb-4">
      <WtFieldFormik name="shift" label="Shift" options={shiftOptions} />
    </div>
    <div className="col-lg-4 col-md-6 col-sm-12 mb-4">
      <WtFieldFormik name="employeeTypeConfigId" label="Employee Type" options={employeeTypeOptions} searchable />
    </div>
    <div className="col-lg-4 col-md-6 col-sm-12 mb-4">
      <WtFieldFormik name="workingMethodId" label="Working Location Type" options={workingMethodOptions} searchable />
    </div>
    <div className="col-lg-4 col-md-6 col-sm-12 mb-4">
      <WtFieldFormik name="experienceLevel" label="Experience Level" options={experienceLevelOptions} />
    </div>
    <div className="col-lg-4 col-md-6 col-sm-12 mb-4">
      <WtFieldFormik name="employeeLevelId" label="Employee's Level (For website)" options={employeeLevelOptions} searchable />
    </div>
  </div>
</>

    );
}

export default EmployeeInfo;
