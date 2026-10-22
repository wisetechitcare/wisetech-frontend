import { Box, IconButton } from '@mui/material';
import { Close } from '@mui/icons-material';
import { WtDateField, WtFieldFormik } from '@app/modules/common/components/ui';

function RejoinHistory({ formikProps, index, onRemove }: any) {
    const element = `rejoinHistory[${index}]`;
 
    return (
        <>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
                    {index > 0 && (
                        <IconButton className="flex-end"
                            onClick={() => onRemove(index)}
                            title="Remove this entry"
                            sx={{
                                color: '#1E3A8A',
                                '&:hover': {
                                    backgroundColor: 'rgba(0, 0, 0, 0.04)',
                                },
                            }}
                        >
                            <Close />
                        </IconButton>
                    )}
        </Box>
            <Box className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <WtDateField
                    label="Date Of Re-Joining (optional)"
                    value={formikProps.values?.rejoinHistory?.[index]?.dateOfReJoining ?? ''}
                    onChange={(value) => formikProps.setFieldValue(`${element}.dateOfReJoining`, value)}
                    maxDate={new Date().toISOString().slice(0, 10)}
                    placeholder="Date Of Re-Joining"
                />

                <WtDateField
                    label="Date Of Re-Exit (optional)"
                    value={formikProps.values?.rejoinHistory?.[index]?.dateOfReExit ?? ''}
                    onChange={(value) => formikProps.setFieldValue(`${element}.dateOfReExit`, value)}
                    placeholder="Date Of Re-Exit"
                />

                <WtFieldFormik name={`${element}.reason`} label="Reason (optional)" />
            </Box>
        </>
    );
}

export default RejoinHistory;
