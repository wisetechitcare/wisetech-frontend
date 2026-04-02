import React, { useEffect, useState } from 'react'
import * as Yup from 'yup'
import Flatpickr from "react-flatpickr";
import { isEmpty } from 'lodash';
import { Form, Formik } from 'formik'
import { fetchEmployeeProfileData, updateEmployee } from '@services/employee'
import { useSelector } from 'react-redux'
import { RootState } from '@redux/store'
import FileInput from '@app/modules/common/inputs/FileInput'
import TextInput from '@app/modules/common/inputs/TextInput'
import RadioInput, { RadioButton } from '@app/modules/common/inputs/RadioInput'
import SignatureInput from '@app/modules/common/inputs/SignatureInput';
import dayjs from 'dayjs';
import { uploadUserAsset } from '@services/uploader';
import { successConfirmation } from '@utils/modal';
import { getAvatar } from '@utils/avatar';
import { MAX_FILE_SIZE } from '@constants/statistics';
import Swal from 'sweetalert2';

const mealPreferencesRadioBtns: RadioButton[] = [
  {
    label: "Vegetarian",
    value: "0",
  },
  {
    label: "Non-Vegetarian",
    value: "1",
  },
  {
    label: "Vegan",
    value: "2",
  },
];

let initialState = {
  nickName: "",
  meal: "",
  startTime: "",
  endTime: "",
  digitalSignaturePath: "",
}

const flatPickrOpt = {
  enableTime: true,
  noCalendar: true,
  dateFormat: "H:i",
  time_24hr: true
}

