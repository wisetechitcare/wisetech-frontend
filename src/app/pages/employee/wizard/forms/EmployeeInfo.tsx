import { useEffect, useState } from "react";
import { fetchBranches, fetchDepartments, fetchDesignations, fetchWorkingMethods } from "@services/options";
import { getAllEmployeeLevels } from "@services/employee";
import { getAllTeams } from "@services/projects";
import { fetchAllOrganizationConfigurations, fetchAllEmployeeConfigurations } from "@services/configurations";
import DropDownInput from "@app/modules/common/inputs/DropdownInput";

function EmployeeInfo() {
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
        async function getAllBranches() {
            const { data: { branches } } = await fetchBranches();
            const options = branches.map((branch: any) => ({ value: branch.id, label: branch.name }));
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

    return (
        <>
  {/* Row 1: Required fields — Job Profile*, Department*, Branch* */}
  <div className="row mb-4">
    <div className="col-lg-4 col-md-6 col-sm-12 mb-3 mb-lg-0">
      <DropDownInput
        isRequired={true}
        formikField="designationId"
        inputLabel="Job Profile"
        options={designationOptions}
      />
    </div>

    <div className="col-lg-4 col-md-6 col-sm-12 mb-3 mb-lg-0">
      <DropDownInput
        isRequired={true}
        formikField="departmentId"
        inputLabel="Department"
        options={departmentOpions}
      />
    </div>

    <div className="col-lg-4 col-md-6 col-sm-12">
      <DropDownInput
        isRequired={true}
        formikField="branchId"
        inputLabel="Choose Branch"
        options={branchOptions}
      />
    </div>
  </div>

  {/* Row 2: Team, Room/Block, Shift — grouped so all three sit in adjacent columns */}
  <div className="row mb-4">
    <div className="col-lg-4 col-md-6 col-sm-12 mb-3 mb-lg-0">
      <DropDownInput
        isRequired={false}
        formikField="teamId"
        inputLabel="Team"
        options={teamOptions}
      />
    </div>

    <div className="col-lg-4 col-md-6 col-sm-12 mb-3 mb-lg-0">
      <DropDownInput
        isRequired={false}
        formikField="roomOrBlock"
        inputLabel="Room/Block"
        options={roomBlockOptions}
      />
    </div>

    <div className="col-lg-4 col-md-6 col-sm-12">
      <DropDownInput
        isRequired={false}
        formikField="shift"
        inputLabel="Shift"
        options={shiftOptions}
      />
    </div>
  </div>

  {/* Row 3: Employee Type, Working Location Type, Experience Level */}
  <div className="row mb-4">
    <div className="col-lg-4 col-md-6 col-sm-12 mb-3 mb-lg-0">
      <DropDownInput
        isRequired={false}
        formikField="employeeTypeConfigId"
        inputLabel="Employee Type"
        options={employeeTypeOptions}
      />
    </div>

    <div className="col-lg-4 col-md-6 col-sm-12 mb-3 mb-lg-0">
      <DropDownInput
        isRequired={false}
        formikField="workingMethodId"
        inputLabel="Working Location Type"
        options={workingMethodOptions}
      />
    </div>

    <div className="col-lg-4 col-md-6 col-sm-12">
      <DropDownInput
        isRequired={false}
        formikField="experienceLevel"
        inputLabel="Experience Level"
        options={experienceLevelOptions}
      />
    </div>
  </div>

  {/* Row 4: Employee's Level (For website) */}
  <div className="row">
    <div className="col-lg-4 col-md-6 col-sm-12">
      <DropDownInput
        isRequired={false}
        formikField="employeeLevelId"
        inputLabel="Employee's Level (For website)"
        options={employeeLevelOptions}
      />
    </div>
  </div>
</>

    );
}

export default EmployeeInfo;
