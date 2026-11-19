import React, { useEffect } from "react";
import { useFormikContext } from "formik";
import * as Yup from "yup";
import TextInput from "@app/modules/common/inputs/TextInput";
import GstinInput from "@app/modules/common/inputs/GstinInput";
import DragDropFileField from "@app/modules/common/components/DragDropFileField";
import { uploadCompanyAsset } from "@services/uploader";
import { FieldLegend, FieldSeparator, FieldSet } from "@/ds/ui/field";
import PanInput from "@app/modules/common/inputs/PanInput";
import { GST_STATE_CODES, gstStateCode, gstinError, gstinStateMismatch, isValidGstin, panError } from "@utils/gstin";

/**
 * GST & Statutory, shared by the company and sub-company forms so the two cannot drift:
 * GSTIN + PAN, their documents, and the GST address (street line + state, the state
 * pinned to the one the GSTIN registers). The server checks the same GSTIN/state rule.
 */

type GstValues = {
  gstNumber?: string;
  panNumber?: string;
  gstAddress?: string;
  gstState?: string;
  gstDocument?: string;
  panDocument?: string;
};

/** Yup rules for the step — spread into a form's validation schema. */
export const GST_VALIDATION = {
  gstNumber: Yup.string().test("gstin", function (v) {
    const message = v?.trim() ? gstinError(v) : null;
    return message ? this.createError({ message }) : true;
  }),
  // A GSTIN is built on its holder's PAN, so the two must agree.
  panNumber: Yup.string().test("pan", function (v) {
    const message = panError(v, this.parent.gstNumber);
    return message ? this.createError({ message }) : true;
  }),
  // Same rule the server enforces: the GST state is the one the GSTIN's code registers.
  gstState: Yup.string().test("gstin-state", function (v) {
    const message = gstinStateMismatch(this.parent.gstNumber, v);
    return message ? this.createError({ message }) : true;
  }),
};

/** Empty values for a new record. */
export const EMPTY_GST_VALUES = {
  gstNumber: "", panNumber: "", gstAddress: "", gstState: "", gstDocument: "", panDocument: "",
};

/** A saved record's GST values, for a form's initial values. */
export const gstValuesOf = (record: GstValues | null | undefined) => ({
  gstNumber: record?.gstNumber || "",
  panNumber: record?.panNumber || "",
  gstAddress: record?.gstAddress || "",
  gstState: record?.gstState || "",
  gstDocument: record?.gstDocument || "",
  panDocument: record?.panDocument || "",
});

/** GSTIN input; keeps the GST state in step and fills a blank PAN. */
export const GstNumberField: React.FC<{ label: string; required?: boolean }> = ({ label, required }) => (
  <GstinInput label={label} required={required} formikField="gstNumber" stateField="gstState" panField="panNumber" />
);

/** PAN input; offers the GSTIN's PAN when they differ. */
export const PanNumberField: React.FC<{ label: string; required?: boolean }> = ({ label, required }) => (
  <PanInput label={label} required={required} formikField="panNumber" gstinField="gstNumber" />
);

/**
 * GST state: read-only, always the state the GSTIN registers. Also corrects a saved
 * record whose state disagrees with its valid GSTIN, since the user can't edit it.
 */
export const GstStateField: React.FC<{ label: string; required?: boolean }> = ({ label, required }) => {
  const { values, setFieldValue } = useFormikContext<GstValues>();
  const code = isValidGstin(values.gstNumber) ? gstStateCode(values.gstNumber) : null;
  const derived = code ? GST_STATE_CODES[code] : null;
  useEffect(() => {
    if (derived && values.gstState !== derived) void setFieldValue("gstState", derived);
  }, [derived, values.gstState, setFieldValue]);
  return (
    <TextInput
      formikField="gstState"
      label={code ? `${label} (${code})` : label}
      isRequired={!!required}
      readonly
      placeholder="Filled from the GST number"
    />
  );
};

/** GST or PAN document upload. */
export const StatutoryDocumentField: React.FC<{ field: "gstDocument" | "panDocument"; label: string; required?: boolean }> = ({
  field, label, required,
}) => {
  const { values, setFieldValue } = useFormikContext<GstValues>();
  const url = values[field];
  return (
    <DragDropFileField
      label={label}
      required={!!required}
      compact
      labelClassName="fs-6 form-label mb-2"
      currentFileUrl={url}
      currentFileName={url ? url.split("/").pop() : ""}
      uploadFn={uploadCompanyAsset}
      onChange={(next) => setFieldValue(field, next)}
    />
  );
};

/** Reboot floats `legend` and sizes it unlayered, so the kit legend needs `!` to keep its look. */
const LEGEND = "float-none! mb-3! text-[13px]! font-semibold text-muted-foreground";

/** The whole step: GST and PAN as two separate, stacked groups. */
export const GstStatutoryFields: React.FC = () => (
  <div className="flex flex-col gap-5">
    <FieldSet className="gap-0">
      <FieldLegend className={LEGEND}>GST Details</FieldLegend>
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12"><GstNumberField label="GST Number" /></div>
        <div className="col-span-12"><StatutoryDocumentField field="gstDocument" label="GST Document" /></div>
        <div className="col-span-12"><TextInput formikField="gstAddress" label="GST Address" isRequired={false} /></div>
        <div className="col-span-12"><GstStateField label="GST State" /></div>
      </div>
    </FieldSet>
    <FieldSeparator />
    <FieldSet className="gap-0">
      <FieldLegend className={LEGEND}>PAN Details</FieldLegend>
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12"><PanNumberField label="PAN Number" /></div>
        <div className="col-span-12"><StatutoryDocumentField field="panDocument" label="PAN Document" /></div>
      </div>
    </FieldSet>
  </div>
);
