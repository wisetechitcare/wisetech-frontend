import { useEffect, useMemo, useState } from "react";
import { useFormikContext } from "formik";
import { fetchBranches, fetchDepartments, fetchDesignations, fetchWorkingMethods } from "@services/options";
import { fetchOrganizationTree } from "@services/company";
import { getAllEmployeeLevels } from "@services/employee";
import { getAllTeams } from "@services/projects";
import { fetchAllOrganizationConfigurations, fetchAllEmployeeConfigurations } from "@services/configurations";
import DropDownInput from "@app/modules/common/inputs/DropdownInput";
import { IOrgNode } from "@models/company";

function EmployeeInfo() {
    const { values, setFieldValue, setValues } = useFormikContext<any>();
    const [orgTree, setOrgTree] = useState<IOrgNode[]>([]);
    const [allBranches, setAllBranches] = useState<any[]>([]);
    const [designationOptions, setDesignationOptions] = useState([]);
    const [departmentOpions, setDepartmentOptions] = useState([]);
    const [branchOptions, setBrancheOptions] = useState([]);
const [employeeTypeOptions, setEmployeeTypeOptions] = useState([]);
    const [workingMethodOptions, setWorkingMethodOptions] = useState([]);
    const [teamOptions, setTeamOptions] = useState([]);
    const [employeeLevelOptions, setEmployeeLevelOptions] = useState([]);
    const [roomBlockOptions, setRoomBlockOptions] = useState([]);
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

        async function getAllDesignations() {
            const { data: { designations } } = await fetchDesignations();
            const options = designations.map((designation: any) => ({ value: designation.id, label: designation.role }));
            setDesignationOptions(options);
        }

        async function getAllDepartments() {
            const { data: { departments } } = await fetchDepartments();
            const options = departments.map((department: any) => ({ value: department.id, label: department.name }));
            setDepartmentOptions(options);
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

        async function getRoomBlocks() {
            try {
                const response = await fetchAllOrganizationConfigurations("ROOM_BLOCK");
                if (response?.data?.organizationConfigurations) {
                    const options = response.data.organizationConfigurations.map((config: any) => ({
                        value: config.id,
                        label: config.name
                    }));
                    setRoomBlockOptions(options);
                }
            } catch (error) {
                console.error("Error fetching room blocks:", error);
            }
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
        getAllDesignations();
        getAllDepartments();
        getAllWorkingMethods();
        getAllEmployeeTypes();
        getTeams();
        getEmployeeLevels();
        getRoomBlocks();
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
    const handleOrgChange = (opt: any) => {
        setValues({ ...values, organizationId: opt?.value || '', subOrganizationId: '', branchId: '' });
    };
    const handleSubOrgChange = (opt: any) => {
        setValues({ ...values, subOrganizationId: opt?.value || '', branchId: '' });
    };

    return (
        <>
  {/* Row 1: Hierarchy — Organization*, Sub-Organization (if any), Choose Branch* */}
  <div className="row mb-4">
    <div className={`${hasSubOrgs ? 'col-lg-4' : 'col-lg-6'} col-md-6 col-sm-12 mb-3 mb-lg-0`}>
      <DropDownInput
        isRequired={true}
        formikField="organizationId"
        inputLabel="Organization"
        options={orgOptions}
        onChange={handleOrgChange}
      />
    </div>

    {hasSubOrgs && (
      <div className="col-lg-4 col-md-6 col-sm-12 mb-3 mb-lg-0">
        <DropDownInput
          isRequired={false}
          formikField="subOrganizationId"
          inputLabel="Sub-Organization"
          options={subOrgOptions}
          onChange={handleSubOrgChange}
        />
      </div>
    )}

    <div className={`${hasSubOrgs ? 'col-lg-4' : 'col-lg-6'} col-md-6 col-sm-12`}>
      <DropDownInput
        isRequired={true}
        formikField="branchId"
        inputLabel="Choose Branch"
        options={scopedBranchOptions}
        disabled={!effectiveOrgId}
        placeholder={!effectiveOrgId ? 'Select an organization first' : undefined}
      />
    </div>
  </div>

  {/* Remaining fields: flowing 3-column grid — fills left-to-right with no empty gaps */}
  <div className="row">
    <div className="col-lg-4 col-md-6 col-sm-12 mb-4">
      <DropDownInput isRequired={true} formikField="designationId" inputLabel="Job Profile" options={designationOptions} />
    </div>
    <div className="col-lg-4 col-md-6 col-sm-12 mb-4">
      <DropDownInput isRequired={true} formikField="departmentId" inputLabel="Department" options={departmentOpions} />
    </div>
    <div className="col-lg-4 col-md-6 col-sm-12 mb-4">
      <DropDownInput isRequired={true} formikField="teamId" inputLabel="Team" options={teamOptions} />
    </div>
    <div className="col-lg-4 col-md-6 col-sm-12 mb-4">
      <DropDownInput isRequired={false} formikField="roomOrBlock" inputLabel="Room/Block" options={roomBlockOptions} />
    </div>
    <div className="col-lg-4 col-md-6 col-sm-12 mb-4">
      <DropDownInput isRequired={false} formikField="shift" inputLabel="Shift" options={shiftOptions} />
    </div>
    <div className="col-lg-4 col-md-6 col-sm-12 mb-4">
      <DropDownInput isRequired={false} formikField="employeeTypeConfigId" inputLabel="Employee Type" options={employeeTypeOptions} />
    </div>
    <div className="col-lg-4 col-md-6 col-sm-12 mb-4">
      <DropDownInput isRequired={false} formikField="workingMethodId" inputLabel="Working Location Type" options={workingMethodOptions} />
    </div>
    <div className="col-lg-4 col-md-6 col-sm-12 mb-4">
      <DropDownInput isRequired={false} formikField="experienceLevel" inputLabel="Experience Level" options={experienceLevelOptions} />
    </div>
    <div className="col-lg-4 col-md-6 col-sm-12 mb-4">
      <DropDownInput isRequired={false} formikField="employeeLevelId" inputLabel="Employee's Level (For website)" options={employeeLevelOptions} />
    </div>
  </div>
</>

    );
}

export default EmployeeInfo;
