import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Phone, GraduationCap, Users, ShieldAlert,
  Landmark, MapPin, CheckCircle, X,
} from 'lucide-react';

import AddAnotherBtn from '@app/modules/common/utils/AddAnotherBtn';
import AddressInfo from '../forms/AddressInfo';
import BasicInfo from '../forms/BasicInfo';
import BankInfo from '../forms/BankInfo';
import EducationalInfo from '../forms/EducationInfo';
import EmergencyDetails from '../forms/EmergencyDetails';
import FamilyInfo from '../forms/FamilyInfo';
import PersonalContactInfo from '../forms/PersonalContactInfo';
import ProfilePicture from '../forms/ProfilePicture';
import MealPreferences from '../forms/MealPreference';
import { getAvatar } from '@utils/avatar';
import { fetchQualificationMasters } from '@services/employee';
import './Step2.css';

const ADD_NEW_QUALIFICATION = '__ADD_NEW__';
const DEFAULT_QUALIFICATIONS = ['SSC', 'Diploma', 'HSC', 'Degree'];

const createNewEducation = () => ({
  instituteName: '', qualificationMasterId: '', qualificationName: '',
  degree: '', specialization: '', stream: '', customStream: '',
  fromDate: '', toDate: '', passingYear: '', percentage: '',
  cgpa: '', filePath: '', fileName: '',
});

const createNewFamilyMember = () => ({
  name: '', relationship: '', mobileNumber: '', dateOfBirth: '',
});

/* ── completion helpers ── */
const countFilled = (vals: Array<any>) =>
  vals.filter((v) => v !== undefined && v !== null && String(v).trim() !== '').length;

export const COMPLETION_FNS: Record<string, (v: any) => { filled: number; total: number }> = {
  'personal-info': (v) => ({ filled: countFilled([v.firstName, v.lastName, v.dateOfBirth, v.gender]), total: 4 }),
  'contact-info':  (v) => ({ filled: countFilled([v.personalEmailId, v.personalPhoneNumber]), total: 2 }),
  'education':     (v) => { const e = v.educationalInfo?.[0]; return e ? { filled: countFilled([e.instituteName, e.qualificationName || e.degree, e.fromDate || e.passingYear, e.percentage || e.cgpa]), total: 4 } : { filled: 0, total: 4 }; },
  'family':        (v) => { const f = v.familyInfo?.[0]; return f ? { filled: countFilled([f.name, f.relationship, f.mobileNumber, f.dateOfBirth]), total: 4 } : { filled: 0, total: 4 }; },
  'emergency':     (v) => ({ filled: countFilled([v.emergencyDetails?.emergencyContactName, v.emergencyDetails?.emergencyContactNumber]), total: 2 }),
  'bank':          (v) => ({ filled: countFilled([v.bankInfo?.accountNumber, v.bankInfo?.accountName, v.bankInfo?.ifscCode]), total: 3 }),
  'address':       (v) => ({ filled: countFilled([v.addressInfo?.permanentAddressLine1, v.addressInfo?.permanentCity, v.addressInfo?.permanentCountry, v.addressInfo?.permanentPostalCode]), total: 4 }),
  'meal':          (v) => ({ filled: v.meal ? 1 : 0, total: 1 }),
};

export const NAV_SECTIONS = [
  { id: 'personal-info', label: 'Personal Information', icon: <User size={15} /> },
  { id: 'contact-info',  label: 'Contact Information',  icon: <Phone size={15} /> },
  { id: 'education',     label: 'Education Details',    icon: <GraduationCap size={15} /> },
  { id: 'family',        label: 'Family Details',       icon: <Users size={15} /> },
  { id: 'emergency',     label: 'Emergency Contact',    icon: <ShieldAlert size={15} /> },
  { id: 'bank',          label: 'Bank Details',         icon: <Landmark size={15} /> },
  { id: 'address',       label: 'Address Details',      icon: <MapPin size={15} /> },
];

/* All sections including meal for navigation */
const ALL_SECTION_IDS = [
  'personal-info',
  'contact-info',
  'education',
  'family',
  'emergency',
  'bank',
  'address',
  'meal',
];

const SECTION_LABELS: Record<string, string> = {
  'personal-info': 'Personal Information',
  'contact-info':  'Contact Information',
  'education':     'Education Details',
  'family':        'Family Details',
  'emergency':     'Emergency Contact',
  'bank':          'Bank Details',
  'address':       'Address Details',
  'meal':          'Additional Details',
};

/* ────────────────────────────────────────
   Simple Section Card (no accordion)
   ──────────────────────────────────────── */
interface SectionCardProps {
  id: string;
  title: string;
  icon: React.ReactNode;
  filled: number;
  total: number;
  children: React.ReactNode;
}

