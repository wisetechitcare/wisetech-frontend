import React, { useEffect, useState } from "react";
import CommonCard from "@app/modules/common/components/CommonCard";
import { getAllLoanSummary } from "@services/company";
import OngoingLoans from "./OngoingLoans";
import PaymentChangeRequests from "./PaymentChangeRequests";
import PreviousLoans from "./PreviousLoans";
import LoanApplicationRequests from "./LoanApplicationRequests";
import { resourceNameMapWithCamelCase } from "@constants/statistics";

type LoanSummariesResponse = {
  overview: {
    activeLoanAmountCollected: number;
    activeLoanAmountDue: number;
    activeLoanAmountGiven: number;
    activeNumberOfLoans: number;
    totalLoanAmountCollected: number;
    totalLoanAmountDue: number;
    totalLoanAmountGiven: number;
    totalNumberOfLoans: number;
  };
  allTimeInstallmentStats: {
    totalNumberOfLoans: number;
    totalLoanTaken: number;
    totalLoanCollected: number;
    totalLoanPending: number;
    totalInstallments: number;
    paidInstallments: number;
    pendingInstallments: number;
    skippedInstallments: number;
  };
};

function Overview() {
  const [loading, setLoading] = useState(false);
  const [loanSummariesData, setLoanSummariesData] =
    useState<LoanSummariesResponse | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);

      try {
        const {
          data: { loanSummaries },
        } = await getAllLoanSummary();
        setLoanSummariesData(loanSummaries);
      } catch (error) {
        console.error("Error fetching loan summaries:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const commonStyle = {
    fontSize: "14px",
    fontWeight: "600",
  };

  //<span>₹ {loanSummariesData?.overview.activeNumberOfLoans?.toLocaleString("en-IN") ?? "0"}</span>

  return (
    <div>
      <div className="">
        <h2>Loans</h2>
      </div>
      <div>
        <CommonCard>
          <div>
            <h3 style={{ fontSize: "19px", fontWeight: "600" }}>
              Active Loans Overview
            </h3>
            <div className="d-flex flex-wrap">
              <div
                className="my-2 d-flex flex-column"
                style={{
                  borderLeft: "3px solid  #7397C5",
                  paddingLeft: "10px",
                  width: "50%", // 2 per row on mobile
                }}
              >
                <span style={commonStyle}>Active Number of Loans</span>
                <span>
                  {loanSummariesData?.overview.activeNumberOfLoans ?? 0}
                </span>
              </div>
              <div
                className="my-2 d-flex flex-column"
                style={{
                  borderLeft: "3px solid #CB2C2C",
                  paddingLeft: "10px",
                  width: "50%",
                }}
              >
                <span style={commonStyle}>Active Loan Amount given</span>
                <span>
                  ₹{" "}
                  {loanSummariesData?.overview.activeLoanAmountGiven?.toLocaleString(
                    "en-IN"
                  ) ?? "0"}{" "}
                </span>
              </div>
              <div
                className="my-2 d-flex flex-column"
                style={{
                  borderLeft: "3px solid #1DD12C",
                  paddingLeft: "10px",
                  width: "50%",
                }}
              >
                <span style={commonStyle}>Active Loan Amount Collected</span>
                <span>
                  ₹{" "}
                  {loanSummariesData?.overview.activeLoanAmountCollected?.toLocaleString(
                    "en-IN"
                  ) ?? "0"}
                </span>
              </div>
              <div
                className="my-2 d-flex flex-column"
                style={{
                  borderLeft: "3px solid  #CB2C2C",
                  paddingLeft: "10px",
                  width: "50%",
                }}
              >
                <span style={commonStyle}>Active Loan Amount Due</span>
                <span>
                  ₹{" "}
                  {loanSummariesData?.overview.activeLoanAmountDue?.toLocaleString(
                    "en-IN"
                  ) ?? "0"}
                </span>
              </div>
            </div>
          </div>
        </CommonCard>
        <CommonCard>
          <div>
            <h3 style={{ fontSize: "19px", fontWeight: "600" }}>
              All Loans Overview
            </h3>
            <div className="d-flex flex-wrap">
              <div
                className="my-2 d-flex flex-column"
                style={{
                  borderLeft: "3px solid  #7397C5",
                  paddingLeft: "10px",
                  width: "50%", // mobile 2 in row
                }}
              >
                <span style={commonStyle}>Total Number of Loans</span>
                <span>
                  {loanSummariesData?.overview.totalNumberOfLoans ?? 0}
                </span>
              </div>
              <div
                className="my-2 d-flex flex-column"
                style={{
                  borderLeft: "3px solid #CB2C2C",
                  paddingLeft: "10px",
                  width: "50%",
                }}
              >
                <span style={commonStyle}>Total Loan Amount given</span>
                <span>
                  ₹{" "}
                  {loanSummariesData?.overview.totalLoanAmountGiven?.toLocaleString(
                    "en-IN"
                  ) ?? "0"}
                </span>
              </div>
              <div
                className="my-2 d-flex flex-column"
                style={{
                  borderLeft: "3px solid #1DD12C",
                  paddingLeft: "10px",
                  width: "50%",
                }}
              >
                <span style={commonStyle}>Total Loan Amount Collected</span>
                <span>
                  ₹{" "}
                  {loanSummariesData?.overview.totalLoanAmountCollected?.toLocaleString(
                    "en-IN"
                  ) ?? "0"}
                </span>
              </div>
              <div
                className="my-2 d-flex flex-column"
                style={{
                  borderLeft: "3px solid  #CB2C2C",
                  paddingLeft: "10px",
                  width: "50%",
                }}
              >
                <span style={commonStyle}>Total Loan Amount Due</span>
                <span>
                  ₹{" "}
                  {loanSummariesData?.overview.totalLoanAmountDue?.toLocaleString(
                    "en-IN"
                  ) ?? "0"}
                </span>
              </div>
            </div>
          </div>
        </CommonCard>
      </div>

      <div>
        {/* Displays a table of employees with currently active (ongoing) loans */}
        <OngoingLoans resource={resourceNameMapWithCamelCase.loan} viewOthers={true} viewOwn={true} />
      </div>

      <div>
        {/* Shows a table of new loan application requests awaiting approval or review */}
        <LoanApplicationRequests resource={resourceNameMapWithCamelCase.loan} viewOthers={true} viewOwn={true} />
      </div>

      <div>
        {/* Lists requests made by employees to change installment payments (custom amounts,  etc.) */}
        <PaymentChangeRequests resource={resourceNameMapWithCamelCase.loan} viewOthers={true} viewOwn={true} />
      </div>

      <div>
        {/* Displays a historical table of loans that have been fully repaid or closed */}
        <PreviousLoans resource={resourceNameMapWithCamelCase.loan} viewOthers={true} viewOwn={true} />
      </div>

      <div>
        <CommonCard>
          <div>
            <h3 style={{ fontSize: "19px", fontWeight: "600" }}>
              All Time Installments Stats
            </h3>
            <div className="d-flex flex-wrap">
              {[
                {
                  label: "Total Number of Loans",
                  value:
                    loanSummariesData?.allTimeInstallmentStats
                      .totalNumberOfLoans ?? 0,
                },
                {
                  label: "Total Loan Taken",
                  value: `₹ ${
                    loanSummariesData?.allTimeInstallmentStats.totalLoanTaken?.toLocaleString(
                      "en-IN"
                    ) ?? "0"
                  }`,
                },
                {
                  label: "Total Loan Collected",
                  value: `₹ ${
                    loanSummariesData?.allTimeInstallmentStats.totalLoanCollected?.toLocaleString(
                      "en-IN"
                    ) ?? "0"
                  }`,
                },
                {
                  label: "Total Loan Pending",
                  value: `₹ ${
                    loanSummariesData?.allTimeInstallmentStats.totalLoanPending?.toLocaleString(
                      "en-IN"
                    ) ?? "0"
                  }`,
                },
                {
                  label: "Total Installments",
                  value:
                    loanSummariesData?.allTimeInstallmentStats
                      .totalInstallments ?? 0,
                },
                {
                  label: "Paid Installments",
                  value:
                    loanSummariesData?.allTimeInstallmentStats
                      .paidInstallments ?? 0,
                },
                {
                  label: "Pending Installments",
                  value:
                    loanSummariesData?.allTimeInstallmentStats
                      .pendingInstallments ?? 0,
                },
                {
                  label: "Skipped Installments",
                  value:
                    loanSummariesData?.allTimeInstallmentStats
                      .skippedInstallments ?? 0,
                },
              ].map((item, index) => (
                <div
                  key={index}
                  className="my-2 d-flex flex-column"
                  style={{
                    paddingLeft: "10px",
                    width: "50%", // 2 per row on mobile
                  }}
                >
                  <span style={commonStyle}>{item.label}</span>
                  <span>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </CommonCard>
      </div>
    </div>
  );
}

export default Overview;
