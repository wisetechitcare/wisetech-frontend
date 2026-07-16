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
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    // Redux hydrates the employee slice after mount — wait for the id; the
    // effect re-runs when it arrives.
    if (!employeeId) return;

    let cancelled = false;
    async function fetchProfileData() {
      setLoadError(false);
      try {
        const { data: { employeeProfile } } = await fetchEmployeeProfileData(employeeId)
        if (cancelled) return;
        setProfileData(employeeProfile);

        // Address details are optional — new/incomplete employee records have
        // none, and reading [0] blindly crashed the whole page for them.
        const permanentCountry = employeeProfile?.EmployeeAddressDetails?.[0]?.permanentCountry;
        if (permanentCountry) {
          const country = await fetchCountryName(permanentCountry);
          if (!cancelled) setCountryName(country?.name || '');
        }
      } catch (err) {
        console.error('Failed to load profile data', err);
        if (!cancelled) setLoadError(true);
      }
    }

    fetchProfileData();
    return () => { cancelled = true; };
  }, [employeeId]);

  // Never render a silent blank page — show progress or a clear error.
  if (!profile) {
    return (
      <div className='card mb-5 mb-xl-10'>
        <div className='card-body p-9 text-center'>
          {loadError ? (
            <span className='text-muted'>Unable to load profile details. Please refresh the page or try again later.</span>
          ) : (
            <>
              <span className='spinner-border spinner-border-sm align-middle me-2' />
              <span className='text-muted'>Loading profile...</span>
            </>
          )}
        </div>
      </div>
    );
  }


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
