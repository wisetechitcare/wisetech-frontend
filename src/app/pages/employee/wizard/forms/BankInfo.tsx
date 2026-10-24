import { DOCUMENT_ACCEPT, DOCUMENT_HINT } from "@utils/fileValidation";
import React, { useState } from "react";
import { getIn } from "formik";
import { WtFieldFormik } from "@app/modules/common/components/ui";
import { uploadUserAsset } from "@services/uploader";
import ObFileUpload from "../components/ObFileUpload";
import ObUploadStatus from "../components/ObUploadStatus";

function BankInfo({ formikProps, userId, setBankFile }: any) {
    const [uploadError, setUploadError] = useState("");
    const [isUploading, setIsUploading] = useState(false);

    /**
     * Attach the bank proof.
     *
     * During ONBOARDING there is no user to upload against yet, so the file is held
     * and written once the employee exists — the same deferred pattern the academic
     * certificate uses (`uploadBankDocument` in NewEmployeeWizard does the write).
     * Without this branch the control is disabled for the whole create flow and a
     * bank proof can only ever be added by editing the employee afterwards.
     */
    const handlePassbookFile = async (file: File | null) => {
        if (!file) {
            formikProps.setFieldValue("bankInfo.filePath", "");
            formikProps.setFieldValue("bankInfo.fileName", "");
            setBankFile?.(null);
            setUploadError("");
            return;
        }

        formikProps.setFieldValue("bankInfo.fileName", file.name, false);
        setUploadError("");

        if (!userId) {
            setBankFile?.(file);
            return;
        }

        const form = new FormData();
        form.append("file", file);
        try {
            setIsUploading(true);
            const {
                data: { path },
            } = await uploadUserAsset(form, userId, "passbook", "bank-docs");
            formikProps.setFieldValue("bankInfo.filePath", path, true);
        } catch (error) {
            setUploadError("Failed to upload file. Please try again.");
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="flex flex-col gap-4">
  {/* Row 1: Account Number, Account Holder Name */}
  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
    <div>
      <WtFieldFormik
        required={false}
        label="Account Number"
        name="bankInfo.accountNumber"
        type="number"
        maxLength={20}
      />
    </div>

    <div>
      <WtFieldFormik
        required={false}
        label="Account Holder Name"
        name="bankInfo.accountName"
      />
    </div>
  </div>

  {/* Row 2: IFSC Code, Bank Name, Attach Document */}
  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
    <div>
      <WtFieldFormik
        required={false}
        label="IFSC Code"
        name="bankInfo.ifscCode"
        maxLength={11}
      />
    </div>

    <div>
      <WtFieldFormik
        required={false}
        label="Bank Name"
        name="bankInfo.bankName"
      />
    </div>
  </div>

  {/* Row 3: Attach Document */}
  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
    <div>
      <label htmlFor="bank-passbook-upload" className="flex items-center text-sm font-medium mb-2">
        <span>Attach Document</span>
      </label>

      <ObFileUpload
        id="bank-passbook-upload"
        disabled={isUploading}
        accept={DOCUMENT_ACCEPT}
        hint={DOCUMENT_HINT}
        existingFileName={formikProps.values?.bankInfo?.fileName}
        existingFileUrl={formikProps.values?.bankInfo?.filePath || undefined}
        onChange={handlePassbookFile}
      />

      <ObUploadStatus
        state={
          isUploading
            ? "uploading"
            : formikProps.values?.bankInfo?.filePath
              ? "saved"
              : formikProps.values?.bankInfo?.fileName
                ? "pending"
                : "idle"
        }
        error={uploadError || undefined}
      />

      {getIn(formikProps.touched, "bankInfo.filePath") && getIn(formikProps.errors, "bankInfo.filePath") && (
        <div role="alert" className="text-sm text-red-600 mt-1">
          {getIn(formikProps.errors, "bankInfo.filePath")}
        </div>
      )}
    </div>
  </div>
</div>

    );
}

export default BankInfo;
