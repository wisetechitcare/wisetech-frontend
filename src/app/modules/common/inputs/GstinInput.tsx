import { useEffect, useRef } from "react";
import { getIn, useField, useFormikContext, type FormikValues } from "formik";
import TextInput from "./TextInput";
import { FieldDescription } from "@/ds/ui/field";
import { GST_STATE_CODES, gstStateCode, gstinPan, isValidGstin, typeGstin } from "@utils/gstin";

interface GstinInputProps {
  label?: string;
  required?: boolean;
  /** Formik field holding the GSTIN. */
  formikField?: string;
  /** Formik field set to the state the GSTIN registers (the server requires them to match). */
  stateField?: string;
  /** Formik field filled with the GSTIN's PAN — only when blank (PanInput flags a mismatch). */
  panField?: string;
}

/**
 * GSTIN input for any Formik form. Upper-cases and strips non-alphanumerics as typed;
 * at 15 characters it validates offline (format, state code, PAN, checksum — rules in
 * @utils/gstin) and fills the linked state/PAN fields. Pair with a Yup `gstinError` test
 * for the error message. "Valid" is structural only — not proof of registration.
 */
export default function GstinInput({ label = "GST Number", required = false, formikField = "gstNumber", stateField, panField }: GstinInputProps) {
  const { values, setFieldValue, setFieldTouched } = useFormikContext<FormikValues>();
  const [{ value }] = useField<string>(formikField);
  const gstin = value ?? "";
  const valid = isValidGstin(gstin);
  const code = valid ? gstStateCode(gstin) : null;
  const stateName = code ? GST_STATE_CODES[code] : null;
  const pan = gstinPan(gstin);
  const currentPan = panField ? String(getIn(values, panField) ?? "").trim().toUpperCase() : "";

  // Skip the first render so opening a saved record never rewrites it.
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (gstin.length === 15) void setFieldTouched(formikField, true); // show the error now, not on blur
    if (!valid) return;
    if (stateField && getIn(values, stateField) !== stateName) void setFieldValue(stateField, stateName);
    if (panField && !currentPan) void setFieldValue(panField, pan);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gstin]);

  return (
    <div>
      <TextInput
        formikField={formikField}
        label={label}
        isRequired={required}
        placeholder="e.g. 27ABCDE1234F1Z5"
        parser={(v) => typeGstin(v, gstin)}
      />
      {valid && (
        <FieldDescription className="mt-1 text-success" title="Format and checksum verified offline — not a registration check">
          ✓ Valid GSTIN · {stateName} ({code}) · PAN {pan}
        </FieldDescription>
      )}
    </div>
  );
}
