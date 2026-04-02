import DateInput from "app/modules/common/inputs/DateInput";
import TextInput from "app/modules/common/inputs/TextInput";
import { IconButton } from '@mui/material';
import { Close } from '@mui/icons-material';

function RejoinHistory({ formikProps, index, onRemove }: any) {
    const element = `rejoinHistory[${index}]`;
 
    return (
        <>
        <div className=" mb-4 d-flex align-items-end justify-content-end">
                    {index > 0 && (
                        <IconButton className="flex-end"
                            onClick={() => onRemove(index)}
                            title="Remove this entry"
                            sx={{
                                color: '#9D4141',
                                '&:hover': {
                                    backgroundColor: 'rgba(0, 0, 0, 0.04)',
                                },
                            }}
                        >
                            <Close />
                        </IconButton>
                    )}
                </div>
            <div className={`row ${index !== 0 ? '' : ''}`}>
                <div className="col-lg-4 mb-4">
                    <DateInput
                        formikField={`${element}.dateOfReJoining`}
                        isRequired={false}
                        formikProps={formikProps}
                        inputLabel="Date Of Re-Joining (optional)"
                        placeHolder="Date Of Re-Joining"
                        maxDate={true}/>
                </div>

                <div className="col-lg-4 mb-4">
                    <DateInput
                        formikField={`${element}.dateOfReExit`}
                        isRequired={false}
                        formikProps={formikProps}
                        inputLabel="Date Of Re-Exit (optional)"
                        placeHolder="Date Of Re-Exit" />
                </div>

                <div className="col-lg-4 mb-4">
                    <TextInput
                        isRequired={false}
                        label="Reason (optional)"
                        margin="mb-4"
                        formikField={`${element}.reason`} />
                </div>

                
            </div>
        </>
    );
}

export default RejoinHistory;