import { errorConfirmation, successConfirmation } from '@utils/modal';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import React, { useEffect, useState } from 'react'
import { ICustomColorCode } from '@redux/slices/customColors';
import { useDispatch, useSelector } from 'react-redux';
import { setCustomColors } from '@redux/slices/customColors';
import { updateColorsById } from '@services/options';
import { fetchColorAndStoreInSlice } from '@utils/file';

let initialValues = {
  id: "",
  attendanceCalendar: {
    todayColor: "#3498DB",
    presentColor: "#2ECC71",
    absentColor: "#E74C3C",
    onLeaveColor: "#FFC300",
    weekendColor: "#9B59B6",
    workingWeekendColor: "#E67E22",
    markedPresentViaRequestRaisedColor: "#1ABC9C",
  },
  attendanceOverview: {
    presentColor: "#2ECC71",
    onLeaveColor: "#FFC300",
    absentColor: "#E74C3C",
    holidayColor: "#9B59B6",
    extraDayColor: "#E67E22",
  },
  workingPattern: {
    totalWorkingDaysColor: '#3498DB',
    checkInColor:'#2ECC71',
    checkoutColor:'#E67E22',
    earlyCheckinColor: '#1ABC9C',
    lateCheckinColor: '#E74C3C',
    earlyCheckoutColor: '#F39C12',
    lateCheckoutColor: '#C0392B',
    missingCheckoutColor: '#95A5A6',
  },
  workingLocation: {
    officeColor: '#3498DB',
    onSiteColor: '#E67E22',
    remoteColor: '#9B59B6',
  },
  momentsThatMatter:{
    birthdaysColor: '#E91E63',
    anniversariesColor: '#9C27B0',
  },
  leaveTypes: {
    sickLeaveColor: '#E74C3C',
    casualLeaveColor: '#3498DB',
    annualLeaveColor: '#2ECC71',
    maternalLeaveColor: '#9B59B6',
    floaterLeaveColor: '#F39C12',
    unpaidLeaveColor: '#95A5A6',
  }
};

const colorCodeSchema = Yup.object().shape({
  attendanceCalendar: Yup.object().shape({
    todayColor: Yup.string(),
    presentColor: Yup.string(),
    absentColor: Yup.string(),
    onLeaveColor: Yup.string(),
    weekendColor: Yup.string(),
    workingWeekendColor: Yup.string(),
    markedPresentViaRequestRaisedColor: Yup.string(),
  }),
  attendanceOverview: Yup.object().shape({
    presentColor: Yup.string(),
    onLeaveColor: Yup.string(),
    absentColor: Yup.string(),
    holidayColor: Yup.string(),
    extraDayColor: Yup.string(),
  }),
  workingPattern: Yup.object().shape({
    totalWorkingDaysColor: Yup.string(),
    checkInColor: Yup.string(),
    checkoutColor: Yup.string(),
    earlyCheckinColor: Yup.string(),
    lateCheckinColor: Yup.string(),
    earlyCheckoutColor: Yup.string(),
    lateCheckoutColor: Yup.string(),
    missingCheckoutColor: Yup.string(),
  }),
  workingLocation: Yup.object().shape({
    officeColor: Yup.string(),
    onSiteColor: Yup.string(),
    remoteColor: Yup.string(),
  }),
  momentsThatMatter: Yup.object().shape({
    birthdaysColor: Yup.string(),
    anniversariesColor: Yup.string(),
  }),
  leaveTypes: Yup.object().shape({
    sickLeaveColor: Yup.string(),
    casualLeaveColor: Yup.string(),
    annualLeaveColor: Yup.string(),
    maternalLeaveColor: Yup.string(),
    floaterLeaveColor: Yup.string(),
    unpaidLeaveColor: Yup.string(),
  })
})

const ColorField = ({ label, fieldName, formik }: any) => {
  const value = formik.getFieldProps(fieldName).value || '#000000';
  return (
    <div className='col-md-6 col-lg-4 mb-4'>
      <label className='form-label fw-semibold fs-6 mb-2'>{label}</label>
      <input
        type='color'
        className='form-control form-control-lg form-control-solid'
        style={{ height: '50px', cursor: 'pointer' }}
        {...formik.getFieldProps(fieldName)}
        value={value}
      />
    </div>
  );
};

interface AppearanceProps {
  showAppearanceModal?: (visible: boolean) => void;
}

