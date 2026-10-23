import React from "react";
import {
  PersonOutlined,
  ContactPhoneOutlined,
  SchoolOutlined,
  GroupsOutlined,
  HealthAndSafetyOutlined,
  PlaceOutlined,
  RestaurantOutlined,
  WorkHistoryOutlined,
  BusinessCenterOutlined,
  UploadFileOutlined,
  PersonOutlineOutlined,
  FolderOutlined,
  BadgeOutlined,
} from "@mui/icons-material";
import type { WizardGroup } from '@/shared/form-engine';
import * as S from "../forms/onboarding/OnboardingSections";
import type { OnboardingSectionsProps } from "../forms/onboarding/OnboardingSections";
import { CandidateApplicationStrip } from "./CandidateApplicationStrip";
import { CandidateContactSection } from "./CandidateContactSection";
import { CandidateDocumentsSection } from "./CandidateDocumentsSection";
import { CandidateHiringSection } from "./CandidateHiringSection";
import { CandidateMealSection } from "./CandidateMealSection";
import { candidateHasContact } from "./candidateProfile";

interface BuildArgs {
  roleRequired: boolean;
  companyId?: string;
  resumeFile: File | null;
  onResumeFile: (file: File | null) => void;
  existingResumeName?: string | null;
  disabled?: boolean;
  /** Edit mode — shows blacklist toggle on Hiring Information. */
  isEdit?: boolean;
}

/**
 * Candidate-mode group tree — same shell as employee onboarding, filtered to
 * pre-hire sections only. Rail order: Personal → Background → Application → Documents.
 */
export function buildCandidateWizardGroups(args: BuildArgs): WizardGroup<OnboardingSectionsProps>[] {
  const stripRender = () => (
    <CandidateApplicationStrip
      roleRequired={args.roleRequired}
      companyId={args.companyId}
      disabled={args.disabled}
    />
  );

  const documentsRender = (p: OnboardingSectionsProps) => (
    <CandidateDocumentsSection
      {...p}
      resumeFile={args.resumeFile}
      onResumeFile={args.onResumeFile}
      existingResumeName={args.existingResumeName}
      disabled={args.disabled}
    />
  );

  return [
    {
      id: "personal",
      label: "Personal Details",
      icon: <PersonOutlineOutlined />,
      children: [
        {
          id: "personal-info",
          label: "Personal Information",
          title: "Personal Information",
          subtitle: "Photo, legal name and key dates",
          icon: <PersonOutlined />,
          // bloodGroup lives on Health & Emergency — do not double-count on this leaf's rail.
          fields: ["avatar", "firstName", "lastName", "dateOfBirth", "gender", "maritalStatus", "anniversary"],
          requiredFields: ["firstName"],
          render: (p) => <S.PersonalInfoSection {...p} />,
        },
        {
          id: "contact-info",
          label: "Contact Information",
          title: "Contact Information",
          subtitle: "At least one of email or phone",
          icon: <ContactPhoneOutlined />,
          fields: [
            "personalEmailId",
            "personalPhoneNumber",
            "personalPhoneNumberExtension",
            "alternatePhoneNumber",
            "linkedInProfileUrl",
            "instagramProfileUrl",
            "facebookProfileUrl",
          ],
          isComplete: (v) => candidateHasContact(v),
          render: (p) => <CandidateContactSection {...p} />,
        },
        {
          id: "education",
          label: "Education Details",
          title: "Education Details",
          subtitle: "Qualifications, institutes and certificates",
          icon: <SchoolOutlined />,
          fields: ["educationalInfo"],
          render: (p) => <S.EducationSection {...p} />,
        },
        {
          id: "family",
          label: "Family Details",
          title: "Family Details",
          subtitle: "Dependants and relatives on record",
          icon: <GroupsOutlined />,
          fields: ["familyInfo"],
          render: (p) => <S.FamilySection {...p} />,
        },
        {
          id: "emergency",
          label: "Health & Emergency Info",
          title: "Health & Emergency Info",
          subtitle: "Blood group, allergies and who to call",
          icon: <HealthAndSafetyOutlined />,
          fields: ["emergencyDetails"],
          render: (p) => <S.EmergencySection {...p} />,
        },
        {
          id: "address",
          label: "Address Details",
          title: "Address Details",
          subtitle: "Current and permanent address",
          icon: <PlaceOutlined />,
          fields: ["addressInfo"],
          render: (p) => <S.AddressSection {...p} />,
        },
        {
          id: "meal",
          label: "Additional Details",
          title: "Additional Details",
          subtitle: "Dietary preference",
          icon: <RestaurantOutlined />,
          fields: ["meal"],
          render: () => <CandidateMealSection disabled={args.disabled} />,
        },
      ],
    },
    {
      id: "background",
      label: "Background",
      icon: <WorkHistoryOutlined />,
      children: [
        {
          id: "work_experience",
          label: "Work Experience",
          title: "Work Experience",
          subtitle: "Prior employers — optional",
          icon: <WorkHistoryOutlined />,
          fields: ["workExpInfo"],
          render: (p) => <S.WorkExperienceSection {...p} />,
        },
        {
          id: "hiring_info",
          label: "Hiring Information",
          title: "Hiring Information",
          subtitle: "Proposed joining and referral",
          icon: <BusinessCenterOutlined />,
          fields: ["proposedJoiningDate", "referredById", ...(args.isEdit ? ["isBlacklisted"] : [])],
          render: () => (
            <CandidateHiringSection disabled={args.disabled} showBlacklist={Boolean(args.isEdit)} />
          ),
        },
      ],
    },
    {
      id: "application",
      label: "Application",
      icon: <BadgeOutlined />,
      children: [
        {
          id: "application-strip",
          label: "Role & screening",
          title: "Role & screening",
          subtitle: "Role, salary, notice and source",
          icon: <BadgeOutlined />,
          // Hiring facts only — identity lives on Personal Information / Contact.
          fields: [
            "requisitionId",
            "currentCtc",
            "expectedCtc",
            "totalExperienceMonths",
            "noticePeriodDays",
            "employeeLevelId",
            "sourceId",
            "currentTitle",
            "currentEmployer",
          ],
          requiredFields: args.roleRequired ? ["requisitionId"] : undefined,
          render: stripRender as unknown as (p: OnboardingSectionsProps) => React.ReactNode,
        },
      ],
    },
    {
      id: "documents",
      label: "Documents",
      icon: <FolderOutlined />,
      children: [
        {
          id: "upload_docs",
          label: "Documents",
          title: "Documents",
          subtitle: "Resume and identity documents",
          icon: <UploadFileOutlined />,
          fields: ["documentInfo"],
          render: documentsRender,
        },
      ],
    },
  ];
}
