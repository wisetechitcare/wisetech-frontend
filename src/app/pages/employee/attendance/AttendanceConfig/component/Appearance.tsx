import { errorConfirmation, successConfirmation } from '@utils/modal';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import React, { useEffect, useState } from 'react';
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
    checkInColor: '#2ECC71',
    checkoutColor: '#E67E22',
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
  momentsThatMatter: {
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
});

interface ColorRowProps {
  label: string;
  fieldName: string;
  value: string;
  onClick: () => void;
}

const ColorRow: React.FC<ColorRowProps> = ({ label, fieldName, value, onClick }) => {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      width: '100%',
      flexWrap: 'wrap',
      gap: '8px'
    }}>
      <p style={{
        fontFamily: 'Inter, sans-serif',
        fontWeight: 500,
        fontSize: '14px',
        lineHeight: 'normal',
        color: '#000000',
        margin: 0,
        flex: '1 1 auto',
        minWidth: '100px'
      }}>
        {label}
      </p>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        flex: '0 0 auto'
      }}>
        <div style={{
          width: '14px',
          height: '14px',
          borderRadius: '50%',
          backgroundColor: value || '#000000',
          flexShrink: 0
        }} />
        <p style={{
          fontFamily: 'Inter, sans-serif',
          fontWeight: 400,
          fontSize: '14px',
          lineHeight: 'normal',
          color: '#000000',
          margin: 0,
          width: '70px',
          textAlign: 'left'
        }}>
          {value || '#000000'}
        </p>
        <button
          type="button"
          onClick={onClick}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '18px',
            height: '18px',
            flexShrink: 0
          }}
        >
          <i className="ki-duotone ki-pencil fs-5" style={{ color: '#6B7280' }}>
            <span className="path1"></span>
            <span className="path2"></span>
          </i>
        </button>
      </div>
    </div>
  );
};

interface ColorSectionProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  showDivider?: boolean;
}

const ColorSection: React.FC<ColorSectionProps> = ({ title, subtitle, children, showDivider = true }) => {
  return (
    <>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        alignItems: 'flex-start',
        width: '100%'
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          alignItems: 'flex-start',
          whiteSpace: 'pre'
        }}>
          <p style={{
            fontFamily: 'Inter, sans-serif',
            fontWeight: 600,
            fontSize: '16px',
            lineHeight: 'normal',
            color: '#000000',
            margin: 0
          }}>
            {title}
          </p>
          {subtitle && (
            <p style={{
              fontFamily: 'Inter, sans-serif',
              fontWeight: 400,
              fontSize: '12px',
              lineHeight: 'normal',
              color: '#8696ad',
              margin: 0
            }}>
              {subtitle}
            </p>
          )}
        </div>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          alignItems: 'flex-start',
          width: '100%'
        }}>
          {children}
        </div>
      </div>
      {showDivider && (
        <div style={{
          backgroundColor: '#d2d8e2',
          height: '1px',
          width: '100%'
        }} />
      )}
    </>
  );
};

interface ColorPickerModalProps {
  show: boolean;
  onHide: () => void;
  label: string;
  value: string;
  onColorChange: (color: string) => void;
}

const ColorPickerModal: React.FC<ColorPickerModalProps> = ({ show, onHide, label, value, onColorChange }) => {
  const [tempColor, setTempColor] = useState(value);

  useEffect(() => {
    setTempColor(value);
  }, [value]);

  if (!show) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1060,
      padding: '16px'
    }} onClick={onHide}>
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        padding: '24px',
        maxWidth: '400px',
        width: '100%',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)'
      }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{
          fontSize: '18px',
          fontWeight: 600,
          fontFamily: 'Inter, sans-serif',
          color: '#111827',
          marginBottom: '20px'
        }}>
          {label}
        </h3>
        <div style={{ marginBottom: '20px' }}>
          <input
            type="color"
            value={tempColor}
            onChange={(e) => setTempColor(e.target.value)}
            style={{
              width: '100%',
              height: '60px',
              border: '2px solid #E5E7EB',
              borderRadius: '8px',
              cursor: 'pointer',
              padding: '4px'
            }}
          />
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '24px'
        }}>
          <input
            type="text"
            value={tempColor}
            onChange={(e) => setTempColor(e.target.value)}
            style={{
              flex: 1,
              padding: '10px 12px',
              border: '1px solid #E5E7EB',
              borderRadius: '6px',
              fontSize: '14px',
              fontFamily: 'monospace'
            }}
          />
        </div>
        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={onHide}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: 500,
              border: '1px solid #E5E7EB',
              borderRadius: '6px',
              backgroundColor: '#ffffff',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onColorChange(tempColor);
              onHide();
            }}
            style={{
              backgroundColor: '#9d4141',
              borderColor: '#9d4141',
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: 500,
              border: 'none',
              borderRadius: '6px',
              color: '#ffffff',
              cursor: 'pointer'
            }}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
};

