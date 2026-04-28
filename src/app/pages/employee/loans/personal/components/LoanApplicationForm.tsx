import DateInput from '@app/modules/common/inputs/DateInput';
import DropDownInput from '@app/modules/common/inputs/DropdownInput';
import NumberInput from '@app/modules/common/inputs/NumberInput';
import RadioInput from '@app/modules/common/inputs/RadioInput';
import TextAreaInput from '@app/modules/common/inputs/TextAreaInput';
import TextInput from '@app/modules/common/inputs/TextInput';
import { LoanType } from '@constants/statistics';
import { RootState } from '@redux/store';
import { createEmployeeLoan, updateEmployeeLoanById } from '@services/employee';
import { errorConfirmation, successConfirmation } from '@utils/modal';
import dayjs from 'dayjs';
import { Form, Formik } from 'formik';
import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import * as Yup from 'yup';

const validationSchema = Yup.object().shape({
  loanAmount: Yup.number().required('Loan Amount is required'),
  loanType: Yup.string().required('Loan Type is required'),
  deductionMonth: Yup.date().required('Deduction Month is required'),
  numberOfMonths: Yup.number().required('Number of Months is required'),
  loanReason: Yup.string().required('Reason is required'),
})

interface IOptions {
    label: string;
    value: string;
}

function LoanApplicationForm({ setShowModalFunc, defaultData, isUpdate = false, onLoanSubmited }: { setShowModalFunc: (show: boolean) => void, defaultData?: any, isUpdate?: boolean, onLoanSubmited?: (updatedLoan: any) => Promise<void> }) {
    const [loading, setLoading] = useState(false);
    const employeeId = useSelector((state: RootState) => state?.employee?.currentEmployee?.id);
    const [deductionMonthDropdownOptions, setDeductionMonthDropdownOptions] = useState<IOptions[]>([]);

  useEffect(() => {
        const currDate = dayjs();
        let currMonth = currDate?.month();
        let currYear = currDate?.year();
        const options: IOptions[] = [];

    for (let i = 0; i < 6; i++) {
      options.push({
        label: currDate.month(i + currMonth).format('MMM, YYYY'),
                value: currDate.month(i + currMonth).endOf('month').format('YYYY-MM-DD')
      })
      if (currMonth + 1 == 12) {
                currMonth = 0;
                currYear++;
      }
    }
        setDeductionMonthDropdownOptions(options);
    }, []);

  return (
    <Formik
      enableReinitialize={true}
      // validationSchema={validationSchema}
      initialValues={{
        loanAmount: 0,
        loanType: 'ONE_TIME',
                deductionMonth: "",
        numberOfMonths: 0,
                loanReason: "",
      }}

      onSubmit={async (values: any) => {

        if (values.loanAmount > 1000000) {
          alert('please enter Loan Amount value less the 100k')
          return
        }
        if (values.numberOfMonths > 99) {
          alert('please enter the Number Of Months value less 100')
          return
        }
        setLoading(true);
        try {
          const data = {
            ...values,
            employeeId,
                    };

                    let res;
          if (isUpdate) {
            if (values?.loanType === LoanType.ONE_TIME) {
                            data.numberOfMonths = null;
            } else {
                            data.deductionMonth = null;
            }
                        data.id = defaultData?.id;
                        res = await updateEmployeeLoanById(data?.id, data);
                        if(res?.data && onLoanSubmited){
                           await onLoanSubmited(res?.data);
            }
                        successConfirmation('Loan Updated Successfully!');
                        setShowModalFunc(false);
          } else {
            if (values?.loanType === LoanType.ONE_TIME) {
              delete data.numberOfMonths
                        }
                        else {
              delete data.deductionMonth
            }
                        res = await createEmployeeLoan(data);
                        if(res?.data && onLoanSubmited){
                            await onLoanSubmited(res?.data);
            }
                        successConfirmation('Loan Applied Successfully!');
          }
                    setShowModalFunc(false);
        } catch (err) {
                    errorConfirmation('Failed to process the loan');
                    console.error(err);
        } finally {
                    setLoading(false);
        }
      }}
    >
      {(formikProps) => {
        useEffect(() => {
          if (employeeId) {
                        formikProps.setFieldValue('employeeId', employeeId);
          }
          if (defaultData) {
                        if (defaultData?.loanAmount) formikProps.setFieldValue('loanAmount', defaultData?.loanAmount)
                        if (defaultData?.loanType) formikProps.setFieldValue('loanType', defaultData?.loanType === LoanType.EMI ? 'EMI' : 'ONE_TIME')
            if (defaultData?.deductionMonth) {
                            formikProps.setFieldValue('deductionMonth', dayjs(defaultData?.deductionMonth).format('YYYY-MM-DD'))
            }
                        if (defaultData?.numberOfMonths) formikProps.setFieldValue('numberOfMonths', defaultData?.numberOfMonths)
                        if (defaultData?.reason) formikProps.setFieldValue('loanReason', defaultData?.reason)
          }
                }, [employeeId, defaultData]);

        return (
                    <Form className="form" placeholder={''}>
                        <div className="row px-3 my-3">
                            <div className="col-lg-12 fv-row">
                <TextInput
                  isRequired={true}
                                    label="Loan Amount"
                                    margin="mb-1"
                                    formikField="loanAmount"
                  inputTypeNumber={true}
                />
              </div>
            </div>

                        <div className="row px-3 my-3">
                            <div className="col-lg-12 fv-row">
                <RadioInput
                  isRequired={true}
                                    inputLabel="Loan Type"
                                    formikField="loanType"
                  radioBtns={[
                                        { label: "One Time", value: LoanType.ONE_TIME },
                                        { label: "EMI", value: LoanType.EMI },
                  ]}
                  customCss='my-2'
                />
              </div>
            </div>

            {formikProps.values.loanType === LoanType.ONE_TIME && (
                            <div className="row px-3 my-3">
                                <div className="col-lg-12 fv-row">
                  <DropDownInput
                    isRequired={true}
                                        fieldName="deductionMonth"
                    options={deductionMonthDropdownOptions}
                                        formikField="deductionMonth"
                                        inputLabel="Deduction Month"
                  />
                </div>
              </div>
            )}

            {formikProps.values.loanType === LoanType.EMI && (
                <div className="row px-3 my-3">
                    <div className="col-lg-12 fv-row">
                  <TextInput
                    isRequired={true}
                    label="Number of Months"
                    margin="mb-1"
                    formikField="numberOfMonths"
                    inputTypeNumber={true}
                  />
                  
                </div>
              </div>
            )}

                        <div className="row px-3 my-3">
                            <div className="col-lg-12 fv-row">
                <TextAreaInput
                  isRequired={true}
                                    label="Reason"
                                    margin="mb-1"
                                    formikField="loanReason"
                />
              </div>
            </div>

                        <div className="row px-7 mb-0 my-3">
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
                                        isUpdate ? "Update" : "Submit"
                  )}
                </button>
              </div>
            </div>
          </Form>
                );
      }}
    </Formik>
    );
}

export default LoanApplicationForm;
