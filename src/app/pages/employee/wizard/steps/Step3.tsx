import { useEffect, useState } from "react";
import EmployeeInfo from "../forms/EmployeeInfo";
import HiringInfo from "../forms/HiringInfo";
import WorkContactInfo from "../forms/WorkContactInfo";
import WorkExperience from "../forms/WorkExperience";
import RejoinHistory from "../forms/RejoinHistory";
import AddAnotherBtn from "@app/modules/common/utils/AddAnotherBtn";
import WizardSectionLayout from "./WizardSectionLayout";
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

function Step3({ formikProps, editMode }: any) {
    const { values, setFieldValue } = formikProps;
    const workExpRows = Array.isArray(values.workExpInfo) ? values.workExpInfo : [];
    const rejoinRows = Array.isArray(values.rejoinHistory) ? values.rejoinHistory : [];
    const [activeSection, setActiveSection] = useState("employee_info");

    useEffect(() => {
        if (!formikProps.submitCount) return;
        const errors = formikProps.errors || {};
        if (errors.designationId || errors.departmentId || errors.branchId || errors.workingMethodId) {
            setActiveSection("employee_info");
            return;
        }
        if (errors.companyEmailId || errors.companyPhoneNumber) {
            setActiveSection("contact_info");
            return;
        }
        if (errors.sourceOfHireId || errors.dateOfJoining) {
            setActiveSection("hiring_info");
            return;
        }
        if (errors.rejoinHistory) {
            setActiveSection("rejoin_history");
            return;
        }
        if (errors.workExpInfo) {
            setActiveSection("work_experience");
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
        { id: "rejoin_history", title: "Rejoining History (optional)", icon: "calendar" },
        { id: "work_experience", title: "Work Experience Information", icon: "teacher" },
    ];

    const sectionContent: Record<string, any> = {
        employee_info: <EmployeeInfo />,
        contact_info: <WorkContactInfo />,
        hiring_info: <HiringInfo formikProps={formikProps} editMode={editMode} />,
        rejoin_history: (
            <div className="ob-repeating-section">
                {rejoinRows.map((_: any, index: number) => (
                    <div key={`rejoinHistory-${index}`}>
                        <RejoinHistory formikProps={formikProps} index={index} onRemove={removeRejoinHistory} />
                    </div>
                ))}
                <AddAnotherBtn onClick={addNewRejoinHistory} />
            </div>
        ),
        work_experience: (
            <div className="ob-repeating-section">
                {workExpRows.map((_: any, index: number) => (
                    <div key={`workInfo-${index}`}>
                        <WorkExperience
                            formikProps={formikProps}
                            index={index}
                            canRemove={index > 0 && !workExpRows[index]?.id}
                            onRemove={() => removeWorkExperience(index)}
                        />
                    </div>
                ))}
                <AddAnotherBtn onClick={addNewWorkExperience} />
            </div>
        ),
    };

    return (
        <WizardSectionLayout
            sections={sections}
            activeSection={activeSection}
            onSectionChange={setActiveSection}
        >
            {sectionContent[activeSection]}
        </WizardSectionLayout>
    );
}

export default Step3;
