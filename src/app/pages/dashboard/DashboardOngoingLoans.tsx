import { useCallback, useEffect, useState } from 'react';
import { fetchEmployeeLoans } from '@services/employee';
import { useSelector } from 'react-redux';
import { RootState } from '@redux/store';
import { InstallmentTypeEnum } from '@constants/statistics';
import dayjs from 'dayjs';

const DashboardOngoingLoans = () => {
  const employeeId = useSelector((state: RootState) => state.employee.currentEmployee?.id);
  const [totalLoanAmountTaken, setTotalLoanAmountTaken] = useState(0);
  const [totalLoanAmountPaid, setTotalLoanAmountPaid] = useState(0);
  const [ongoingLoans, setOngoingLoans] = useState(0);
  const [ongoingLoansData, setOngoingLoansData] = useState<any[]>([]);
  const [amountDueThisMonth, setAmountDueThisMonth] = useState(0);
  const [totalAmountDue, setTotalAmountDue] = useState(0);
  const [loading, setLoading] = useState(false);

  const formatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2
  });

  const fetchLoanData = useCallback(async () => {
    if (!employeeId) return;

    try {
      setLoading(true);
      const res = await fetchEmployeeLoans(employeeId);
      const unsortedLoanDetails = res?.data?.loans;

      unsortedLoanDetails?.forEach((ele: any) => {
        const currInstallments = ele?.loanInstallments;
        if (currInstallments?.length > 0) {
          const sortedInstallments = currInstallments?.sort((a: any, b: any) =>
            new Date(b?.dueDate).getTime() - new Date(a?.dueDate).getTime()
          );
          const sortedInstallmentsFinal = sortedInstallments?.map((ele: any, index: number) => ({
            ...ele,
            installmentOutOf: `${Number(sortedInstallments?.length) - index}/${sortedInstallments?.length}`
          }));
          if (ele?.loanInstallments) {
            ele.loanInstallments = sortedInstallmentsFinal;
          }
        }
      });

      const totalLoanDetails = res?.data?.loans;
      const ongoingLoansDataFinal = totalLoanDetails?.filter((ele: any) => {
        const installments = ele?.loanInstallments;
        const anyInstallmentsTypeUpcoming = installments?.some(
          (install: any) => install?.installmentType === InstallmentTypeEnum.Upcoming
        );
        return anyInstallmentsTypeUpcoming;
      });

      setOngoingLoansData(ongoingLoansDataFinal);
    } catch (error) {
      console.error("error: ", error);
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    setOngoingLoans(ongoingLoansData?.length);
    const totalLoanTaken = ongoingLoansData?.reduce(
      (acc: number, ele: any) => acc + Number(ele?.loanAmount),
      0
    );
    setTotalLoanAmountTaken(totalLoanTaken);

    let totalLoanPaid = 0;
    let amountDueThisMonth = 0;
    let totalAmountToPayThisMonth = 0;
    let totalAmountPaidThisMonth = 0;

    ongoingLoansData?.forEach((ele: any) => {
      const installments = ele?.loanInstallments;
      installments?.forEach((install: any) => {
        totalLoanPaid += Number(install?.paidAmount);
        const currDateMonthStart = dayjs().startOf("month");
        const currDateMonthEnd = dayjs().endOf("month");
        if (
          dayjs(new Date(install?.dueDate)).isSameOrBefore(currDateMonthEnd) &&
          dayjs(new Date(install?.dueDate)).isSameOrAfter(currDateMonthStart)
        ) {
          totalAmountToPayThisMonth += Number(install?.installmentAmount);
          totalAmountPaidThisMonth += Number(install?.paidAmount);
        }
      });
    });

    amountDueThisMonth = totalAmountToPayThisMonth - totalAmountPaidThisMonth;
    setTotalLoanAmountPaid(totalLoanPaid);
    setAmountDueThisMonth(amountDueThisMonth);
    setTotalAmountDue(totalLoanTaken - totalLoanPaid);
  }, [ongoingLoansData]);

  useEffect(() => {
    if (employeeId) {
      fetchLoanData();
    }
  }, [fetchLoanData, employeeId]);

  if (loading) {
    return (
      <div
        className="card border-0 rounded-3"
        style={{ boxShadow: '8px 8px 16px 0px rgba(0,0,0,0.04)' }}
      >
        <div className="card-body p-3 p-md-4 d-flex justify-content-center align-items-center" style={{ minHeight: "200px" }}>
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="card border-0 rounded-3"
      style={{ boxShadow: '8px 8px 16px 0px rgba(0,0,0,0.04)' }}
    >
      <div className="card-body p-3 p-md-4">
        {/* <div className="row gx-3 gy-4 align-items-start"> */}
        <h5
          className="mt-0 mb-4"
          style={{
            fontSize: '20px',
            fontWeight: 600,
            fontFamily: 'Barlow',
            letterSpacing: '0.2px'
          }}
        >
          This month Loans Overview
        </h5>
          <div className="col-12 col-md-6">
            <div className="my-2 d-flex flex-column">
              {/* <span style={{ fontWeight: '600', fontSize: '14px', fontFamily: 'Inter' }}>
                Total Amount Due
              </span> */}
              <span
                style={{ fontWeight: '700', fontSize: '24px', fontFamily: 'Inter', marginTop: '8px' }}
              >
                {formatter.format(totalAmountDue)}
              </span>
            </div>
          </div>

          <div className="col-12 col-md-12">
            <div className="row gx-2 gy-3">
              <div
                className="col-12 col-sm-3 d-flex flex-column"
                style={{
                  borderLeft: '3px solid #FF0000',
                  paddingLeft: '10px',
                }}
              >
                <span style={{ fontSize: '14px', fontFamily: 'Inter' }}>Loan Amount Taken</span>
                <span style={{ fontSize: '16px', fontWeight: '600', fontFamily: 'Inter', marginTop: '4px' }}>
                  {formatter.format(totalLoanAmountTaken)}
                </span>
              </div>
              <div
                className="col-12 col-sm-3 d-flex flex-column"
                style={{
                  borderLeft: '3px solid #1DD12C',
                  paddingLeft: '10px',
                }}
              >
                <span style={{ fontSize: '14px', fontFamily: 'Inter' }}>Loans Amount Paid</span>
                <span style={{ fontSize: '16px', fontWeight: '600', fontFamily: 'Inter', marginTop: '4px' }}>
                  {formatter.format(totalLoanAmountPaid)}
                </span>
              </div>
              <div
                className="col-12 col-sm-3 d-flex flex-column"
                style={{
                  borderLeft: '3px solid #7397C5',
                  paddingLeft: '10px',
                }}
              >
                <span style={{ fontSize: '14px', fontFamily: 'Inter' }}>Ongoing Loans</span>
                <span style={{ fontSize: '16px', fontWeight: '600', fontFamily: 'Inter', marginTop: '4px' }}>
                  {ongoingLoans}
                </span>
              </div>
              <div
                className="col-12 col-sm-3 d-flex flex-column"
                style={{
                  borderLeft: '3px solid #FF0000',
                  paddingLeft: '10px',
                }}
              >
                <span style={{ fontSize: '14px', fontFamily: 'Inter' }}>Amount Due This Month</span>
                <span style={{ fontSize: '16px', fontWeight: '600', fontFamily: 'Inter', marginTop: '4px' }}>
                  {formatter.format(amountDueThisMonth)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    // </div>
  );
};

export default DashboardOngoingLoans;
