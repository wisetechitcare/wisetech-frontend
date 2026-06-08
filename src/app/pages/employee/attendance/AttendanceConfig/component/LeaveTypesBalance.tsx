import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Button } from 'react-bootstrap';
import { Formik, Form as FormikForm } from 'formik';
import TextInput from '@app/modules/common/inputs/TextInput';
import { fetchLeaveOptions, updateLeaveOptionsById } from '@services/company';
import { errorConfirmation, successConfirmation } from '@utils/modal';
import Loader from '@app/modules/common/utils/Loader';

const LeaveTypesBalance: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [leaveOptions, setLeaveOptions] = useState<any[]>([]);
  const [leaveOptionInitialValues, setLeaveOptionInitialValues] = useState<any[]>([]);
  const [leaveOptionsGroupedByBranchId, setLeaveOptionsGroupedByBranchId] = useState<any>({});
  const [branchNameMappedWithId, setBranchNameMappedWithId] = useState<Map<string, any>>(new Map());

  useEffect(() => {
    async function fetchAllSettings() {
      try {
        setIsLoading(true);

        const leaveOptionsRes = await fetchLeaveOptions();

        // Handle leave options
        const leaveOptionsData = leaveOptionsRes.data?.leaveOptions || [];

        // Get branch ids and names from leave options
        const branchIds = new Map();
        leaveOptionsData.forEach((leaveOption: any) => {
          if (leaveOption?.branchId) {
            branchIds.set(leaveOption?.branchId, {
              id: leaveOption?.branch?.id,
              name: leaveOption?.branch?.name
            });
          }
        });
        setBranchNameMappedWithId(branchIds);

        // Separate leave options based on branches
        const leaveOptionsGroupedByBranch: any = {};
        leaveOptionsData.forEach((leaveOption: any) => {
          if (leaveOption?.branchId) {
            if (!leaveOptionsGroupedByBranch[leaveOption?.branchId]) {
              leaveOptionsGroupedByBranch[leaveOption?.branchId] = [];
            }
            leaveOptionsGroupedByBranch[leaveOption?.branchId].push(leaveOption);
          }
        });

        // Sort leave options alphabetically by leave type
        const sortedLeaveOptions = Object.fromEntries(
          Object.entries(leaveOptionsGroupedByBranch).map(([branchId, leaves]) => [
            branchId,
            [...(leaves as any)].sort((a: any, b: any) => {
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
        console.error('Error fetching settings:', error);
        errorConfirmation('Failed to load leave options');
      } finally {
        setIsLoading(false);
      }
    }

    fetchAllSettings();
  }, []);

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      // Update leaves limit — include rows where value=0 (allows resetting a leave type to 0)
      let leaveData = Object.entries(values).filter(
        ([key, value]) => key && value !== undefined && value !== null && value !== ''
      );
      const allCalls: Promise<any>[] = [];

      leaveData.forEach(([leaveId, numberOfDays]) => {
        const data = leaveOptions.filter((val: any) => val?.id == leaveId);
        if (Array.isArray(data) && data?.length > 0 && leaveId) {
          const leaveData = { ...data[0] } as any;
          delete leaveData?.branch;
          delete leaveData?.canApprove;

          allCalls.push(
            updateLeaveOptionsById(leaveId, {
              ...leaveData,
              numberOfDays: numberOfDays
            })
          );
        }
      });

      const results = await Promise.all(allCalls);

      for (let i = 0; i < results?.length; i++) {
        if (results[i]?.hasError) {
          errorConfirmation('Failed to update leave settings');
          return;
        }
      }

      successConfirmation('Leave settings updated successfully!');

      // Refresh displayed values so the admin immediately sees the saved totals without a page reload.
      // This also ensures the Formik initial values are in sync with the DB after save.
      try {
        const refreshRes = await fetchLeaveOptions();
        const refreshedData = refreshRes.data?.leaveOptions || [];
        const refreshedFinalLeaveOptions = refreshedData.map((lo: any) => ({
          [`${lo.id}`]: Number(lo.numberOfDays)
        }));
        setLeaveOptions(refreshedData);
        setLeaveOptionInitialValues(refreshedFinalLeaveOptions);
      } catch (refreshErr) {
        // Non-fatal: save succeeded, the stale display doesn't block anything
        console.error('Could not refresh leave options after save (non-fatal):', refreshErr);
      }
    } catch (err) {
      errorConfirmation('Failed to update leave settings');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) {
    return <Loader />;
  }

  return (
    <Formik
      enableReinitialize={true}
      initialValues={
        leaveOptionInitialValues?.length > 0
          ? Object.assign({}, ...leaveOptionInitialValues)
          : {}
      }
      onSubmit={handleSubmit}
    >
      {({ setFieldValue, values }) => {
        useEffect(() => {
          if (leaveOptionInitialValues?.length > 0) {
            leaveOptionInitialValues.forEach((leaveOption: any) => {
              const key = Object.keys(leaveOption)[0];
              setFieldValue(key, Number(leaveOption[key]));
            });
          }
        }, [leaveOptionInitialValues]);

        return (
          <FormikForm placeholder={''}>
            <div style={{ padding: '24px 20px', backgroundColor: '#f7f9fc' }}>
              {/* Branch Specific Divider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                <div style={{ width: '26px', height: '1px', backgroundColor: '#9d4141' }} />
                <span style={{
                  fontSize: '15px',
                  fontWeight: 600,
                  fontFamily: 'Inter, sans-serif',
                  color: '#9d4141',
                  textTransform: 'uppercase',
                  letterSpacing: '0.75px'
                }}>
                  Branch Specific
                </span>
                <div style={{ flex: 1, height: '1px', backgroundColor: '#9d4141' }} />
              </div>

              {/* Leave Types Section */}
              {Object.keys(leaveOptionsGroupedByBranchId)?.length > 0 ? (
                <>
                  <Card style={{ borderRadius: '12px', border: 'none', marginBottom: '16px' }}>
                    <Card.Body style={{ padding: '20px 25px' }}>
                      {/* Scrollable container with vertical line */}
                      <div style={{
                        maxHeight: '500px',
                        overflowY: 'auto',
                        overflowX: 'hidden',
                        position: 'relative'
                      }}>
                        {/* Vertical line that scrolls with content */}
                        <div style={{
                          position: 'absolute',
                          left: '0',
                          top: '12px',
                          bottom: '12px',
                          // width: '1px',
                          backgroundColor: '#7a8597',
                          zIndex: 1
                        }} />

                        <div style={{
                          paddingLeft: '20px',
                          paddingTop: '12px',
                          paddingBottom: '12px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '24px',
                          position: 'relative',
                          zIndex: 2
                        }}>
                          {Object.keys(leaveOptionsGroupedByBranchId).map((key: any, index: number) => {
                            const branchData = branchNameMappedWithId?.get(key);
                            const branchName = branchData?.name;
                            const branchId = branchData?.id;

                            // Split leave types into paid (editable) and unpaid (derived, read-only)
                            const paidLeaveOptions = leaveOptionsGroupedByBranchId[key]
                              .filter((lo: any) => !lo.leaveType.toLowerCase().includes('unpaid'));
                            const hasUnpaid = leaveOptionsGroupedByBranchId[key]
                              .some((lo: any) => lo.leaveType.toLowerCase().includes('unpaid'));

                            // A1 FIX: Read totalPaidLeaves from live Formik values, not the DB snapshot.
                            // Previously read from leaveOption.numberOfDays (DB value = null for new types),
                            // so the total stayed 0 even when the user typed values into the inputs.
                            const totalPaidLeaves = paidLeaveOptions
                              .reduce((acc: number, lo: any) => acc + (Number(values[lo.id]) || 0), 0);

                            // Unpaid days are a derived remainder — never stored, just displayed
                            const unpaidDays = Math.max(0, 365 - totalPaidLeaves);

                            return (
                              <div key={branchId} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {/* Branch Header */}
                                <div style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  flexWrap: 'wrap',
                                  gap: '8px'
                                }}>
                                  <span style={{
                                    fontSize: '14px',
                                    fontWeight: 500,
                                    fontFamily: 'Inter, sans-serif',
                                    color: '#798db3',
                                    textTransform: 'uppercase'
                                  }}>
                                    Branch: {branchName}
                                  </span>
                                  <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    fontSize: '14px',
                                    fontWeight: 500,
                                    fontFamily: 'Inter, sans-serif'
                                  }}>
                                    <span style={{ color: '#798db3', textTransform: 'uppercase' }}>Total Paid Leaves</span>
                                    <span style={{ color: '#000', fontWeight: 600 }}>{totalPaidLeaves}</span>
                                    <span style={{ color: '#6c757d', fontSize: 12 }}>
                                      ({unpaidDays} unpaid = 365 − {totalPaidLeaves})
                                    </span>
                                  </div>
                                </div>

                                {/* A2 FIX: Only editable inputs for PAID leave types.
                                    Unpaid leave is a computed remainder (365 − totalPaid) and
                                    must never be directly configured — shown as a read-only badge below. */}
                                <Row className="gy-3 gx-3">
                                  {paidLeaveOptions.map((leaveOption: any) => (
                                    <Col xs={12} sm={6} md={4} lg={2} key={leaveOption?.id}>
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        <label style={{
                                          fontSize: '14px',
                                          fontWeight: 500,
                                          fontFamily: 'Inter, sans-serif',
                                          color: '#000',
                                          marginBottom: '0'
                                        }}>
                                          {leaveOption?.leaveType}
                                        </label>
                                        <div style={{
                                          borderRadius: '6px',
                                          padding: '1px',
                                          height: '48px',
                                          display: 'flex',
                                          alignItems: 'center'
                                        }}>
                                          <TextInput
                                            isRequired={true}
                                            label=""
                                            margin="mb-0"
                                            formikField={`${leaveOption?.id}`}
                                            inputValidation="numbers"
                                            placeholder="0"
                                          />
                                        </div>
                                      </div>
                                    </Col>
                                  ))}
                                </Row>

                                {/* Unpaid leave — derived read-only badge */}
                                {hasUnpaid && (
                                  <div style={{
                                    marginTop: 4,
                                    padding: '8px 14px',
                                    backgroundColor: '#fff0f0',
                                    borderRadius: 6,
                                    fontSize: 13,
                                    color: '#c92a2a',
                                    border: '1px solid #ffc9c9',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    width: 'fit-content',
                                  }}>
                                    <strong>Unpaid Leave</strong>
                                    <span style={{ color: '#6c757d' }}>
                                      — derived as 365 − {totalPaidLeaves} ={' '}
                                      <strong style={{ color: '#c92a2a' }}>{unpaidDays} days</strong>
                                      {' '}(not configurable)
                                    </span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </Card.Body>
                  </Card>

                  {/* Save Button */}
                  <Button
                    type="submit"
                    disabled={loading}
                    style={{
                      backgroundColor: '#9d4141',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '10px 20px',
                      fontSize: '14px',
                      fontWeight: 500,
                      fontFamily: 'Inter, sans-serif',
                      height: '40px',
                      minWidth: '80px'
                    }}
                  >
                    {loading ? (
                      <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                    ) : (
                      'Save'
                    )}
                  </Button>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <div style={{ fontSize: '14px', color: '#8696ad', fontFamily: 'Inter, sans-serif' }}>
                    No leave options configured yet
                  </div>
                </div>
              )}
            </div>
          </FormikForm>
        );
      }}
    </Formik>
  );
};

export default LeaveTypesBalance;
