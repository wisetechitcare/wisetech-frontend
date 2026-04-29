import AddAnotherBtn from "app/modules/common/utils/AddAnotherBtn";
import FormHeading from "app/modules/common/utils/FormHeading";
import Divider from "app/modules/common/utils/Divider";
import AddressInfo from "../forms/AddressInfo";
import BasicInfo from "../forms/BasicInfo";
import BankInfo from "../forms/BankInfo";
import EducationalInfo from "../forms/EducationInfo";
import EmergencyDetails from "../forms/EmergencyDetails";
import FamilyInfo from "../forms/FamilyInfo";
import PersonalContactInfo from "../forms/PersonalContactInfo";
import ProfilePicture from "../forms/ProfilePicture";
import MealPreferences from "../forms/MealPreference";
import { getAvatar } from "@utils/avatar";
import "./Step2.css";
import AppSettings from "../forms/AppSettings";

const newEducation = {
  instituteName: "",
  degree: "",
  specialization: "",
  fromDate: "",
  toDate: "",
  educationDocument: "",
};

const newFamilyMember = {
  name: "",
  relationship: "",
  mobileNumber: "",
};

function Step2({ formikProps, setFile }: any) {
  const { values: { educationalInfo, familyInfo }, setFieldValue } = formikProps;

  const addNewEducationalDetails = () => {
    const newEducationalInfo = [...educationalInfo, newEducation];
    setFieldValue('educationalInfo', newEducationalInfo);
  }

  const addNewFamilyInfo = () => {
    const newFamilyInfo = [...familyInfo, newFamilyMember];
    setFieldValue('familyInfo', newFamilyInfo);
  }

  return (
    <>
      <div className='w-100'>
        {/* <h2 className="employee__form_wizard__step_title">Personal Details</h2><br /> */}
        {/** Basic Information Starts */}
        <FormHeading headingText="Add Profile Picture" padding="py-2" variant="decorated" />
        <ProfilePicture setFile={setFile} avatar={formikProps.values?.avatar} defaultImageUrl={getAvatar(formikProps.values?.avatar, formikProps.values?.gender)} />

        <div style={{ marginTop: '16px', marginBottom: '20px' }}>
          <FormHeading headingText="Basic Information" padding="mb-3" variant="decorated" />
          <div style={{ backgroundColor: '#ffffff', padding: '28px 25px', borderRadius: '12px' }} className="step2-section">
            <BasicInfo formikProps={formikProps} />
          </div>
        </div>
        {/* <Divider /> */}
        {/** Basic Information Ends */}

        {/** Contact Information Starts */}
        <div style={{ marginBottom: '20px' }}>
          <FormHeading headingText="Contact Information" padding="mb-3" variant="decorated" />
          <div style={{ backgroundColor: '#ffffff', padding: '28px 25px', borderRadius: '12px' }} className="step2-section">
            <PersonalContactInfo formikProps={formikProps} />
          </div>
        </div>
        {/* <Divider /> */}
        {/** Contact Information Ends */}

        {/** Education Information Starts */}
        <div style={{ marginBottom: '20px' }}>
          <FormHeading headingText="Education Information" padding="mb-3" variant="decorated" />
          <div style={{ backgroundColor: '#ffffff', padding: '28px 25px', borderRadius: '12px' }} className="step2-section">
            <div style={{ borderLeft: '1px solid #7A8597', paddingLeft: '25px', paddingTop: '12px', paddingBottom: '12px', display: 'flex', flexDirection: 'column', gap: '24px' }} className="step2-bordered-content">
              {educationalInfo.map((_: any, index: number) => (
                <div key={`educationalInfo-${index}`}>
                  <EducationalInfo formikProps={formikProps} userId={formikProps.values?.userId} index={index} setFile={setFile} />
                </div>
              ))}
              <AddAnotherBtn onClick={addNewEducationalDetails} />
            </div>
          </div>
        </div>
        {/* <Divider /> */}

        {/** Education Information Ends */}

        {/** Family Information Starts */}
        <div style={{ marginBottom: '20px' }}>
          <FormHeading headingText="Family Details" padding="mb-3" variant="decorated" />
          <div style={{ backgroundColor: '#ffffff', padding: '28px 25px', borderRadius: '12px' }} className="step2-section">
            <div style={{ borderLeft: '1px solid #7A8597', paddingLeft: '25px', paddingTop: '12px', paddingBottom: '12px', display: 'flex', flexDirection: 'column', gap: '24px' }} className="step2-bordered-content">
              {familyInfo.map((_: any, index: number) => (
                <div key={`familyInfo-${index}`}>
                  <FamilyInfo formikProps={formikProps} index={index} />
                </div>
              ))}
              <AddAnotherBtn onClick={addNewFamilyInfo} />
            </div>
          </div>
        </div>
        {/* <Divider /> */}
        {/** Family Information Ends */}

        {/** Emergency Details Starts */}
        <div style={{ marginBottom: '20px' }}>
          <FormHeading headingText="Emergency Details" padding="mb-3" variant="decorated" />
          <div style={{ backgroundColor: '#ffffff', padding: '28px 25px', borderRadius: '12px' }} className="step2-section">
            <EmergencyDetails formikProps={formikProps} />
          </div>
        </div>
        {/* <Divider /> */}
        {/** Emergency Details Ends */}

        {/** Bank Details Starts */}
        <div style={{ marginBottom: '20px' }}>
          <FormHeading headingText="Bank Details" padding="mb-3" variant="decorated" />
          <div style={{ backgroundColor: '#ffffff', padding: '28px 25px', borderRadius: '12px' }} className="step2-section">
            <BankInfo formikProps={formikProps} userId={formikProps.values?.userId} />
          </div>
        </div>
        {/* <Divider /> */}
        {/** Bank Details Ends */}

        {/** Address Details Starts */}
        <div style={{ marginBottom: '20px' }}>
          <FormHeading headingText="Address Details" padding="mb-3" variant="decorated" />
          <div style={{ backgroundColor: '#ffffff', padding: '28px 25px', borderRadius: '12px' }} className="step2-section">
            <div style={{ borderLeft: '1px solid #7A8597', paddingLeft: '25px', paddingTop: '12px', paddingBottom: '12px' }} className="step2-bordered-content">
              <AddressInfo formikProps={formikProps} />
            </div>
          </div>
        </div>
        {/** Address Details Ends */}

        {/** Meal Preferences Starts */}
        <div style={{ marginBottom: '20px' }}>
          <FormHeading headingText="Additional Details" padding="mb-3" variant="decorated" />
          <div style={{ backgroundColor: '#ffffff', padding: '28px 25px', borderRadius: '12px' }} className="step2-section">
            <MealPreferences formikProps={formikProps} />
          </div>
        </div>
        {/** Meal Preferences Ends */}

      
      </div>
    </>
  );
}

export default Step2;