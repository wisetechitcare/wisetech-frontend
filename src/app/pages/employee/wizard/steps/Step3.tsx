import AppSettings from "../forms/AppSettings";
import EmployeeInfo from "../forms/EmployeeInfo";
import HiringInfo from "../forms/HiringInfo";
import WorkContactInfo from "../forms/WorkContactInfo";
import WorkExperience from "../forms/WorkExperience";
import RejoinHistory from "../forms/RejoinHistory";
import FormHeading from "app/modules/common/utils/FormHeading";
// import Divider from "app/modules/common/utils/Divider";
import AddAnotherBtn from "app/modules/common/utils/AddAnotherBtn";
import "./Step2.css";
import DiscretionaryLeave from "../forms/DiscretionaryLeave";
import LeaveAllocationStep from "../forms/LeaveAllocationStep";

const newWorkExp = {
    companyName: "",
    jobTitle: "",
    fromDate: "",
    toDate: ""
}

const newRejoinEntry = {
    dateOfReJoining: "",
    dateOfReExit: "",
    reason: ""
}

function Step3({ formikProps, editMode }: any) {
    const { values } = formikProps;
    const addNewWorkExperience = () => {
        const newWorkExpInfo = [...formikProps.values.workExpInfo, newWorkExp];
        formikProps.setFieldValue('workExpInfo', newWorkExpInfo);
    }

    const addNewRejoinHistory = () => {
        const newRejoinHistoryInfo = [...formikProps.values.rejoinHistory, newRejoinEntry];
        formikProps.setFieldValue('rejoinHistory', newRejoinHistoryInfo);
    }

    const removeRejoinHistory = (indexToRemove: number) => {
        const updatedRejoinHistory = formikProps.values.rejoinHistory.filter((_: any, index: number) => index !== indexToRemove);
        formikProps.setFieldValue('rejoinHistory', updatedRejoinHistory);
    }

    return (
        <>
            <div className='w-100'>

                {/** Employee Information Starts */}
                <div style={{ marginBottom: '20px' }}>
                    <FormHeading headingText="Employee Information" padding="mb-3" variant="decorated" />
                    <div style={{ backgroundColor: '#ffffff', padding: '28px 25px', borderRadius: '12px' }} className="step2-section">
                        <EmployeeInfo />
                    </div>
                </div>
                {/* <Divider /> */}
                {/** Employee Information Ends */}

                {/** Work Contact Information Starts */}
                <div style={{ marginBottom: '20px' }}>
                    <FormHeading headingText="Contact Information" padding="mb-3" variant="decorated" />
                    <div style={{ backgroundColor: '#ffffff', padding: '28px 25px', borderRadius: '12px' }} className="step2-section">
                        <WorkContactInfo />
                    </div>
                </div>
                {/* <Divider /> */}
                {/** Work Contact Information Ends */}

                {/** Hiring Information Starts */}
                <div style={{ marginBottom: '20px' }}>
                    <FormHeading headingText="Hiring Information" padding="mb-3" variant="decorated" />
                    <div style={{ backgroundColor: '#ffffff', padding: '28px 25px', borderRadius: '12px' }} className="step2-section">
                        <HiringInfo formikProps={formikProps} editMode={editMode} />
                    </div>
                </div>
                {/* <Divider /> */}
                {/** Hiring Information Ends */}

                {/** Rejoin History Information Starts */}
                <div style={{ marginBottom: '20px' }}>
                    <FormHeading headingText="Re-joining History (optional)" padding="mb-3" variant="decorated" />
                    <div style={{ backgroundColor: '#ffffff', padding: '28px 25px', borderRadius: '12px' }} className="step2-section">
                        <div style={{ borderLeft: '1px solid #7A8597', paddingLeft: '25px', paddingTop: '12px', paddingBottom: '12px', display: 'flex', flexDirection: 'column', gap: '24px' }} className="step2-bordered-content">
                            {values.rejoinHistory.map((_: any, index: number) => (
                                <div key={`rejoinHistory-${index}`}>
                                    <RejoinHistory formikProps={formikProps} index={index} onRemove={removeRejoinHistory} />
                                </div>
                            ))}
                            <AddAnotherBtn onClick={addNewRejoinHistory} />
                        </div>
                    </div>
                </div>
                {/* <Divider /> */}
                {/** Rejoin History Information Ends */}

                {/** Work Experience Information Starts */}
                <div style={{ marginBottom: '20px' }}>
                    <FormHeading headingText="Work Experience Information" padding="mb-3" variant="decorated" />
                    <div style={{ backgroundColor: '#ffffff', padding: '28px 25px', borderRadius: '12px' }} className="step2-section">
                        <div style={{ borderLeft: '1px solid #7A8597', paddingLeft: '25px', paddingTop: '12px', paddingBottom: '12px', display: 'flex', flexDirection: 'column', gap: '24px' }} className="step2-bordered-content">
                            {values.workExpInfo.map((_: any, index: number) => (
                                <div key={`workInfo-${index}`}>
                                    <WorkExperience formikProps={formikProps} index={index} />
                                </div>
                            ))}
                            <AddAnotherBtn onClick={addNewWorkExperience} />
                        </div>
                    </div>
                </div>
                {/* <Divider /> */}
                {/** Work Experience Information Ends */}
                {/* Custom Leave Allocation Starts */}
                <div style={{ marginBottom: '20px' }}>
                    <FormHeading headingText="Custom Leave Allocation (Optional)" padding="mb-3" variant="decorated" />
                    <div style={{ backgroundColor: '#ffffff', padding: '28px 25px', borderRadius: '12px' }} className="step2-section">
                        <LeaveAllocationStep />
                    </div>
                </div>
                {/* Custom Leave Allocation Ends */}

                {/* DiscretionaryLeave Starts */}
                <div style={{ marginBottom: '20px' }}>
                    <FormHeading headingText="Discretionary Leave Settings" padding="mb-3" variant="decorated" />
                    <div style={{ backgroundColor: '#ffffff', padding: '28px 25px', borderRadius: '12px' }} className="step2-section">
                        <DiscretionaryLeave />
                    </div>
                </div>

                {/** App Settings Starts */}
                <div style={{ marginBottom: '20px' }}>
                    <FormHeading headingText="App Settings" padding="mb-3" variant="decorated" />
                    <div style={{ backgroundColor: '#ffffff', padding: '28px 25px', borderRadius: '12px' }} className="step2-section">
                        <AppSettings />
                    </div>
                </div>
                {/** App Settings Ends */}
            </div>
        </>
    );
}

export default Step3;