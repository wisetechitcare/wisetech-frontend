import { useMemo } from "react";
import CreatableSelect from "react-select/creatable";
import DropdownChevron from "@app/modules/common/inputs/DropdownChevron";

interface ReferrerOption {
  value: string;
  label: string;
}

interface ReferrerInputProps {
  formikProps: any;
  /** Colleagues, as `{ value: employeeId, label: name }`. */
  options: ReferrerOption[];
}

/**
 * Who referred this joiner — a colleague OR anyone else.
 *
 * Referrals routinely come from outside the company: a client, a consultant, a friend
 * of the founder. `referredById` is a foreign key into `employees` and can only ever
 * name staff, so a plain dropdown silently made those referrals unrecordable.
 *
 * Two fields back this one control, and they are mutually exclusive:
 *   · picking a colleague sets `referredById` and clears `referredByName`
 *   · typing a new name sets `referredByName` and clears `referredById`
 *
 * Keeping them separate (rather than overloading one column) means an internal
 * referral stays a real relation — joinable, renameable, and safe if the referrer's
 * own name changes later.
 */
const ReferrerInput: React.FC<ReferrerInputProps> = ({ formikProps, options }) => {
  const { values, setFieldValue } = formikProps;

  // Whichever of the two is set. A typed name has no id, so it is represented as an
  // option whose value IS the name — react-select needs a value to render a label.
  const selected = useMemo(() => {
    if (values?.referredById) {
      return options.find((option) => option.value === values.referredById) ?? null;
    }
    if (values?.referredByName) {
      return { value: values.referredByName, label: values.referredByName };
    }
    return null;
  }, [options, values?.referredById, values?.referredByName]);

  const handleChange = (option: any, meta: any) => {
    if (!option) {
      setFieldValue("referredById", "");
      setFieldValue("referredByName", "");
      return;
    }

    // `create-option` is react-select telling us this is typed text, not a pick.
    const isNew = meta?.action === "create-option" || !options.some((o) => o.value === option.value);
    if (isNew) {
      setFieldValue("referredByName", String(option.label ?? option.value).trim());
      setFieldValue("referredById", "");
    } else {
      setFieldValue("referredById", option.value);
      setFieldValue("referredByName", "");
    }
  };

  return (
    <div className="d-flex flex-column fv-row">
      <div className="d-flex flex-row justify-content-between align-items-center mb-2">
        <label className="d-flex align-items-center fs-6 form-label mb-0">Referred By</label>
      </div>
      <CreatableSelect
        name="referredBy"
        options={options}
        value={selected}
        onChange={handleChange}
        placeholder="Select a colleague, or type any other name"
        formatCreateLabel={(input: string) => `Use "${input}" (outside the company)`}
        isClearable
        isSearchable
        classNamePrefix="react-select"
        className="react-select-styled"
        components={{ DropdownIndicator: DropdownChevron }}
        menuPortalTarget={document.body}
        styles={{ menuPortal: (base: any) => ({ ...base, zIndex: 9999 }) }}
      />
    </div>
  );
};

export default ReferrerInput;