function SectionCard({ id, title, icon, filled, total, children }: SectionCardProps) {
  const isComplete = total > 0 && filled >= total;
  const pct = total > 0 ? Math.round((filled / total) * 100) : 0;

  return (
    <section className="ob-section-card ob-section-card-active" id={`section-${id}`}>
      <div className="ob-section-header ob-section-header-static">
        <div className="ob-section-icon-wrap">{icon}</div>
        <span className="ob-section-header-title">{title}</span>

        <div className="ob-section-status-area">
          {isComplete ? (
            <motion.div
              className="ob-section-check-badge"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 15 }}
            >
              <CheckCircle size={13} />
            </motion.div>
          ) : (
            <>
              <span className="ob-section-completed-badge">{filled}/{total} Completed</span>
              <div className="ob-section-progress-bar">
                <motion.div
                  className="ob-section-progress-fill"
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                />
              </div>
            </>
          )}
        </div>
      </div>

      <div className="ob-section-body">{children}</div>
    </section>
  );
}

/* ────────────────────────────────────────
   Welcome Banner
   ──────────────────────────────────────── */
interface WelcomeBannerProps {
  firstName: string;
  profilePct: number;
  onDismiss: () => void;
}

function WelcomeBanner({ firstName, profilePct, onDismiss }: WelcomeBannerProps) {
  const r = 14;
  const circumference = 2 * Math.PI * r;

  return (
    <motion.div
      className="ob-welcome-banner"
      initial={{ opacity: 0, y: -14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
    >
      <div className="ob-welcome-ring">
        <svg width="60" height="60" viewBox="0 0 36 36" aria-label={`${profilePct}% complete`}>
          <circle cx="18" cy="18" r={r} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="2.5" />
          <motion.circle
            cx="18" cy="18" r={r} fill="none"
            stroke="#fff" strokeWidth="2.5" strokeLinecap="round"
            strokeDashoffset={circumference * 0.25}
            initial={{ strokeDasharray: `0 ${circumference}` }}
            animate={{ strokeDasharray: `${(profilePct / 100) * circumference} ${circumference}` }}
            transition={{ duration: 0.9, delay: 0.2, ease: 'easeOut' }}
          />
          <text x="18" y="22" textAnchor="middle" fontSize="7" fontWeight="700" fill="#fff">
            {profilePct}%
          </text>
        </svg>
      </div>

      <div>
        <p className="ob-welcome-title">
          Welcome{firstName ? `, ${firstName}` : ''}! Let's set up your profile.
        </p>
        <p className="ob-welcome-subtitle">
          About 8 minutes total · Fields marked <strong>*</strong> are required
        </p>
      </div>

      <button className="ob-welcome-dismiss" type="button" onClick={onDismiss} aria-label="Dismiss welcome banner">
        <X size={14} />
      </button>
    </motion.div>
  );
}

/* ────────────────────────────────────────
   Main Step2
   ──────────────────────────────────────── */
function Step2({ formikProps, setFile, setEducationFile, activeSection, onSectionChange, completion }: any) {
  const { values, setFieldValue } = formikProps;
  const educationRows: any[] = Array.isArray(values.educationalInfo) ? values.educationalInfo : [];
  const familyRows: any[] = Array.isArray(values.familyInfo) ? values.familyInfo : [];

  const [qualificationOptions, setQualificationOptions] = useState<any[]>([]);
  const [showBanner, setShowBanner] = useState(true);

  /* profile completion % — use the centralized top-bar value when provided,
     fall back to local calculation so the component stays self-contained */
  const profilePct = completion ?? (() => {
    const fields = [
      values.firstName, values.lastName, values.dateOfBirth, values.gender,
      values.personalEmailId, values.personalPhoneNumber,
      values.educationalInfo?.[0]?.instituteName,
      values.familyInfo?.[0]?.name,
      values.emergencyDetails?.emergencyContactName,
      values.bankInfo?.accountNumber,
      values.addressInfo?.permanentAddressLine1,
    ];
    return Math.round(fields.filter((f) => f && String(f).trim() !== '').length / fields.length * 100);
  })();

  /* qualification master options */
  const loadQualificationOptions = async () => {
    let qualifications: any[] = [];
    try {
      const res = await fetchQualificationMasters();
      qualifications = res?.data?.qualifications || [];
    } catch {
      qualifications = [];
    }
    const byName = new Map<string, any>();
    DEFAULT_QUALIFICATIONS.forEach((name) =>
      byName.set(name.toLowerCase(), { value: name, label: name, name, isDefault: true })
    );
    qualifications.forEach((q: any) => {
      if (!q?.name) return;
      byName.set(q.name.toLowerCase(), { value: q.id, label: q.name, name: q.name });
    });
    const opts = Array.from(byName.values());
    setQualificationOptions([...opts, { value: ADD_NEW_QUALIFICATION, label: '+ Add New', name: '+ Add New' }]);
    return opts;
  };

  useEffect(() => { loadQualificationOptions(); }, []);

  const addNewEducation = () => setFieldValue('educationalInfo', [...educationRows, createNewEducation()]);
  const removeEducation = (i: number) => {
    if (educationRows.length <= 1) return;
    setFieldValue('educationalInfo', educationRows.filter((_: any, idx: number) => idx !== i));
  };

  const addNewFamily = () => setFieldValue('familyInfo', [...familyRows, createNewFamilyMember()]);
  const removeFamily = (i: number) => {
    if (familyRows.length <= 1) return;
    setFieldValue('familyInfo', familyRows.filter((_: any, idx: number) => idx !== i));
  };

  /* per-section completion data */
  const cmp = (id: string) => COMPLETION_FNS[id]?.(values) ?? { filled: 0, total: 0 };

  /* section content map */
  const sectionContent: Record<string, React.ReactNode> = {
     'personal-info': (
      <div className="ob-personal-info-layout">
        <ProfilePicture
          setFile={setFile}
          avatar={values?.avatar}
          defaultImageUrl={getAvatar(values?.avatar, values?.gender)}
        />
        <div className="ob-personal-info-fields">
          <BasicInfo formikProps={formikProps} />
        </div>
      </div>
    ),
    'contact-info': (
      <PersonalContactInfo formikProps={formikProps} />
    ),
    'education': (
      <div className="ob-repeating-section">
        {educationRows.map((_: any, index: number) => (
          <div key={`edu-${index}`}>
            <EducationalInfo
              formikProps={formikProps}
              userId={values?.userId}
              index={index}
              setFile={setFile}
              canRemove={index > 0 && !educationRows[index]?.id}
              onRemove={() => removeEducation(index)}
              qualificationOptions={qualificationOptions}
              onQualificationCreated={loadQualificationOptions}
              setEducationFile={setEducationFile}
            />
          </div>
        ))}
        <AddAnotherBtn onClick={addNewEducation} />
      </div>
    ),
    'family': (
      <div className="ob-repeating-section">
        {familyRows.map((_: any, index: number) => (
          <div key={`fam-${index}`}>
            <FamilyInfo
              formikProps={formikProps}
              index={index}
              canRemove={index > 0 && !familyRows[index]?.id}
              onRemove={() => removeFamily(index)}
            />
          </div>
        ))}
        <AddAnotherBtn onClick={addNewFamily} />
      </div>
    ),
    'emergency': (
      <EmergencyDetails formikProps={formikProps} />
    ),
    'bank': (
      <BankInfo formikProps={formikProps} userId={values?.userId} />
    ),
    'address': (
      <div className="ob-repeating-section">
        <AddressInfo formikProps={formikProps} />
      </div>
    ),
    'meal': (
      <MealPreferences formikProps={formikProps} />
    ),
  };

  const sectionIcons: Record<string, React.ReactNode> = {
    'personal-info': <User size={17} />,
    'contact-info':  <Phone size={17} />,
    'education':     <GraduationCap size={17} />,
    'family':        <Users size={17} />,
    'emergency':     <ShieldAlert size={17} />,
    'bank':          <Landmark size={17} />,
    'address':       <MapPin size={17} />,
    'meal':          <User size={17} />,
  };

  const currentSectionIdx = ALL_SECTION_IDS.indexOf(activeSection);
  const isFirstSection = currentSectionIdx <= 0;
  const isLastSection = currentSectionIdx >= ALL_SECTION_IDS.length - 1;

  const goNextSection = () => {
    if (!isLastSection) onSectionChange(ALL_SECTION_IDS[currentSectionIdx + 1]);
  };

  const goPrevSection = () => {
    if (!isFirstSection) onSectionChange(ALL_SECTION_IDS[currentSectionIdx - 1]);
  };

  const nextSectionLabel = !isLastSection
    ? SECTION_LABELS[ALL_SECTION_IDS[currentSectionIdx + 1]]
    : '';

  const activeCmp = cmp(activeSection);

  return (
    <div className="w-100 ob-step-section-shell">
      {/* Welcome banner */}
      <AnimatePresence>
        {showBanner && (
          <WelcomeBanner
            firstName={values.firstName || ''}
            profilePct={profilePct}
            onDismiss={() => setShowBanner(false)}
          />
        )}
      </AnimatePresence>

      {/* Single active section — animated on change */}
      <AnimatePresence mode="wait">
        <motion.div
          className="ob-section-motion"
          key={activeSection}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
        >
          <SectionCard
            id={activeSection}
            title={SECTION_LABELS[activeSection] || activeSection}
            icon={sectionIcons[activeSection]}
            filled={activeCmp.filled}
            total={activeCmp.total}
          >
            {sectionContent[activeSection]}
          </SectionCard>
        </motion.div>
      </AnimatePresence>

      {/* Floating section navigation buttons */}
      <div className="ob-floating-section-nav">
        <span className="ob-float-step-hint">
          {currentSectionIdx + 1} / {ALL_SECTION_IDS.length}
        </span>

        <button
          type="button"
          className="ob-float-btn ob-float-back"
          onClick={goPrevSection}
          disabled={isFirstSection}
        >
          ← Back
        </button>

        {isLastSection ? (
        <button
          type="button"
          className="ob-float-btn ob-float-continue"
          onClick={() => {
            // directly trigger formik submit which goes to submitStep
            const form = document.getElementById('employee_onboarding_form') as HTMLFormElement;
            if (form) form.requestSubmit();
          }}
        >
          Continue to Company Details →
        </button>
      ) : (
          <button
            type="button"
            className="ob-float-btn ob-float-continue"
            onClick={goNextSection}
          >
            Next: {nextSectionLabel} →
          </button>
        )}
      </div>
    </div>
  );
}

export default Step2;
