import TextInput from '@app/modules/common/inputs/TextInput';
import React, { useEffect, useState } from 'react'
import { useFormik, Field, FormikProvider, Formik, Form, ErrorMessage } from "formik";
import { Container, Row } from 'react-bootstrap';
import { KTCard, KTCardBody } from '@metronic/helpers';
import { fetchCompanySettings, updateCompanySettings } from '@services/options';
import { errorConfirmation, successConfirmation } from '@utils/modal';
import { fetchLeaveOptions, updateLeaveOptionsById } from '@services/company';

function GeneralSettings() {
    const [loading, setLoading] = useState(false);
    // const [attendanceRequestLimitCount, setAttendanceRequestLimitCount] = useState(0);
    const [allowedDistanceFromOffice, setAllowedDistanceFromOffice] = useState(0);
    const [appSettingsId, setAppSettingsId] = useState('');
    const [leaveOptions, setLeaveOptions] = useState([])
    const [leaveOptionInitialValues, setLeaveOptionInitialValues] = useState([])
    const [isLoading, setIsLoading] = useState(true);
    const [leaveOptionsGroupedByBranchId, setLeaveOptionsGroupedByBranchId] = useState<any>({});
    const [branchNameMappedWithId, setBranchNameMappedWithId] = useState<Map<string, any>>()

    useEffect(() => {
        async function fetchAllSettings() {
            try {
                setIsLoading(true);
    
                const [companySettingsRes, leaveOptionsRes] = await Promise.all([
                    fetchCompanySettings(),
                    fetchLeaveOptions()
                ]);

                // Handle company settings
                const appSettings = companySettingsRes.data?.appSettings;
                // setAttendanceRequestLimitCount(appSettings?.attendanceRequestRaiseLimit || 0);
                setAllowedDistanceFromOffice(appSettings?.distanceAllowedInMeters || 0);
                setAppSettingsId(appSettings?.id);
    
                // Handle leave options
                const leaveOptionsData = leaveOptionsRes.data?.leaveOptions || [];
                // get branchs id and name from leave options
                const branchIds = new Map();
                leaveOptionsData.forEach((leaveOption: any) => {
                    if (leaveOption?.branchId) {
                        branchIds.set(leaveOption?.branchId, { id: leaveOption?.branch?.id, name: leaveOption?.branch?.name});
                    }
                });
                setBranchNameMappedWithId(branchIds);
                
                // seperate leave options based on branches
                const leaveOptionsGroupedByBranch: any = {};
                leaveOptionsData.forEach((leaveOption: any) => {
                    if (leaveOption?.branchId) {
                        if (!leaveOptionsGroupedByBranch[leaveOption?.branchId]) {
                            leaveOptionsGroupedByBranch[leaveOption?.branchId] = [];
                        }
                        leaveOptionsGroupedByBranch[leaveOption?.branchId].push(leaveOption);
                    }
                });

                const sortedLeaveOptions = Object.fromEntries(
                    Object.entries(leaveOptionsGroupedByBranch).map(([branchId, leaves]) => [
                        branchId,
                        [...leaves as any].sort((a: any, b: any) => {
                            const leaveTypeA = a?.leaveType?.toLowerCase() || '';
                            const leaveTypeB = b?.leaveType?.toLowerCase() || '';
                            return leaveTypeA.localeCompare(leaveTypeB);
                        })
                    ])
                );
                setLeaveOptionsGroupedByBranchId(sortedLeaveOptions);
                setLeaveOptions(leaveOptionsData);
                const finalLeaveOptions = leaveOptionsData.map((leaveOption: any) => ({
                    [`${leaveOption?.id}`]: Number(leaveOption?.numberOfDays)
                }));
                setLeaveOptionInitialValues(finalLeaveOptions);
    
            } catch (error) {
                console.error("Error fetching settings:", error);
            } finally {
                setIsLoading(false);
            }
        }
    
        fetchAllSettings();
    }, []);
    

    if (isLoading) {
            return <Container fluid className="my-4 w-100 px-0 d-flex justify-content-center align-items-center" style={{ minHeight: '300px' }}>
                        <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Loading...</span>
                        </div>
                    </Container>
        }


    return (
        <Formik
            enableReinitialize={true}
            //   validationSchema={validationSchema}
            initialValues={{
                // attendanceRequestLimit: attendanceRequestLimitCount,
                allowedDistanceFromOffice: allowedDistanceFromOffice,
                ...(leaveOptionInitialValues?.length>0 ? Object.assign({}, ...leaveOptionInitialValues) : {})
            }}
            onSubmit={ async (values) => {
                setLoading(true);
                try {
                    // 1. update appsettings through api call, if the data is updated
                    const data = {
                        // attendanceRequestRaiseLimit: values.attendanceRequestLimit,
                        distanceAllowedInMeters: Number(values.allowedDistanceFromOffice)
                    }
                    // console.log("data:: ", data);
                    const res = await updateCompanySettings(data, appSettingsId);
                    // const res = {hasError: false};
                    if (res?.hasError) {
                        errorConfirmation("Failed to update Appsettings");
                        return;
                    }

                    // 2. updated leaves limit if the data is updated
                    let leaveData = Object.entries(values).filter(([key, value]) => key !== 'attendanceRequestLimit' && key !== 'allowedDistanceFromOffice' && key);
                    // console.log("leaveData:: ", leaveData);
                    const allCall: Promise<any>[] = [];
                    leaveData = leaveData.filter(([key, value]) => key && value);

                    
                    leaveData.forEach(async val=>{
                        const leaveId = val[0];
                        const data = leaveOptions.filter((val: any)=>val?.id == leaveId);
                        if(Array.isArray(data) && data?.length>0 && leaveId){
                            const leaveData = data[0] as any;
                            delete leaveData?.branch;
                            delete leaveData?.canApprove;

                            allCall.push(updateLeaveOptionsById(leaveId, {...leaveData as any,numberOfDays: values[leaveId]}))
                        }
                    })

                    const result = await Promise.all(allCall)
                    // console.log("result:: ", result);
                    for(let i=0;i<result?.length;i++){
                        if(result[i]?.hasError){
                            errorConfirmation("Failed to update app settings");
                            return;
                        }
                    }
                    
                } catch (err) {
                    errorConfirmation("Failed to update app settings");
                    console.log(err);
                    return;
                } finally {
                    setLoading(false);
                }
                successConfirmation("App Settings Updated Successfully!");
            }}
        >
            {({ setFieldValue, initialValues }) => {
               
                useEffect(() => {
                    // setFieldValue('attendanceRequestLimit', attendanceRequestLimitCount);
                    setFieldValue('allowedDistanceFromOffice', allowedDistanceFromOffice);
                    if(leaveOptionInitialValues?.length>0){
                        leaveOptionInitialValues.forEach((leaveOption: any) => {
                            setFieldValue(leaveOption?.id, Number(leaveOption?.numberOfDays));
                        })
                    }
                }, [allowedDistanceFromOffice]);
                // }, [attendanceRequestLimitCount, allowedDistanceFromOffice]);
                return (
                    <Form className="form" placeholder={''}>
                        {/* Attendance Request Limit */}
                        {/* <div className="row  px-3">
                            <div className="col-lg-12 fv-row">
                                <TextInput
                                    isRequired={true}
                                    label="Attendance Request Limit"
                                    margin="mb-1"
                                    formikField="attendanceRequestLimit"
                                    inputTypeNumber={true} />
                            </div>
                        </div> */}
                        {/* Distance in meters from office for checkin */}
                        <div className="row px-3 my-4">
                         <h3>Checkin Distance</h3>
                            <div className="col-lg-12 fv-row my-4">
                                <TextInput
                                    isRequired={true}
                                    label="Allowed distance in meters from office for checkin"
                                    margin="mb-1"
                                    formikField="allowedDistanceFromOffice"
                                    inputTypeNumber={true} />
                            </div>
                        </div>

                        {/* <hr className="my-4" style={{width:"100%", height:"5px", backgroundColor:"#ccc"}}/>
                         */}
                        {/* Distance in meters from office for checkin */}
                        
                        <div className="row px-3 my-4">
                            <h3>Leave Type Request Limit</h3>
                            {Object.keys(leaveOptionsGroupedByBranchId)?.length>0 && Object.keys(leaveOptionsGroupedByBranchId)?.map((key:any,value:any)=>{
                                const branchData = branchNameMappedWithId?.get(key)
                                const branchName = branchData?.name
                                const branchId = branchData?.id
                                
                                return(
                                    <div key={branchId}>
                                        <div className="col-lg-12 fv-row my-4 p-3">
                                            <h5 className="text-muted fst-italic mb-3">Branch: {branchName}</h5>
                                            
                                            <div className="row">
                                                {leaveOptionsGroupedByBranchId[key].map((leaveOption: any, index:any) => {
                                                    return (
                                                        <div className="col-md-6" key={leaveOption?.id}>
                                                            <TextInput
                                                                isRequired={true}
                                                                label={leaveOption?.leaveType}
                                                                margin="mb-3"
                                                                formikField={`${leaveOption?.id}`}
                                                                inputTypeNumber={true} />
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                            
                                            <h6 className='text-muted fst-italic mt-2'>Total Paid Leaves: {leaveOptionsGroupedByBranchId[key].filter((val:any,index:any)=>!val.leaveType.toLowerCase().includes("unpaid")).reduce((acc: any, leaveOption: any) => acc + Number(leaveOption.numberOfDays), 0)}</h6>
                                        </div>
                                        
                                        {value < Object.keys(leaveOptionsGroupedByBranchId).length - 1 && (
                                            <hr className="my-4" />
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                        

                        <div className="row px-7 mb-0">
                            <div className="col-lg-12 text-end mb-5">
                                <button
                                    type="submit"
                                    className="btn btn-lg btn-primary"
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <span>
                                            Please wait...
                                            <span className="spinner-border spinner-border-sm align-middle ms-2"></span>
                                        </span>
                                    ) : (
                                        'Submit'
                                    )}
                                </button>
                            </div>
                        </div>

                    </Form>
                )
            }
            }</Formik>

    )
}


export default GeneralSettings