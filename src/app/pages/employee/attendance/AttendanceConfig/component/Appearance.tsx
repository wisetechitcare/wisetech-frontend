import { errorConfirmation, successConfirmation } from '@utils/modal';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import React, { useEffect, useState } from 'react';
import { ICustomColorCode } from '@redux/slices/customColors';
import { useDispatch, useSelector } from 'react-redux';
import { setCustomColors } from '@redux/slices/customColors';
import { updateColorsById } from '@services/options';
import { fetchColorAndStoreInSlice } from '@utils/file';
import { KTIcon } from '@metronic/helpers';
import { Box, CircularProgress } from '@mui/material';
// Same MUI glass kit as the Sandwich Leave benchmark — for the primary action button.
import { WtButton } from '@app/modules/common/components/ui';
import { AppIcon } from '@app/modules/common/components/ui/AppIcon';
// The calendar's appearance registry — the ONE list of what the grid paints.
// This screen is generated from it, so the two cannot drift apart again.
import {
  CALENDAR_TONES,
  isHex6,
  readToneOverrides,
  resolveToneColor,
  resolveToneLabel,
  type CalendarToneKey,
  type CalendarToneOverride,
  type CalendarToneOverrides,
  type CalendarToneSpec,
} from '@pages/employee/attendance/personal/views/overview/calendar/appearance';
import { readableOn } from '@pages/employee/attendance/personal/views/overview/calendar/dayTokens';

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
      gap: '10px',
      width: '100%',
      boxSizing: 'border-box',
      border: '1px solid #e8ebf0',
      borderRadius: '12px',
      padding: '10px 12px',
      backgroundColor: '#ffffff',
    }}>
      {/* Colour swatch — larger, rounded, with an inset ring so light colours stay visible */}
      <div style={{
        width: '24px',
        height: '24px',
        borderRadius: '8px',
        backgroundColor: value || '#000000',
        flexShrink: 0,
        border: '1px solid rgba(15,23,42,0.10)',
        boxShadow: 'inset 0 0 0 2px #ffffff',
      }} />
      <div style={{ minWidth: 0, flex: '1 1 auto' }}>
        <p style={{
          fontFamily: 'Inter, sans-serif',
          fontWeight: 600,
          fontSize: '13.5px',
          lineHeight: 1.3,
          color: '#0f172a',
          margin: 0,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }} title={label}>
          {label}
        </p>
        <p style={{
          fontFamily: 'Inter, sans-serif',
          fontWeight: 500,
          fontSize: '12px',
          lineHeight: 1.4,
          color: '#64748b',
          margin: 0,
          fontVariantNumeric: 'tabular-nums',
          textTransform: 'uppercase',
        }}>
          {value || '#000000'}
        </p>
      </div>
      <button
        type="button"
        onClick={onClick}
        title={`Edit ${label} color`}
        aria-label={`Edit ${label} color`}
        style={{
          background: '#f1f5f9',
          border: '1px solid #e2e8f0',
          borderRadius: '9px',
          padding: 0,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '32px',
          height: '32px',
          flexShrink: 0,
          transition: 'background-color .15s, border-color .15s',
        }}
      >
        <AppIcon name="pencil" className="fs-5" color="#475569" />
      </button>
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
          // Was `whiteSpace: 'pre'`, which never showed because every subtitle
          // was empty. The generated sections have real subtitles, and `pre`
          // would have run them off the right edge on a phone.
          width: '100%'
        }}>
          <p style={{
            fontFamily: 'Inter, sans-serif',
            fontWeight: 700,
            fontSize: '16px',
            letterSpacing: '-0.01em',
            lineHeight: 'normal',
            color: '#0f172a',
            margin: 0
          }}>
            {title}
          </p>
          {subtitle && (
            <p style={{
              fontFamily: 'Inter, sans-serif',
              fontWeight: 400,
              fontSize: '13px',
              lineHeight: 1.55,
              color: '#55606F',
              margin: 0
            }}>
              {subtitle}
            </p>
          )}
        </div>
        {/* Responsive auto-fill grid: 1 column on phones, 2–3 on wider screens — no wasted width,
            no cramped single column. minmax floor keeps each chip readable; it never shrinks below it. */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
          gap: '10px',
          alignItems: 'stretch',
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
  /**
   * ONE callback carrying both fields, never two.
   *
   * Applying the colour and the name through separate callbacks looked
   * harmless and silently dropped the colour: both write through Formik, whose
   * `setFieldValue` is batched, so the second call read the map as it was
   * BEFORE the first and wrote it back without the colour. The name landed and
   * the colour did not.
   */
  onColorChange: (color: string, name?: string) => void;
  /**
   * Registry-backed entries are also RENAMEABLE. Passing this switches the
   * dialog from "pick a colour" to "name it and pick a colour"; the flat legacy
   * fields omit it and behave exactly as before.
   */
  editableName?: boolean;
  nameValue?: string;
  namePlaceholder?: string;
  hint?: string;
}

