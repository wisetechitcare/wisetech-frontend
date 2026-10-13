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
import type { OnboardingGroup } from "../forms/onboarding/OnboardingWizard";
import * as S from "../forms/onboarding/OnboardingSections";
import type { OnboardingSectionsProps } from "../forms/onboarding/OnboardingSections";
import { CandidateApplicationStrip } from "./CandidateApplicationStrip";
import { CandidateHiringSection } from "./CandidateHiringSection";

interface BuildArgs {
  roleRequired: boolean;
  companyId?: string;
  resumeFile: File | null;
  onResumeFile: (file: File | null) => void;
  existingResumeName?: string | null;
  disabled?: boolean;
}

/**
 * Candidate-mode group tree — same shell as employee onboarding, filtered to
 * pre-hire sections only. Application strip is first (hiring facts).
 */
export function buildCandidateWizardGroups(args: BuildArgs): OnboardingGroup[] {
  const stripRender = () => (
    <CandidateApplicationStrip
      roleRequired={args.roleRequired}
      companyId={args.companyId}
      resumeFile={args.resumeFile}
      onResumeFile={args.onResumeFile}
      existingResumeName={args.existingResumeName}
      disabled={args.disabled}
    />
  );

  return [
    {
      id: "application",
      label: "Application",
      icon: <BadgeOutlined />,
      children: [
        {
          id: "application-strip",
          label: "Role & screening",
          title: "Role & screening",
          subtitle: "Role, salary, notice, source and resume",
          icon: <BadgeOutlined />,
          fields: ["requisitionId", "firstName", "personalEmailId", "personalPhoneNumber"],
          requiredFields: ["firstName"],
          render: stripRender as unknown as (p: OnboardingSectionsProps) => React.ReactNode,
        },
      ],
    },
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
          fields: ["avatar", "firstName", "lastName", "dateOfBirth", "gender", "maritalStatus", "anniversary", "bloodGroup"],
          requiredFields: ["firstName"],
          render: (p) => <S.PersonalInfoSection {...p} />,
        },
        {
          id: "contact-info",
          label: "Contact Information",
          title: "Contact Information",
          subtitle: "Personal email, phone and social profiles",
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
          render: (p) => <S.ContactInfoSection {...p} />,
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
          render: (p) => <S.AdditionalDetailsSection {...p} />,
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
          fields: ["proposedJoiningDate", "referredById"],
          render: () => <CandidateHiringSection disabled={args.disabled} />,
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
          label: "Upload Documents",
          title: "Upload Documents",
          subtitle: "Identity docs from company Onboarding Docs (Aadhaar, PAN, …) — optional until offer",
          icon: <UploadFileOutlined />,
          fields: ["documentInfo"],
          render: (p) => <S.DocumentsSection {...p} />,
        },
      ],
    },
  ];
}