function Appearance({ showAppearanceModal }: AppearanceProps) {
  const [loading, setLoading] = useState(false);
  const [openSections, setOpenSections] = useState<string[]>(['calendar']);
  const dispatch = useDispatch();
  const defaultColor = '#000000';
  const customColors = useSelector((state: any) => state.customColors);

  const toggleSection = (section: string) => {
    setOpenSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  function setDefaultValues(obj: any) {
    for (const key in obj) {
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        setDefaultValues(obj[key]);
      } else if (obj[key] === '') {
        obj[key] = defaultColor;
      }
    }
  }

  useEffect(() => {
    const loadColors = async () => {
      try {
        const colors = await fetchColorAndStoreInSlice();
        if (colors) {
          const updatedValues = { ...initialValues, ...colors };
          formik.setValues(updatedValues);
        }
      } catch (error) {
        console.error('Error loading colors:', error);
      }
    };
    loadColors();
  }, [])

  const formik = useFormik<ICustomColorCode>({
    initialValues,
    validationSchema: colorCodeSchema,
    onSubmit: async (values) => {
      console.log("values: ", values);

      setLoading(true);
      try {
        setDefaultValues(values);

        console.log("submittedValues: ", values);
        values.id = customColors?.id
        const res = await updateColorsById(values, values.id as string);

        if (res && !res.hasError) {
          successConfirmation('Successfully updated color codes');
          dispatch(setCustomColors(values));
          // Close modal if callback provided
          if (showAppearanceModal) {
            showAppearanceModal(false);
          }
        }
      }
      catch {
        errorConfirmation('Failed to update color codes');
      }
      finally {
        setLoading(false);
      }
    },
    enableReinitialize: true,
    validateOnMount: true,
  });

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', width: '100%', padding: '0 20px' }}>
      <div className='card' style={{ width: '100%' }}>


        <div className='card-body pt-8'>
        <form onSubmit={formik.handleSubmit} noValidate>
          <div className='accordion' id='colorAccordion'>

            {/* Attendance Calendar */}
            <div className='accordion-item border rounded mb-3'>
              <h2 className='accordion-header'>
                <button
                  className={`accordion-button fw-bold fs-5 ${!openSections.includes('calendar') ? 'collapsed' : ''}`}
                  type='button'
                  onClick={() => toggleSection('calendar')}
                >
                  Attendance Calendar Colors
                </button>
              </h2>
              <div className={`accordion-collapse collapse ${openSections.includes('calendar') ? 'show' : ''}`}>
                <div className='accordion-body'>
                  <div className='row'>
                    <ColorField label='Today' fieldName='attendanceCalendar.todayColor' formik={formik} />
                    <ColorField label='Present' fieldName='attendanceCalendar.presentColor' formik={formik} />
                    <ColorField label='Absent' fieldName='attendanceCalendar.absentColor' formik={formik} />
                    <ColorField label='On Leave' fieldName='attendanceCalendar.onLeaveColor' formik={formik} />
                    <ColorField label='Weekend' fieldName='attendanceCalendar.weekendColor' formik={formik} />
                    <ColorField label='Working Weekend' fieldName='attendanceCalendar.workingWeekendColor' formik={formik} />
                    <ColorField label='Marked Present Via Request' fieldName='attendanceCalendar.markedPresentViaRequestRaisedColor' formik={formik} />
                  </div>
                </div>
              </div>
            </div>

            {/* Attendance Overview */}
            <div className='accordion-item border rounded mb-3'>
              <h2 className='accordion-header'>
                <button
                  className={`accordion-button fw-bold fs-5 ${!openSections.includes('overview') ? 'collapsed' : ''}`}
                  type='button'
                  onClick={() => toggleSection('overview')}
                >
                  Attendance Overview Colors
                </button>
              </h2>
              <div className={`accordion-collapse collapse ${openSections.includes('overview') ? 'show' : ''}`}>
                <div className='accordion-body'>
                  <div className='row'>
                    <ColorField label='Present' fieldName='attendanceOverview.presentColor' formik={formik} />
                    <ColorField label='Absent' fieldName='attendanceOverview.absentColor' formik={formik} />
                    <ColorField label='On Leave' fieldName='attendanceOverview.onLeaveColor' formik={formik} />
                    <ColorField label='Holiday' fieldName='attendanceOverview.holidayColor' formik={formik} />
                    <ColorField label='Extra Day' fieldName='attendanceOverview.extraDayColor' formik={formik} />
                  </div>
                </div>
              </div>
            </div>

            {/* Working Pattern */}
            <div className='accordion-item border rounded mb-3'>
              <h2 className='accordion-header'>
                <button
                  className={`accordion-button fw-bold fs-5 ${!openSections.includes('pattern') ? 'collapsed' : ''}`}
                  type='button'
                  onClick={() => toggleSection('pattern')}
                >
                  Working Pattern Colors
                </button>
              </h2>
              <div className={`accordion-collapse collapse ${openSections.includes('pattern') ? 'show' : ''}`}>
                <div className='accordion-body'>
                  <div className='row'>
                    <ColorField label='Total Working Days' fieldName='workingPattern.totalWorkingDaysColor' formik={formik} />
                    <ColorField label='Check In' fieldName='workingPattern.checkInColor' formik={formik} />
                    <ColorField label='Check Out' fieldName='workingPattern.checkoutColor' formik={formik} />
                    <ColorField label='Early Check-in' fieldName='workingPattern.earlyCheckinColor' formik={formik} />
                    <ColorField label='Late Check-in' fieldName='workingPattern.lateCheckinColor' formik={formik} />
                    <ColorField label='Early Checkout' fieldName='workingPattern.earlyCheckoutColor' formik={formik} />
                    <ColorField label='Late Checkout' fieldName='workingPattern.lateCheckoutColor' formik={formik} />
                    <ColorField label='Missing Checkout' fieldName='workingPattern.missingCheckoutColor' formik={formik} />
                  </div>
                </div>
              </div>
            </div>

            {/* Work Locations */}
            <div className='accordion-item border rounded mb-3'>
              <h2 className='accordion-header'>
                <button
                  className={`accordion-button fw-bold fs-5 ${!openSections.includes('location') ? 'collapsed' : ''}`}
                  type='button'
                  onClick={() => toggleSection('location')}
                >
                  Work Location Colors
                </button>
              </h2>
              <div className={`accordion-collapse collapse ${openSections.includes('location') ? 'show' : ''}`}>
                <div className='accordion-body'>
                  <div className='row'>
                    <ColorField label='Office' fieldName='workingLocation.officeColor' formik={formik} />
                    <ColorField label='On Site' fieldName='workingLocation.onSiteColor' formik={formik} />
                    <ColorField label='Remote' fieldName='workingLocation.remoteColor' formik={formik} />
                  </div>
                </div>
              </div>
            </div>

            {/* Moments That Matter */}
            <div className='accordion-item border rounded mb-3'>
              <h2 className='accordion-header'>
                <button
                  className={`accordion-button fw-bold fs-5 ${!openSections.includes('moments') ? 'collapsed' : ''}`}
                  type='button'
                  onClick={() => toggleSection('moments')}
                >
                  Moments That Matter Colors
                </button>
              </h2>
              <div className={`accordion-collapse collapse ${openSections.includes('moments') ? 'show' : ''}`}>
                <div className='accordion-body'>
                  <div className='row'>
                    <ColorField label='Birthdays' fieldName='momentsThatMatter.birthdaysColor' formik={formik} />
                    <ColorField label='Work Anniversaries' fieldName='momentsThatMatter.anniversariesColor' formik={formik} />
                  </div>
                </div>
              </div>
            </div>

            {/* Leave Types */}
            <div className='accordion-item border rounded mb-3'>
              <h2 className='accordion-header'>
                <button
                  className={`accordion-button fw-bold fs-5 ${!openSections.includes('leaves') ? 'collapsed' : ''}`}
                  type='button'
                  onClick={() => toggleSection('leaves')}
                >
                  Leave Types Colors
                </button>
              </h2>
              <div className={`accordion-collapse collapse ${openSections.includes('leaves') ? 'show' : ''}`}>
                <div className='accordion-body'>
                  <div className='row'>
                    <ColorField label='Sick Leaves' fieldName='leaveTypes.sickLeaveColor' formik={formik} />
                    <ColorField label='Casual Leaves' fieldName='leaveTypes.casualLeaveColor' formik={formik} />
                    <ColorField label='Annual Leaves' fieldName='leaveTypes.annualLeaveColor' formik={formik} />
                    <ColorField label='Maternal Leaves' fieldName='leaveTypes.maternalLeaveColor' formik={formik} />
                    <ColorField label='Floater Leaves' fieldName='leaveTypes.floaterLeaveColor' formik={formik} />
                    <ColorField label='Unpaid Leaves' fieldName='leaveTypes.unpaidLeaveColor' formik={formik} />
                  </div>
                </div>
              </div>
            </div>

          </div>

          <div className='d-flex justify-content-start pt-6 mt-4'>
            <button type='submit' className='btn btn-primary btn-lg' disabled={loading || !formik.isValid}>
              {!loading && 'Save Changes'}
              {loading && (
                <span className='indicator-progress' style={{ display: 'block' }}>
                  Please wait...{' '}
                  <span className='spinner-border spinner-border-sm align-middle ms-2'></span>
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
    </div>
  )
}

export default Appearance
