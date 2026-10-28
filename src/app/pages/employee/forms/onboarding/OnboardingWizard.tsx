import { EnterpriseFormWizard } from '@/shared/form-engine';
import type { GroupedWizardProps, WizardGroup, WizardLeaf } from '@/shared/form-engine/components/EnterpriseWizard/GroupedWizard';
import type { OnboardingSectionsProps } from './OnboardingSections';

/** @deprecated Use the shared wizard types and layout="sections". */
export type OnboardingLeaf = WizardLeaf<OnboardingSectionsProps>;
export type OnboardingGroup = WizardGroup<OnboardingSectionsProps>;
export type OnboardingWizardProps = GroupedWizardProps<OnboardingSectionsProps>;

/** Compatibility adapter; the shared engine owns navigation and validation. */
export function OnboardingWizard(props: OnboardingWizardProps) {
  return <EnterpriseFormWizard layout="sections" {...props} />;
}

export default OnboardingWizard;
