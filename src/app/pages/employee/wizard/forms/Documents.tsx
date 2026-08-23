import { useState } from "react";
import { FileCheck2, FileText } from "lucide-react";
import TextInput from "@app/modules/common/inputs/TextInput";
import FileInput from "@app/modules/common/inputs/FileInput";
import { AppIcon } from '@app/modules/common/components/ui/AppIcon';

/**
 * One configured onboarding document type, rendered as an ATTACHMENT FIELD.
 *
 * The type itself (its name, and whether it carries an identity number) is
 * configuration owned by Company → Onboarding Docs; this component only collects
 * what the employee supplies against it. So the row is presented as a labelled
 * attachment card — name, optional number, dropzone, attached/pending state —
 * rather than the three bare columns it used to be, where a type with no identity
 * number still got an empty text box holding a "-" placeholder.
 */
function Documents({ formikProps, index, setFile }: any) {
    const { values: { documentFields, documentInfo } } = formikProps;
    const docField = documentFields[index];
    const [showInfo, setShowInfo] = useState(false);

    // Row order follows the configured list (OnboardingWorkspace keeps them
    // aligned), but match on documentId anyway so a legacy record saved in a
    // different order still finds its own row instead of another type's.
    let documentInfoIndex = documentInfo?.findIndex((doc: any) => doc.documentId === docField.id);
    if (documentInfoIndex === -1) {
        documentInfoIndex = index;
    }

    const element = documentInfo?.[documentInfoIndex];
    const { id, fieldName, hasIdentityNumber } = docField;
    const isAttached = Boolean(element?.path || element?.fileName);

    const identityFieldPath = `documentInfo[${documentInfoIndex}].identityNumber`;

    return (
        <div className="ob-doc-card">
            <div className="ob-doc-card-head">
                {/* lucide, matching the icons inside the upload field below — the
                    Bootstrap icon font renders at a different optical weight and looked
                    like a stray mark beside them. The glyph doubles as the state cue:
                    a plain document until something is on file, a checked one after. */}
                <span className={`ob-doc-card-icon${isAttached ? " is-attached" : ""}`} aria-hidden>
                    {isAttached ? <FileCheck2 size={16} /> : <FileText size={16} />}
                </span>
                {/* The type's name comes from Onboarding Docs — it names the card, while
                    the inputs below carry their own labels. */}
                <span className="ob-doc-card-name">{fieldName}</span>
                <span className={`ob-doc-card-state${isAttached ? " is-attached" : ""}`}>
                    {isAttached ? "Attached" : "Not attached"}
                </span>
            </div>

            {/* Info banner belongs to the whole card, not to one of its columns —
                the upload is disabled until the employee record exists. */}
            {!formikProps.values.userId && showInfo && (
                <div className="ob-doc-card-note" role="status">
                    <AppIcon name="bi-info-circle" aria-hidden />
                    <span>Save the employee&apos;s details first, then upload documents here.</span>
                </div>
            )}

            <div className={`ob-doc-card-body${hasIdentityNumber ? "" : " is-file-only"}`}>
                {hasIdentityNumber && (
                    <TextInput
                        isRequired={false}
                        margin="mb-0"
                        label="Document Number"
                        placeholder="Enter number"
                        formikField={identityFieldPath} />
                )}

                <div className="ob-doc-card-file">
                    <FileInput
                        placeholder="Document"
                        documentId={id}
                        setFile={setFile}
                        disabled={!formikProps.values.userId}
                        onDisabledClick={() => setShowInfo(true)}
                        existingDocument={element}
                        fieldName={fieldName}
                        onboardingStyle
                    />
                </div>
            </div>
        </div>
    );
}

export default Documents;
