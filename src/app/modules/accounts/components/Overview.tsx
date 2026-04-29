import { useEffect, useState } from 'react'
import dayjs from 'dayjs';
import { useSelector } from 'react-redux';
import { RootState } from '@redux/store';
import { fetchEmployeeProfileData } from '@services/employee';
import { calculateDuration } from '@utils/date';
import { fetchCountryName } from '@services/options';

interface Fields {
  fieldName: string;
  fieldValue: string;
}

export function Overview() {
  const employeeId = useSelector((state: RootState) => state.employee.currentEmployee.id);
  const [profileData, setProfileData] = useState();
  const profile = profileData as any;

  const [countryName, setCountryName] = useState('');

  useEffect(() => {

    async function fetchProfileData() {
      const { data: { employeeProfile } } = await fetchEmployeeProfileData(employeeId)
      setProfileData(employeeProfile);

      const countryName = await fetchCountryName(employeeProfile.EmployeeAddressDetails[0].permanentCountry);
      setCountryName(countryName.name);
    }

    fetchProfileData();
  }, [employeeId]);

  if (!profile) return;


  const { users } = profile;
  const { days, months, years } = calculateDuration(profile.dateOfJoining);
  const fields: Fields[] = [
    {
      fieldName: "Full Name",
      fieldValue: `${users?.firstName || '-'} ${users?.lastName || '-'}`,
    },
    {
      fieldName: "Date of Birth",
      fieldValue: (users?.dateOfBirth ? dayjs(users.dateOfBirth).format('YYYY-MM-DD') : '-'),
    },
    {
      fieldName: "Contact Number",
      fieldValue: (profile?.companyPhoneExtension && profile?.companyPhoneNumber) ? `${profile?.companyPhoneExtension} - ${profile?.companyPhoneNumber}` : '-',
    },
    {
      fieldName: "Employee Code",
      fieldValue: profile.employeeCode || '-',
    },
    {
      fieldName: "Company",
      fieldValue: profile?.companyOverview?.name || '',
    },
    {
      fieldName: "Department",
      fieldValue: profile?.departments?.name || '-',
    },
    {
      fieldName: "Branch",
      fieldValue: profile?.branches?.name || '-',
    },
    {
      fieldName: "Date Of Joining",
      fieldValue: (profile?.dateOfJoining ? `${dayjs(profile?.dateOfJoining).format('YYYY-MM-DD')} (${years} years, ${months} months, ${days} days)` : '-'),
    },
    {
      fieldName: "Working Methods",
      fieldValue: profile?.companyworkingMethod?.type || '-',
    },
    {
      fieldName: "Country",
      fieldValue: countryName || '-',
    },
  ]

  return (
    <>
      <div className='card mb-5 mb-xl-10' id='kt_profile_details_view'>
        <div className='card-header cursor-pointer'>
          <div className='card-title m-0'>
            <h3 className='fw-bolder m-0'>Profile Details</h3>
          </div>
        </div>

        <div className='card-body p-9'>
          {fields.map((field: Fields) => (
            <>
              <div className='row mb-7'>
                <label className='col-lg-4 fw-bold'>{field.fieldName}</label>

                <div className='col-lg-8'>
                  <span className='fw-bolder fs-6 text-gray-900'>{field.fieldValue}</span>
                </div>
              </div>
            </>
          ))}
        </div>
      </div>
    </>
  )
}
