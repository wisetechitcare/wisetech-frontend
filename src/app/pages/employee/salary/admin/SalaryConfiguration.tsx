import GrossPayDistribution from "./views/salary-configuration/GrossPayDistribution";
import DeductionRules from "./views/salary-configuration/DeductionRules";
import CustomRules from "./views/salary-configuration/CustomRules";
import GeneralSettings from "./views/salary-configuration/GeneralSettings";

const SalaryConfiguration = () => {
  return (
    <>
      <GeneralSettings />
      <GrossPayDistribution />
      <DeductionRules />
      <CustomRules />
    </>
  );
}

export default SalaryConfiguration;