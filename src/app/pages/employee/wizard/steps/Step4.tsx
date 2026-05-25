import { useEffect, useState } from "react";
import { fetchDocumentsField } from "@services/employee";
import Documents from "../forms/Documents";
import WizardSectionLayout from "./WizardSectionLayout";
import "./Step2.css";

const createInitialDocumentInfo = (documentId: string) => ({
    identityNumber: "",
    employeeId: "",
    documentId: documentId,
    path: "",
    fileName: "",
});

function Step4({ formikProps, setFile, sidebarProfile }: any) {
    const { values: { documentFields, documentInfo: docInfo }, setFieldValue } = formikProps;
    const [activeSection, setActiveSection] = useState("upload_docs");

    useEffect(() => {
        async function getAllDocFields() {
            const { data: { documents } } = await fetchDocumentsField();
            const enabledDocuments = documents.filter((doc: any) => doc.isEnabled);
            setFieldValue('documentFields', enabledDocuments, true);

            // Create document info array with proper documentId mapping
            const documentInfo = enabledDocuments.map((doc: any) =>
                createInitialDocumentInfo(doc.id)
            );

            // Only set new documentInfo if current docInfo is empty or doesn't match enabled documents
            if (!docInfo || docInfo.length === 0 || docInfo.length !== enabledDocuments.length) {
                setFieldValue('documentInfo', documentInfo, true);
            } else {
                // Ensure existing docInfo has proper documentId mapping
                const updatedDocInfo = docInfo.map((doc: any, index: number) => ({
                    ...doc,
                    documentId: doc.documentId || enabledDocuments[index]?.id
                }));
                setFieldValue('documentInfo', updatedDocInfo, true);
            }
        }

        getAllDocFields();
    }, []);

    const sections = [
        { id: "upload_docs", title: "Upload Documents", icon: "file-up" }
    ];

    const sectionContent: Record<string, any> = {
        upload_docs: (
            <>
                <p className="mb-4">
                    <strong>Note:</strong> Please upload only PDF files. Other file types such as images will not be accepted.
                </p>
                <div className="ob-repeating-section">
                    {documentFields?.map((_: any, index: number) => (
                        <div key={`documentFields-${index}`}>
                            <Documents formikProps={formikProps} index={index} setFile={setFile} />
                        </div>
                    ))}
                </div>
            </>
        )
    };

    return (
        <WizardSectionLayout
            sections={sections}
            activeSection={activeSection}
            onSectionChange={setActiveSection}
            sidebarProfile={sidebarProfile}
        >
            {sectionContent[activeSection]}
        </WizardSectionLayout>
    );
}

export default Step4;
