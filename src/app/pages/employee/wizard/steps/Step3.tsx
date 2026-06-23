import { useEffect } from "react";
import EmployeeInfo from "../forms/EmployeeInfo";
import HiringInfo from "../forms/HiringInfo";
import WorkContactInfo from "../forms/WorkContactInfo";
import WorkExperience from "../forms/WorkExperience";
import AddAnotherBtn from "@app/modules/common/utils/AddAnotherBtn";
import WizardSectionLayout from "./WizardSectionLayout";
// Leave Settings section removed — no longer needed
// import DiscretionaryLeave from "../forms/DiscretionaryLeave";
// import LeaveAllocationStep from "../forms/LeaveAllocationStep";
import "./Step2.css";

const createNewWorkExp = () => ({
    companyName: "",
    jobTitle: "",
    fromDate: "",
    toDate: "",
});

const newRejoinEntry = {
    dateOfReJoining: "",
    dateOfReExit: "",
    reason: "",
};

function Step3({ formikProps, editMode, sidebarProfile, activeSection, onSectionChange }: any) {
    const { values, setFieldValue } = formikProps;
    const workExpRows = Array.isArray(values.workExpInfo) ? values.workExpInfo : [];
    const rejoinRows = Array.isArray(values.rejoinHistory) ? values.rejoinHistory : [];

    useEffect(() => {
        if (!formikProps.submitCount) return;
        const errors = formikProps.errors || {};
        if (errors.designationId || errors.departmentId || errors.branchId || errors.workingMethodId) {
            onSectionChange("employee_info");
            return;
        }
        if (errors.companyEmailId || errors.companyPhoneNumber) {
            onSectionChange("contact_info");
            return;
        }
        if (errors.sourceOfHireId || errors.dateOfJoining) {
            onSectionChange("hiring_info");
            return;
        }
        if (errors.rejoinHistory) {
            onSectionChange("hiring_info");
            return;
        }
        if (errors.workExpInfo) {
            onSectionChange("work_experience");
            return;
        }
    }, [formikProps.submitCount, formikProps.errors]);

    const addNewWorkExperience = () => {
        setFieldValue("workExpInfo", [
            ...workExpRows,
            createNewWorkExp(),
        ]);
    };

    const removeWorkExperience = (indexToRemove: number) => {
        if (workExpRows.length <= 1) return;
        setFieldValue(
            "workExpInfo",
            workExpRows.filter((_: any, index: number) => index !== indexToRemove),
        );
    };

    const addNewRejoinHistory = () => {
        setFieldValue("rejoinHistory", [
            ...rejoinRows,
            newRejoinEntry,
        ]);
    };

    const removeRejoinHistory = (indexToRemove: number) => {
        setFieldValue(
            "rejoinHistory",
            rejoinRows.filter(
                (_: any, index: number) => index !== indexToRemove,
            ),
        );
    };

    const sections = [
        { id: "employee_info", title: "Employee Information", icon: "profile-user" },
        { id: "contact_info", title: "Work Contact Details", icon: "phone" },
        { id: "hiring_info", title: "Hiring Information", icon: "briefcase" },
        { id: "work_experience", title: "Work Experience Information", icon: "teacher" },
        // Leave Settings section removed — no longer needed
        // { id: "leave_settings", title: "Leave Settings", icon: "calendar-add" },
    ];

    const sectionContent: Record<string, any> = {
        employee_info: <EmployeeInfo />,
        contact_info: <WorkContactInfo formikProps={formikProps} />,
        hiring_info: (
            <HiringInfo
                formikProps={formikProps}
                editMode={editMode}
                rejoinRows={rejoinRows}
                onAddRejoin={addNewRejoinHistory}
                onRemoveRejoin={removeRejoinHistory}
            />
        ),
        work_experience: (
            <div className="ob-repeating-section">
                {workExpRows.map((_: any, index: number) => (
                    <div key={`workInfo-${index}`}>
                        <WorkExperience
                            formikProps={formikProps}
                            index={index}
                            canRemove={index > 0}
                            onRemove={() => removeWorkExperience(index)}
                        />
                    </div>
                ))}
                <AddAnotherBtn onClick={addNewWorkExperience} />
            </div>
        ),
        // Leave Settings section removed — no longer needed
        // leave_settings: (
        //     <div>
        //         <LeaveAllocationStep />
        //         <DiscretionaryLeave />
        //     </div>
        // ),
    };

    return (
        <WizardSectionLayout
            sections={sections}
            activeSection={activeSection}
            onSectionChange={onSectionChange}
            sidebarProfile={sidebarProfile}
        >
            {sectionContent[activeSection]}
        </WizardSectionLayout>
    );
}

export default Step3;
