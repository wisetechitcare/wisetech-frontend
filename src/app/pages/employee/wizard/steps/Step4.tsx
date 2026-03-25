import { useEffect } from "react";
import { fetchDocumentsField } from "@services/employee";
import FormHeading from "app/modules/common/utils/FormHeading";
import Documents from "../forms/Documents";

const createInitialDocumentInfo = (documentId: string) => ({
    identityNumber: "",
    employeeId: "",
    documentId: documentId,
    path: "",
    fileName: "",
})

function Step4({ formikProps, setFile }: any) {
    const { values: { documentFields, documentInfo: docInfo }, setFieldValue } = formikProps;
    // console.log("documentFields:: ", documentFields);
    // console.log("docInfo:: ", docInfo);
    
    useEffect(() => {
        async function getAllDocFields() {
            const { data: { documents } } = await fetchDocumentsField();
            
            const enabledDocuments = documents.filter((doc: any) => doc.isEnabled);
            setFieldValue('documentFields', enabledDocuments, true);
            // console.log("documentsgetAllDocFieldsenabledDocuments:: ", enabledDocuments);
            // console.log("current docInfo before processing:: ", docInfo);
            
            // Create document info array with proper documentId mapping
            const documentInfo = enabledDocuments.map((doc: any) => 
                createInitialDocumentInfo(doc.id)
            );
            
            // console.log("created documentInfo:: ", documentInfo);
            
            // Only set new documentInfo if current docInfo is empty or doesn't match enabled documents
            if (!docInfo || docInfo.length === 0 || docInfo.length !== enabledDocuments.length) {
                // console.log("Setting new documentInfo because docInfo is empty or length mismatch");
                setFieldValue('documentInfo', documentInfo, true);
            } else {
                // console.log("Updating existing docInfo with proper documentId mapping");
                // Ensure existing docInfo has proper documentId mapping
                const updatedDocInfo = docInfo.map((doc: any, index: number) => ({
                    ...doc,
                    documentId: doc.documentId || enabledDocuments[index]?.id
                }));
                console.log("updatedDocInfo:: ", updatedDocInfo);
                setFieldValue('documentInfo', updatedDocInfo, true);
            }
        }

        getAllDocFields();
    }, []);

    return (
        <>
            <div className="w-100">
                {/** Upload Documents Starts */}
                <div style={{ marginBottom: '20px' }}>
                    <FormHeading headingText="Upload Documents" padding="mb-3" variant="decorated" />
                    <div style={{ backgroundColor: '#ffffff', padding: '28px 25px', borderRadius: '12px' }}>
                        <p className="mb-4">
                            <strong>Note:</strong> Please upload only PDF files. Other file types such as images will not be accepted.
                        </p>
                        <div style={{ borderLeft: '1px solid #7A8597', paddingLeft: '25px', paddingTop: '12px', paddingBottom: '12px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            {documentFields?.map((_: any, index: number) => (
                                <div key={`documentFields-${index}`}>
                                    <Documents formikProps={formikProps} index={index} setFile={setFile} />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                {/** Upload Documents Ends */}
            </div>
        </>
    );
}

export default Step4;