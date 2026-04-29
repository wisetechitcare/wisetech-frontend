import { useEffect, useState } from "react";
import TextInput from "app/modules/common/inputs/TextInput";
import FileInput from "app/modules/common/inputs/FileInput";

function Documents({ formikProps, index, setFile }: any) {
    const { values: { documentFields, documentInfo } } = formikProps;
    const docField = documentFields[index];
    const [showInfo, setShowInfo] = useState(false);
    
    // Find the correct document info index based on documentId
    let documentInfoIndex = documentInfo?.findIndex((doc: any) => doc.documentId === docField.id);
    
    // If not found, use the current index as fallback
    if(documentInfoIndex === -1) {
        documentInfoIndex = index;
    }
    
    const element = documentInfo[documentInfoIndex];
    const { id, fieldName, hasIdentityNumber } = docField;
    
    console.log("Documents component - documentInfo:: ", documentInfo);
    console.log("Documents component - documentInfoIndex:: ", documentInfoIndex);
    console.log("Documents component - current element:: ", element);
    console.log("Documents component - element identityNumber:: ", element?.identityNumber);
    console.log("Documents component - formik field path:: ", `documentInfo[${documentInfoIndex}].identityNumber`);
    
    useEffect(() => {
        console.log(`Documents component ${index} - documentInfo changed:: `, documentInfo);
        console.log(`Documents component ${index} - element changed:: `, element);
    }, [documentInfo, element, index]);
    
    // debugger;
    return (
        <>
            <div className="row">
                <div className="col-lg-3">
                    <div className='d-flex flex-column mb-7 fv-row py-5'>
                        <label className='fs-6 fw-bold form-label'>{fieldName}</label>
                    </div>
                </div>

                <div className="col-lg-3">
                    {/* <TextInput
                        isRequired={false}
                        margin="mb-7"
                        placeholder={`${hasIdentityNumber ? 'Enter Number' : '-'}`}
                        formikField={fieldName.toLowerCase().trim().replace(' ', '')=='aadharcard' ?'aadharNumber' : 'panNumber'} /> */}
                    <TextInput
                        isRequired={false}
                        margin="mb-7"
                        placeholder={`${hasIdentityNumber ? 'Enter Number' : '-'}`}
                        formikField={`documentInfo[${documentInfoIndex}].identityNumber`} />
                </div>

                {/* File upload field with info message */}
                <div className="col-lg-6">
                    {!formikProps.values.userId && showInfo && (
                        <div className="alert alert-info d-flex align-items-center p-3 mb-2" role="alert">
                            <i className="bi bi-info-circle fs-5 me-2"></i>
                            <small>
                                <strong>Info:</strong> Please save the user details first before uploading documents.
                            </small>
                        </div>
                    )}
                    <FileInput
                        placeholder="Document"
                        documentId={id}
                        setFile={setFile}
                        disabled={!formikProps.values.userId}
                        onDisabledClick={() => setShowInfo(true)}
                        existingDocument={element}
                        fieldName={fieldName}
                    />
                </div>
            </div>
        </>
    );
}

export default Documents;