interface AppearanceProps {
  showAppearanceModal?: (visible: boolean) => void;
}

function Appearance({ showAppearanceModal }: AppearanceProps) {
  const [loading, setLoading] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [selectedColorField, setSelectedColorField] = useState<{ label: string; fieldName: string } | null>(null);
  const dispatch = useDispatch();
  const defaultColor = '#000000';
  const customColors = useSelector((state: any) => state.customColors);

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
    if (!customColors) return;
    fetchColorAndStoreInSlice();
    initialValues = { ...initialValues, ...customColors };
    console.log('Loaded customColors:', customColors);
    console.log('Leave Types Colors:', customColors?.leaveTypes);
    console.log('Moments That Matter Colors:', customColors?.momentsThatMatter);
    formik.setValues(initialValues);
  }, [customColors]);

  const formik = useFormik<ICustomColorCode>({
    initialValues,
    validationSchema: colorCodeSchema,
    onSubmit: async (values) => {
      console.log("values: ", values);

      setLoading(true);
      try {
        setDefaultValues(values);

        console.log("submittedValues: ", values);
        values.id = customColors?.id;
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

  const openColorPicker = (label: string, fieldName: string) => {
    setSelectedColorField({ label, fieldName });
    setShowColorPicker(true);
  };

  const handleColorChange = (fieldName: string, color: string) => {
    formik.setFieldValue(fieldName, color);
  };

  return (
    <div style={{
      backgroundColor: '#f7f9fc',
      padding: '24px 20px',
      borderRadius: '12px',
      overflow: 'auto',
      height: '100%',
      width: '100%'
    }}>
      <form onSubmit={formik.handleSubmit} noValidate>
        {/* Title */}
        <p style={{
          fontFamily: 'Barlow, sans-serif',
          fontWeight: 600,
          fontSize: '24px',
          letterSpacing: '0.24px',
          lineHeight: 'normal',
          color: '#000000',
          margin: '0 0 24px 0',
          whiteSpace: 'pre'
        }}>
          {/* Appearance Settings */}
        </p>

        {/* Main Content Container */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          alignItems: 'flex-start',
          width: '100%'
        }}>
          {/* Statuses Colors Section */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            alignItems: 'flex-start',
            width: '100%'
          }}>
            {/* STATUSES COLORS Divider */}
            <div style={{
              display: 'flex',
              gap: '12px',
              alignItems: 'center',
              width: '100%'
            }}>
              <div style={{
                width: '26px',
                height: '1px',
                backgroundColor: '#9d4141'
              }} />
              <p style={{
                fontFamily: 'Inter, sans-serif',
                fontWeight: 600,
                fontSize: '16px',
                letterSpacing: '0.8px',
                textTransform: 'uppercase',
                lineHeight: 'normal',
                color: '#9d4141',
                margin: 0,
                whiteSpace: 'pre'
              }}>
                Statuses Colors
              </p>
              <div style={{
                flex: 1,
                height: '1px',
                backgroundColor: '#9d4141',
                minWidth: '1px'
              }} />
            </div>

            {/* White Container */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              padding: '20px 25px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              alignItems: 'flex-start',
              width: '100%',
              boxSizing: 'border-box'
            }}>
              {/* Attendance Calendar Colors */}
              <ColorSection title="Attendance Calendar Colors" subtitle="">
                <ColorRow label="Today" fieldName="attendanceCalendar.todayColor" value={formik.values.attendanceCalendar?.todayColor} onClick={() => openColorPicker('Today', 'attendanceCalendar.todayColor')} />
                <ColorRow label="Present" fieldName="attendanceCalendar.presentColor" value={formik.values.attendanceCalendar?.presentColor} onClick={() => openColorPicker('Present', 'attendanceCalendar.presentColor')} />
                <ColorRow label="Absent" fieldName="attendanceCalendar.absentColor" value={formik.values.attendanceCalendar?.absentColor} onClick={() => openColorPicker('Absent', 'attendanceCalendar.absentColor')} />
                <ColorRow label="On leave" fieldName="attendanceCalendar.onLeaveColor" value={formik.values.attendanceCalendar?.onLeaveColor} onClick={() => openColorPicker('On leave', 'attendanceCalendar.onLeaveColor')} />
                <ColorRow label="Weekend" fieldName="attendanceCalendar.weekendColor" value={formik.values.attendanceCalendar?.weekendColor} onClick={() => openColorPicker('Weekend', 'attendanceCalendar.weekendColor')} />
                <ColorRow label="Working Weekend" fieldName="attendanceCalendar.workingWeekendColor" value={formik.values.attendanceCalendar?.workingWeekendColor} onClick={() => openColorPicker('Working Weekend', 'attendanceCalendar.workingWeekendColor')} />
                <ColorRow label="Marked Present Via Request" fieldName="attendanceCalendar.markedPresentViaRequestRaisedColor" value={formik.values.attendanceCalendar?.markedPresentViaRequestRaisedColor} onClick={() => openColorPicker('Marked Present Via Request', 'attendanceCalendar.markedPresentViaRequestRaisedColor')} />
              </ColorSection>

              {/* Attendance Overview */}
              <ColorSection title="Attendance Overview Colors" subtitle="">
                <ColorRow label="Present" fieldName="attendanceOverview.presentColor" value={formik.values.attendanceOverview?.presentColor} onClick={() => openColorPicker('Present', 'attendanceOverview.presentColor')} />
                <ColorRow label="Absent" fieldName="attendanceOverview.absentColor" value={formik.values.attendanceOverview?.absentColor} onClick={() => openColorPicker('Absent', 'attendanceOverview.absentColor')} />
                <ColorRow label="On Leave" fieldName="attendanceOverview.onLeaveColor" value={formik.values.attendanceOverview?.onLeaveColor} onClick={() => openColorPicker('On Leave', 'attendanceOverview.onLeaveColor')} />
                <ColorRow label="Holiday" fieldName="attendanceOverview.holidayColor" value={formik.values.attendanceOverview?.holidayColor} onClick={() => openColorPicker('Holiday', 'attendanceOverview.holidayColor')} />
                <ColorRow label="Extra Day" fieldName="attendanceOverview.extraDayColor" value={formik.values.attendanceOverview?.extraDayColor} onClick={() => openColorPicker('Extra Day', 'attendanceOverview.extraDayColor')} />
              </ColorSection>

              {/* Working Pattern */}
              <ColorSection title="Working Pattern Colors" subtitle="">
                <ColorRow label="Total Working Days" fieldName="workingPattern.totalWorkingDaysColor" value={formik.values.workingPattern?.totalWorkingDaysColor} onClick={() => openColorPicker('Total Working Days', 'workingPattern.totalWorkingDaysColor')} />
                <ColorRow label="Check In" fieldName="workingPattern.checkInColor" value={formik.values.workingPattern?.checkInColor} onClick={() => openColorPicker('Check In', 'workingPattern.checkInColor')} />
                <ColorRow label="Check Out" fieldName="workingPattern.checkoutColor" value={formik.values.workingPattern?.checkoutColor} onClick={() => openColorPicker('Check Out', 'workingPattern.checkoutColor')} />
                <ColorRow label="Early Check-in" fieldName="workingPattern.earlyCheckinColor" value={formik.values.workingPattern?.earlyCheckinColor} onClick={() => openColorPicker('Early Check-in', 'workingPattern.earlyCheckinColor')} />
                <ColorRow label="Late Check-in" fieldName="workingPattern.lateCheckinColor" value={formik.values.workingPattern?.lateCheckinColor} onClick={() => openColorPicker('Late Check-in', 'workingPattern.lateCheckinColor')} />
                <ColorRow label="Early Checkout" fieldName="workingPattern.earlyCheckoutColor" value={formik.values.workingPattern?.earlyCheckoutColor} onClick={() => openColorPicker('Early Checkout', 'workingPattern.earlyCheckoutColor')} />
                <ColorRow label="Late Checkout" fieldName="workingPattern.lateCheckoutColor" value={formik.values.workingPattern?.lateCheckoutColor} onClick={() => openColorPicker('Late Checkout', 'workingPattern.lateCheckoutColor')} />
                <ColorRow label="Missing Checkout" fieldName="workingPattern.missingCheckoutColor" value={formik.values.workingPattern?.missingCheckoutColor} onClick={() => openColorPicker('Missing Checkout', 'workingPattern.missingCheckoutColor')} />
              </ColorSection>

              {/* Work Locations */}
              <ColorSection title="Work Location Colors" subtitle="">
                <ColorRow label="Office" fieldName="workingLocation.officeColor" value={formik.values.workingLocation?.officeColor} onClick={() => openColorPicker('Office', 'workingLocation.officeColor')} />
                <ColorRow label="On Site" fieldName="workingLocation.onSiteColor" value={formik.values.workingLocation?.onSiteColor} onClick={() => openColorPicker('On Site', 'workingLocation.onSiteColor')} />
                <ColorRow label="Remote" fieldName="workingLocation.remoteColor" value={formik.values.workingLocation?.remoteColor} onClick={() => openColorPicker('Remote', 'workingLocation.remoteColor')} />
              </ColorSection>

              {/* Moments That Matter */}
              <ColorSection title="Moments That Matter Colors" subtitle="">
                <ColorRow label="Birthdays" fieldName="momentsThatMatter.birthdaysColor" value={formik.values.momentsThatMatter?.birthdaysColor} onClick={() => openColorPicker('Birthdays', 'momentsThatMatter.birthdaysColor')} />
                <ColorRow label="Work Anniversaries" fieldName="momentsThatMatter.anniversariesColor" value={formik.values.momentsThatMatter?.anniversariesColor} onClick={() => openColorPicker('Work Anniversaries', 'momentsThatMatter.anniversariesColor')} />
              </ColorSection>

              {/* Leave Types */}
              <ColorSection title="Leave Types Colors" subtitle="" showDivider={false}>
                <ColorRow label="Sick Leaves" fieldName="leaveTypes.sickLeaveColor" value={formik.values.leaveTypes?.sickLeaveColor} onClick={() => openColorPicker('Sick Leaves', 'leaveTypes.sickLeaveColor')} />
                <ColorRow label="Casual Leaves" fieldName="leaveTypes.casualLeaveColor" value={formik.values.leaveTypes?.casualLeaveColor} onClick={() => openColorPicker('Casual Leaves', 'leaveTypes.casualLeaveColor')} />
                <ColorRow label="Annual Leaves" fieldName="leaveTypes.annualLeaveColor" value={formik.values.leaveTypes?.annualLeaveColor} onClick={() => openColorPicker('Annual Leaves', 'leaveTypes.annualLeaveColor')} />
                <ColorRow label="Maternal Leaves" fieldName="leaveTypes.maternalLeaveColor" value={formik.values.leaveTypes?.maternalLeaveColor} onClick={() => openColorPicker('Maternal Leaves', 'leaveTypes.maternalLeaveColor')} />
                <ColorRow label="Floater Leaves" fieldName="leaveTypes.floaterLeaveColor" value={formik.values.leaveTypes?.floaterLeaveColor} onClick={() => openColorPicker('Floater Leaves', 'leaveTypes.floaterLeaveColor')} />
                <ColorRow label="Unpaid Leaves" fieldName="leaveTypes.unpaidLeaveColor" value={formik.values.leaveTypes?.unpaidLeaveColor} onClick={() => openColorPicker('Unpaid Leaves', 'leaveTypes.unpaidLeaveColor')} />
              </ColorSection>
            </div>
          </div>

          {/* Save Button */}
          <button
            type="submit"
            disabled={loading || !formik.isValid}
            style={{
              backgroundColor: '#9d4141',
              border: '1px solid #9d4141',
              borderRadius: '6px',
              height: '40px',
              display: 'flex',
              gap: '8px',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 20px',
              cursor: loading || !formik.isValid ? 'not-allowed' : 'pointer',
              opacity: loading || !formik.isValid ? 0.6 : 1,
              fontFamily: 'Inter, sans-serif',
              fontWeight: 500,
              fontSize: '14px',
              lineHeight: 'normal',
              color: '#ffffff',
              whiteSpace: 'pre'
            }}
          >
            {!loading && 'Save'}
            {loading && (
              <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
            )}
          </button>
        </div>
      </form>

      {/* Color Picker Modal */}
      {selectedColorField && (
        <ColorPickerModal
          show={showColorPicker}
          onHide={() => setShowColorPicker(false)}
          label={selectedColorField.label}
          value={formik.getFieldProps(selectedColorField.fieldName).value || '#000000'}
          onColorChange={(color) => handleColorChange(selectedColorField.fieldName, color)}
        />
      )}
    </div>
  );
}

export default Appearance;