const ProfileDetails: React.FC = () => {
  const employeeId = useSelector((state: RootState) => state.employee.currentEmployee.id);
  const userId = useSelector((state: RootState) => state.auth.currentUser.id);
  const [profileData, setProfileData] = useState();
  const profile = profileData as any;
  const [files, setFiles] = useState<{ [key: string]: File }>({});
  const [defaultState, setDefaultState] = useState(initialState);
  const [loading, setLoading] = useState(false);
  const [avatar, setAvatar] = useState('');

  const addFileToState = (documentId: string, file: File) => {
    const reader = new FileReader();
    if (documentId === 'userProfilePicture') {
      reader.onloadend = () => {
        setAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }

    setFiles((prevFiles: any) => ({
      ...prevFiles,
      [documentId]: file
    }));
  };

  const handleSubmit = async (values: any) => {
    const vegMealPreference = values.meal === "0" ? { vegMealPreference: true } : {};
    const nonVegMealPreference = values.meal === "1" ? { nonVegMealPreference: true } : {};
    const veganMealPreference = values.meal === "2" ? { veganMealPreference: true } : {};
    let workSchedule = undefined;
    if (values.startTime && values.endTime) workSchedule = `${values.startTime} - ${values.endTime}`;

    const documentPromise = Object.keys(files).map(async (docId) => {
      const fileData = files[docId];
      
      // Check file type
      if (!fileData.type.startsWith("image/")) {
        Swal.fire({
          icon: 'error',
          title: 'Invalid file type',
          text: `File "${fileData.name}" is not an image file.`,
        });
        return null;
      }

      // Check file size
      if (fileData.size > MAX_FILE_SIZE) {
        Swal.fire({
          icon: 'error',
          title: 'File size exceeds the limit',
          text: `File "${fileData.name}" exceeds the ${MAX_FILE_SIZE / 1024 / 1024} MB size limit.`,
        });
        return null; 
      }

      setLoading(true);
      const formData = new FormData();
      formData.append('file', fileData);

      try {
        const { data: { path } } = await uploadUserAsset(formData, userId, 'avatar', 'profile');
        return {
          documentId: docId,
          path: path,
          fileName: fileData.name,
        };
      } finally {
        setLoading(false);
      }
    });


    let docUploaded = undefined;
    if (documentPromise.length > 0) {
      docUploaded = await Promise.all(documentPromise);
    }

    delete values.meal;
    delete values.startTime;
    delete values.endTime;

    const avatar = docUploaded?.filter((file: any) => (file.documentId == "userProfilePicture"));
    const digitalSignaturePath = docUploaded?.filter((file: any) => (file.documentId == "digitalSignature"));

    const payload = {
      ...(values.nickName && { nickName: values.nickName }),
      ...(avatar?.[0]?.path && { avatar: avatar[0].path }),
      ...(digitalSignaturePath?.[0]?.path && { digitalSignaturePath: digitalSignaturePath[0].path }),
      ...(workSchedule && { workSchedule }),
      ...vegMealPreference,
      ...nonVegMealPreference,
      ...veganMealPreference
    }

    try {
      setLoading(true)
      if (!isEmpty(payload)) {
        await updateEmployee(employeeId, payload);
        successConfirmation("Profile data updated successfully!");
        location.reload();
      }
    } catch (error) {
      console.log("error",error);
    } finally {
      setLoading(false)
    }

    }

  useEffect(() => {
    if (!employeeId) return;

    async function fetchProfileData() {
      const { data: { employeeProfile } } = await fetchEmployeeProfileData(employeeId)
      setProfileData(employeeProfile)
      setAvatar(getAvatar(employeeProfile.avatar, employeeProfile.gender));
    }

    fetchProfileData();
  }, [employeeId]);

  useEffect(() => {
    if (!profile) return;
    const { nickName, workSchedule, digitalSignaturePath, vegMealPreference, nonVegMealPreference, veganMealPreference } = profile;
    const splitWorkSchedule = workSchedule?.split('-');
    setDefaultState((prevState: any) => {
      return {
        ...prevState,
        nickName,
        startTime: (Array.isArray(splitWorkSchedule) && splitWorkSchedule?.length>=1) ? splitWorkSchedule[0]?.trim() : "",
        endTime: (Array.isArray(splitWorkSchedule) && splitWorkSchedule?.length>=2) ? splitWorkSchedule[1]?.trim(): "",
        meal: vegMealPreference ? "0" : nonVegMealPreference ? "1" : veganMealPreference ? "2" : "",
        digitalSignaturePath,
      }
    });
  }, [profile]);


  return (
    <div className='card mb-5 mb-xl-10'>
      <div
        className='card-header border-0 cursor-pointer'
        role='button'
        data-bs-toggle='collapse'
        data-bs-target='#kt_account_profile_details'
        aria-expanded='true'
        aria-controls='kt_account_profile_details'
      >
        <div className='card-title m-0'>
          <h3 className='fw-bolder m-0'>Profile Details</h3>
        </div>
      </div>

      <div id='kt_account_profile_details' className='collapse show'>
        <Formik onSubmit={handleSubmit} initialValues={defaultState} className='form' enableReinitialize={true}>
          {(formikProps) => {
            return (
              <Form placeholder={undefined}>
                <div className='card-body border-top p-9'>
                  <div className='row mb-6'>
                    <label className='col-lg-4 col-form-label fw-bold fs-6'>Avatar</label>
                    <div className='col-lg-8'>
                      <FileInput placeholder='Upload your profile picture'
                        documentId='userProfilePicture'
                        hidden={true}
                        path={avatar}
                        setFile={addFileToState} />
                    </div>
                  </div>

                  <div className='row mb-6'>
                    <label className='col-lg-4 col-form-label fw-bold fs-6'>Nick Name</label>
                    <div className='col-lg-8'>
                      <TextInput isRequired={false} formikField='nickName' placeholder='Nick Name' />
                    </div>
                  </div>

                  <div className="row mb-6">
                    <label className='col-lg-4 col-form-label fw-bold fs-6'>Meal Preference</label>
                    <div className='col-lg-8'>
                      <RadioInput isRequired={false} formikField='meal' radioBtns={mealPreferencesRadioBtns} />
                    </div>
                  </div>

                  <div className="row mb-6">
                    <label className='col-lg-4 col-form-label fw-bold fs-6'>Work Schedule</label>
                    <div className='col-lg-4'>
                      <Flatpickr
                        value={formikProps.values.startTime}
                        className='form-control form-control-solid'
                        placeholder="Enter start time"
                        onChange={(selectedDates: Date[]) => {
                          formikProps.setFieldValue('startTime', dayjs(selectedDates[0]).format('HH:mm'), true);
                          formikProps.setFieldTouched('startTime', false);
                        }}
                        options={{ ...flatPickrOpt }}
                      />
                    </div>
                    <div className='col-lg-4'>
                      <Flatpickr
                        value={formikProps.values.endTime}
                        className='form-control form-control-solid'
                        placeholder="Enter end time"
                        onChange={(selectedDates: Date[]) => {
                          formikProps.setFieldValue('endTime', dayjs(selectedDates[0]).format('HH:mm'), true);
                          formikProps.setFieldTouched('endTime', false);
                        }}
                        options={{ ...flatPickrOpt }}
                      />
                    </div>
                  </div>

                  <div className="row mb-6">
                    <label className='col-lg-4 col-form-label fw-bold fs-6'>Digital Signature</label>
                    <div className='col-lg-8'>
                      <SignatureInput setFile={addFileToState} imageUrl={defaultState.digitalSignaturePath} />
                    </div>
                  </div>

                  <div className='card-footer d-flex justify-content-end py-6 px-9'>
                    <button type='submit' className='btn btn-primary' disabled={loading}>
                      {!loading && 'Save Changes'}
                      {loading && (
                        <span className='indicator-progress' style={{ display: 'block' }}>
                          Please wait...{' '}
                          <span className='spinner-border spinner-border-sm align-middle ms-2'></span>
                        </span>
                      )}
                    </button>
                  </div>
                </div>

              </Form>
            )
          }}
        </Formik>
      </div>
    </div>
  )
}

export { ProfileDetails }
