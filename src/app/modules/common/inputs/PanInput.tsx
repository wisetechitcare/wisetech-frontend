import { useEffect, useRef } from "react";
import { getIn, useField, useFormikContext, type FormikValues } from "formik";
import TextInput from "./TextInput";
import { Button } from "@/ds/ui/button";
import { gstinPan, typePan } from "@utils/gstin";

interface PanInputProps {
  label?: string;
  required?: boolean;
  /** Formik field holding the PAN. */
  formikField?: string;
  /** Formik field holding a GSTIN; when it's valid and its PAN differs, offers a one-click fix. */
  gstinField?: string;
}

/**
 * PAN input for any Formik form: only letters/digits in their PAN positions (AAAAA9999A),
 * max 10. Pair with a Yup `panError` test for the message.
 */
export default function PanInput({ label = "PAN Number", required = false, formikField = "panNumber", gstinField }: PanInputProps) {
  const { values, setFieldValue, setFieldTouched } = useFormikContext<FormikValues>();
  const [{ value }] = useField<string>(formikField);
  const pan = value ?? "";
  const fromGstin = gstinField ? gstinPan(getIn(values, gstinField)) : null;

  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (pan.length === 10) void setFieldTouched(formikField, true); // show the error now, not on blur
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pan]);

  return (
    <div>
      <TextInput formikField={formikField} label={label} isRequired={required} placeholder="e.g. ABCDE1234F" parser={(v) => typePan(v, pan)} />
      {fromGstin && pan && pan.toUpperCase() !== fromGstin && (
        <Button type="button" variant="outline" size="xs" className="mt-2" onClick={() => void setFieldValue(formikField, fromGstin)}>
          Use {fromGstin} from GST number
        </Button>
      )}
    </div>
  );
}