const ColorPickerModal: React.FC<ColorPickerModalProps> = ({
  show,
  onHide,
  label,
  value,
  onColorChange,
  editableName,
  nameValue,
  namePlaceholder,
  hint,
}) => {
  const [tempColor, setTempColor] = useState(value);
  const [tempName, setTempName] = useState(nameValue ?? '');

  useEffect(() => {
    setTempColor(value);
  }, [value]);

  useEffect(() => {
    setTempName(nameValue ?? '');
  }, [nameValue, show]);

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

        {hint && (
          <p className="mb-4 mt-[-8px] text-[12.5px] leading-relaxed text-slate-500">{hint}</p>
        )}

        {editableName && (
          <div className="mb-5">
            <label
              htmlFor="wt-tone-name"
              className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.05em] text-slate-400"
            >
              Name shown on the calendar
            </label>
            <input
              id="wt-tone-name"
              type="text"
              value={tempName}
              placeholder={namePlaceholder}
              maxLength={40}
              onChange={(e) => setTempName(e.target.value)}
              className="w-full border border-[#E5E7EB] px-3 py-2.5 text-[14px] text-slate-900 outline-none focus:border-[#1E3A8A]"
              style={{ borderRadius: 6 }}
            />
            <p className="mt-1.5 text-[11.5px] text-slate-400">
              Leave blank to use the default, “{namePlaceholder}”.
            </p>
          </div>
        )}

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
              // Both fields in ONE write — see onColorChange's note.
              onColorChange(tempColor, editableName ? tempName.trim() : undefined);
              onHide();
            }}
            style={{
              backgroundColor: '#1E3A8A',
              borderColor: '#1E3A8A',
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

/**
 * A swatch shaped like the thing it configures.
 *
 * A flat square told you the colour and nothing else, which is how "Weekend"
 * came to be set to a saturated blue that the calendar then renders as a 12%
 * tint. Mirroring the calendar's own shape language — filled disc, split disc,
 * tint, dot, ring — means you can see what you are about to change before you
 * change it.
 */
function TonePreview({ spec, color, presentColor }: { spec: CalendarToneSpec; color: string; presentColor: string }) {
  const disc = 'grid size-[30px] shrink-0 place-items-center rounded-full text-[12px] font-bold tabular-nums';
  const numeral = '18';

  if (spec.channel === 'split') {
    return (
      <span
        className={disc}
        style={{ background: `linear-gradient(105deg, ${color} 0 50%, ${presentColor} 50% 100%)`, color: readableOn(color) }}
      >
        {numeral}
      </span>
    );
  }
  if (spec.channel === 'tint') {
    return (
      <span className={disc} style={{ backgroundColor: `${color}1F`, color: '#475569' }}>
        {numeral}
      </span>
    );
  }
  if (spec.channel === 'ring') {
    return (
      <span className={disc} style={{ boxShadow: `0 0 0 2px ${color}`, color: '#475569' }}>
        {numeral}
      </span>
    );
  }
  if (spec.channel === 'dot') {
    /**
     * The disc is NEUTRAL here, not the Present colour.
     *
     * Previewing a mark on the day it usually sits on was the more faithful
     * drawing, and it made the card useless: six marks all rendered as a green
     * Present tile whose only difference was a 4.5px dot, so Remote, Late
     * check-in and Currently working were indistinguishable from each other and
     * from Present. A settings card exists to show the value being edited, so
     * the configured colour is the most saturated thing on it and the dot is
     * drawn large enough to read.
     */
    return (
      <span
        className={`${disc} relative`}
        style={{ backgroundColor: 'rgba(100,116,139,.10)', color: '#64748B', boxShadow: 'inset 0 0 0 1px rgba(100,116,139,.20)' }}
      >
        <span className="-translate-y-[3px] leading-none">{numeral}</span>
        <i
          className="absolute bottom-[3px] left-1/2 block size-[8px] -translate-x-1/2 rounded-full"
          style={{ backgroundColor: color, boxShadow: '0 0 0 1.5px rgba(255,255,255,.9)' }}
        />
      </span>
    );
  }
  return (
    <span className={disc} style={{ backgroundColor: color, color: readableOn(color) }}>
      {numeral}
    </span>
  );
}

/**
 * One registry entry, as an editable card.
 *
 * Shows the NAME the calendar will use and the COLOUR it will paint — both
 * resolved exactly as the calendar resolves them, through the same functions,
 * so this card cannot show something the grid disagrees with.
 */
function CalendarToneCard({
  spec,
  color,
  label,
  presentColor,
  renamed,
  onEdit,
}: {
  spec: CalendarToneSpec;
  color: string;
  label: string;
  presentColor: string;
  renamed: boolean;
  onEdit: () => void;
}) {
  return (
    <div className="flex w-full items-center gap-2.5 rounded-xl border border-[#e8ebf0] bg-white p-2.5 dark:border-white/10 dark:bg-white/[0.03]">
      <TonePreview spec={spec} color={color} presentColor={presentColor} />
      <div className="min-w-0 flex-1">
        <p className="m-0 truncate text-[13.5px] font-semibold leading-tight text-slate-900 dark:text-slate-100" title={label}>
          {label}
          {renamed && (
            <span className="ml-1.5 align-middle text-[10px] font-bold uppercase tracking-wide text-slate-400">renamed</span>
          )}
          {/* Says so up front, rather than leaving someone to wonder why the
              colour they just set has no chip under the calendar. */}
          {spec.legend === false && (
            <span className="ml-1.5 align-middle text-[10px] font-bold uppercase tracking-wide text-slate-300 dark:text-slate-600">
              not in legend
            </span>
          )}
        </p>
        <p className="m-0 text-[12px] font-medium uppercase leading-snug tabular-nums text-slate-500 dark:text-slate-400">
          {color}
        </p>
      </div>
      <button
        type="button"
        onClick={onEdit}
        aria-label={`Edit ${label}`}
        className="flex size-8 shrink-0 items-center justify-center border border-[#e2e8f0] bg-[#f1f5f9] transition-colors hover:bg-[#e2e8f0] dark:border-white/10 dark:bg-white/[0.06]"
        // Bootstrap Reboot's unlayered `button { border-radius: 0 }` outranks
        // every rounded-* utility, so the radius has to be inline.
        style={{ borderRadius: 9, padding: 0 }}
      >
        <AppIcon name="pencil" className="fs-5" color="#475569" />
      </button>
    </div>
  );
}

interface AppearanceProps {
  showAppearanceModal?: (visible: boolean) => void;
}

function Appearance({ showAppearanceModal }: AppearanceProps) {
  const [loading, setLoading] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [selectedColorField, setSelectedColorField] = useState<{ label: string; fieldName: string } | null>(null);
  const [selectedTone, setSelectedTone] = useState<CalendarToneSpec | null>(null);
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
    setSelectedTone(null);
    setShowColorPicker(true);
  };

  const handleColorChange = (fieldName: string, color: string) => {
    formik.setFieldValue(fieldName, color);
  };

  /* ── Registry-backed entries ────────────────────────────────────────────── */

  /**
   * Read through the SAME resolvers the calendar uses, against the form's live
   * values rather than the saved slice — so the card previews what you are
   * about to save, and can never describe the grid incorrectly.
   */
  const formConfig = { attendanceCalendar: formik.values.attendanceCalendar, attendanceOverview: formik.values.attendanceOverview };
  const toneColor = (key: CalendarToneKey) => resolveToneColor(key, formConfig);
  const toneLabel = (key: CalendarToneKey) => resolveToneLabel(key, formConfig);

  const openToneEditor = (spec: CalendarToneSpec) => {
    setSelectedTone(spec);
    setSelectedColorField(null);
    setShowColorPicker(true);
  };

  /**
   * Writes the whole `tones` map rather than one nested path.
   *
   * `setDefaultValues` walks the submitted values turning any empty string into
   * `#000000` — harmless for a colour, but it would silently rename an entry to
   * "#000000". Empty values are therefore never stored: a key whose colour and
   * name both match the defaults is REMOVED, so the blob stays a record of what
   * was actually changed instead of a copy of the registry.
   */
  const patchTone = (key: CalendarToneKey, patch: CalendarToneOverride) => {
    const current = readToneOverrides(formik.values.attendanceCalendar);
    const merged = { ...current[key], ...patch };
    const spec = CALENDAR_TONES.find((t) => t.key === key);

    const next: CalendarToneOverrides = { ...current };
    const color = isHex6(merged.color) ? merged.color : undefined;
    const label = merged.label?.trim() && merged.label.trim() !== spec?.label ? merged.label.trim() : undefined;

    if (color || label) next[key] = { ...(color && { color }), ...(label && { label }) };
    else delete next[key];

    formik.setFieldValue('attendanceCalendar.tones', next);

    /**
     * Write the colour back to the flat fields that mean the same thing.
     *
     * "Present" is stored twice — once for the calendar and once for the
     * Attendance Overview group the dashboard charts read — and the two had
     * drifted to different greens. Nothing in the product wants them to differ,
     * so one edit now updates every field naming the same concept, and the
     * legacy readers stay in step without anyone hunting for the twin.
     */
    if (color) {
      [spec?.legacyColor, ...(spec?.mirrorTo ?? [])]
        .filter(Boolean)
        .forEach((path) => formik.setFieldValue(String(path), color));
    }
  };

  return (
    <div style={{ width: '100%' }}>
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
                backgroundColor: '#1E3A8A'
              }} />
              <p style={{
                fontFamily: 'Inter, sans-serif',
                fontWeight: 600,
                fontSize: '16px',
                letterSpacing: '0.8px',
                textTransform: 'uppercase',
                lineHeight: 'normal',
                color: '#1E3A8A',
                margin: 0,
                whiteSpace: 'pre'
              }}>
                Statuses Colors
              </p>
              <div style={{
                flex: 1,
                height: '1px',
                backgroundColor: '#1E3A8A',
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
              {/* GENERATED from the calendar's appearance registry, not typed out.
                  Seven hand-written rows were the reason the two drifted: the grid
                  paints fourteen things, and nothing made the settings screen say
                  so. Add a key to CALENDAR_TONES and its row appears here. */}
              <ColorSection
                title="Attendance calendar · Day status"
                subtitle="What a day IS. One of these fills the tile on the attendance calendar."
              >
                {CALENDAR_TONES.filter((t) => t.group === 'status').map((spec) => (
                  <CalendarToneCard
                    key={spec.key}
                    spec={spec}
                    color={toneColor(spec.key)}
                    label={toneLabel(spec.key)}
                    presentColor={toneColor('present')}
                    renamed={toneLabel(spec.key) !== spec.label}
                    onEdit={() => openToneEditor(spec)}
                  />
                ))}
              </ColorSection>

              <ColorSection
                title="Attendance calendar · Marks on a day"
                subtitle="What is true ABOUT a day. These sit alongside the status rather than replacing it."
              >
                {CALENDAR_TONES.filter((t) => t.group === 'mark').map((spec) => (
                  <CalendarToneCard
                    key={spec.key}
                    spec={spec}
                    color={toneColor(spec.key)}
                    label={toneLabel(spec.key)}
                    presentColor={toneColor('present')}
                    renamed={toneLabel(spec.key) !== spec.label}
                    onEdit={() => openToneEditor(spec)}
                  />
                ))}
              </ColorSection>

              <ColorSection
                title="Attendance calendar · The grid itself"
                subtitle="Not day categories, so these never appear in the legend — but the calendar paints them, so they are yours to set."
              >
                {CALENDAR_TONES.filter((t) => t.group === 'grid').map((spec) => (
                  <CalendarToneCard
                    key={spec.key}
                    spec={spec}
                    color={toneColor(spec.key)}
                    label={toneLabel(spec.key)}
                    presentColor={toneColor('present')}
                    renamed={toneLabel(spec.key) !== spec.label}
                    onEdit={() => openToneEditor(spec)}
                  />
                ))}
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
                <ColorRow label="Early CheckOut" fieldName="workingPattern.earlyCheckoutColor" value={formik.values.workingPattern?.earlyCheckoutColor} onClick={() => openColorPicker('Early CheckOut', 'workingPattern.earlyCheckoutColor')} />
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
          <Box sx={{ display: 'flex', justifyContent: { xs: 'stretch', sm: 'flex-end' }, width: '100%' }}>
            <WtButton
              type="submit" tone="primary" disabled={loading || !formik.isValid}
              startIcon={loading ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : <KTIcon iconName="check-circle" className="fs-3" />}
              sx={{ width: { xs: '100%', sm: 'auto' }, minWidth: { sm: 200 } }}
            >
              {loading ? 'Saving…' : 'Save Appearance'}
            </WtButton>
          </Box>
        </div>
      </form>

      {/* A registry-backed entry: name AND colour. */}
      {selectedTone && (
        <ColorPickerModal
          show={showColorPicker}
          onHide={() => setShowColorPicker(false)}
          label={toneLabel(selectedTone.key)}
          hint={selectedTone.hint}
          value={toneColor(selectedTone.key)}
          editableName
          nameValue={readToneOverrides(formik.values.attendanceCalendar)[selectedTone.key]?.label ?? ''}
          namePlaceholder={selectedTone.label}
          // ONE write carrying both fields. Two calls raced through Formik's
          // batched setFieldValue and the colour lost.
          onColorChange={(color, name) => patchTone(selectedTone.key, { color, label: name ?? '' })}
        />
      )}

      {/* A legacy flat field: colour only, unchanged. */}
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
