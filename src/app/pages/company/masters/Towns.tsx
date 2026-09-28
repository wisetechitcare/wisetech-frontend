import MaterialTable from '@app/modules/common/components/MaterialTable';
import { ActionIconButton, GlassDialog, GlassHeader, WtButton } from '@app/modules/common/components/ui';
import { Box, Stack, CircularProgress } from '@mui/material';
import { KTIcon } from '@metronic/helpers';
import TextInput from '@app/modules/common/inputs/TextInput';
import { RootState } from '@redux/store';
import { fetchCompanyOverview } from '@services/company';
import { createNewTowns, fetchAllTowns, updateTownById } from '@services/options';
import { successConfirmation } from '@utils/modal';
import { Form, Formik, FormikValues } from 'formik';
import { MRT_ColumnDef } from 'material-react-table';
import React, { useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux';
import * as Yup from 'yup';
import {
  ConfigPageLayout,
  ConfigSectionCard,
  C,
  FONT,
  SP,
  RADIUS,
  KEYFRAMES,
} from '@app/modules/configuration';

const townSchema = Yup.object({
    name: Yup.string().required().label('Town'),
});

interface ITown {
    id: string;
    name: string;
}


const initialState: ITown = {
    id: "",
    name: "",
}

function Towns() {
    const [showModal, setShowModal] = useState(false);
    const [data, setData] = useState<ITown[]>([]);
    const [editMode, setEditMode] = useState(false);
    const [loading, setLoading] = useState(false);
    const [initialValues, setInitialValues] = useState<ITown>(initialState);
    const isAdmin = useSelector((state: RootState) => state.auth.currentUser.isAdmin);
    const [companyId, setCompanyId] = useState<string>('');
    const employeeId = useSelector((state: RootState) => state.employee.currentEmployee.id);
    const [refresh, setRefresh] = useState(false)

    useEffect(() => {
        const loadTowns = async () => {
            setLoading(true);
            try {
                const townsResponse = await fetchAllTowns()                
                const townsOptions = townsResponse.data.towns
                setData(townsOptions)

            } catch (error) {
                console.error("Error fetching employee types:", error);
            } finally {
                setLoading(false);
            }
        };
        loadTowns();
    }, [refresh]);

    const handleEditClick = (id: string) => {
        const employeeTypeData: any = data.find(des => des.id === id);
        
        if (employeeTypeData) {
            setInitialValues({
                id: employeeTypeData.id,
                name: employeeTypeData.name,
            });
            setEditMode(true);
            setShowModal(true);
        }
    };

    const columns = useMemo<MRT_ColumnDef<ITown>[]>(
        () => {
            const cols: MRT_ColumnDef<ITown>[] = [
                {
                    accessorKey: "name",
                    header: "Name",
                    Cell: ({ renderedCellValue }) => renderedCellValue
                },
            ];

            if (isAdmin) {
                cols.push({
                    accessorKey: "actions",
                    header: "Actions",
                    Cell: ({ row }: any) => (
                        <ActionIconButton
                            iconName="pencil"
                            title="Edit town"
                            onClick={() => handleEditClick(row.original.id)}
                        />
                    ),
                });
            }

            return cols;
        },
        [isAdmin, data]
    );

    const handleClose = () => {
        setShowModal(false);
        setEditMode(false);
        setInitialValues(initialState);
    };

    const handleSubmit = async (values: any, actions: FormikValues) => {
       
        try {
            setLoading(true);
            if (editMode) {                
                await updateTownById(values.id, values);
                setLoading(false);
                successConfirmation('Town updated successfully');
                setShowModal(false);
                setEditMode(false);
                return;
            }
            const payload = { companyId:"" , towns: [values.name] };
            try {
                const res = await createNewTowns(payload);                
            } catch (error) {
                console.log("error: ", error);
            }
            setLoading(false);
            successConfirmation('Town created successfully');
            setShowModal(false);
        } catch (err) {
            setLoading(false);
        } finally {
            setRefresh(prev => !prev);
            setInitialValues(initialState);
        }
    };

    return (
        <>
            {/* ConfigPageLayout already injects KEYFRAMES — this was a second copy
                of the same <style> block on every render of this page. */}
            <ConfigPageLayout>
              <ConfigSectionCard
                title={`${data.length} Town${data.length !== 1 ? 's' : ''}`}
                description="View and manage all towns and geographical locations"
                icon="bi-pin-map"
                iconColor="primary"
                primaryAction={isAdmin ? { label: 'New Town', icon: 'bi-plus-lg', onClick: () => setShowModal(true), variant: 'primary' } : undefined}
                badge={{ label: `${data.length}`, color: C.primary, bg: C.primaryLight }}
                loading={loading}
              >
                <div style={{ marginTop: SP.md }}>
                  <MaterialTable
                    columns={columns}
                    data={data}
                    tableName="Towns"
                    employeeId={employeeId}
                    muiTableProps={{
                      sx: {
                        '& .MuiTableCell-head': {
                          backgroundColor: C.bgSection,
                          fontWeight: 600,
                          fontSize: '13px',
                          color: C.textPrimary,
                          fontFamily: FONT.body,
                        },
                      },
                    }}
                  />
                </div>
              </ConfigSectionCard>
            </ConfigPageLayout>

            {/* Was a react-bootstrap Modal with two hand-rolled <button>s that
                animated themselves through onMouseEnter/onMouseLeave handlers
                mutating inline style, plus a CSS spinner and a @keyframes block
                to drive it, plus a backdrop-blur class. GlassDialog already
                blurs its backdrop and WtButton already has its own states, so
                all of that is now deletion rather than translation. */}
            <GlassDialog
                open={showModal} onClose={handleClose} maxWidth="sm" fullWidth
                header={
                    <GlassHeader
                        title={editMode ? 'Edit Town' : 'Create New Town'}
                        icon={<KTIcon iconName="geolocation" className="fs-1" />}
                        onClose={handleClose}
                    />
                }
            >
                <Box sx={{ p: { xs: 2, sm: 2.75 } }}>
                    <Formik initialValues={initialValues} onSubmit={handleSubmit} validationSchema={townSchema}>
                        {(formikProps) => (
                            <Form>
                                <TextInput
                                    isRequired={true}
                                    label="Town Name"
                                    formikField="name"
                                />

                                <Stack direction="row" spacing={1.25} justifyContent="flex-end" sx={{ mt: 2.5, flexWrap: 'wrap', gap: 1.25 }}>
                                    <WtButton ghost onClick={handleClose}>Cancel</WtButton>
                                    <WtButton
                                        type="submit"
                                        disabled={loading || !formikProps.isValid}
                                        startIcon={loading ? <CircularProgress size={14} color="inherit" /> : undefined}
                                    >
                                        {loading ? 'Please wait…' : editMode ? 'Update Town' : 'Create Town'}
                                    </WtButton>
                                </Stack>
                            </Form>
                        )}
                    </Formik>
                </Box>
            </GlassDialog>
        </>
    );
}

export default Towns