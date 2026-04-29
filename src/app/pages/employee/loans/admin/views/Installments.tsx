import { useEffect, useState } from "react";
import dayjs, { Dayjs } from "dayjs";
import CommonCard from "@app/modules/common/components/CommonCard";
import { toAbsoluteUrl } from "@metronic/helpers";
import { handleDatesChange } from "@utils/statistics";
import InstallmentPayments from "./InstallmentPayments";
import { fetchEmpMonthlyInstallmentsStatistics } from "@services/company";
import { resourceNameMapWithCamelCase } from "@constants/statistics";

const Installments: React.FC = () => {
  const [month, setMonth] = useState<Dayjs>(dayjs());
  const [alignment, setAlignment] = useState("monthly");
  const [loanStats, setLoanStats] = useState<any>(null);

  useEffect(() => {
    if (alignment === "monthly") {
      getMonthlyStats();
    }
  }, [month, alignment]);

  const getMonthlyStats = async () => {
    try {
      const data = await fetchEmpMonthlyInstallmentsStatistics(month);      
      setLoanStats(data);
    } catch (error) {
      console.error("Error fetching monthly stats:", error);
    }
  };

  const toggleItemsActions = {
    monthly: (newMonth: Dayjs) => {
      setMonth(newMonth);
      getMonthlyStats();
    },
  };

  const commonStyle = {
    fontSize: "14px",
    fontWeight: "600",
  };

  return (
    <div>
       <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-3 gap-3" >
                    <h2 className="text-start text-md-start">
                        Monthly Installment
                    </h2>

        {alignment === "monthly" && (
          <div className="mb-2">
            <button
              className="btn btn-sm me-2 p-0"
              onClick={() => {
                const newMonth = month.subtract(1, "month");
                handleDatesChange("decrement", "month", setMonth);
                toggleItemsActions.monthly(newMonth);
              }}
            >
              <img
                src={toAbsoluteUrl("media/svg/misc/back.svg")}
                alt="Previous"
              />
            </button>

            <span className="mx-2 mt-3">{month.format("MMM, YYYY")}</span>

            <button
              className="btn btn-sm ms-2 p-0"
              onClick={() => {
                const newMonth = month.add(1, "month");
                handleDatesChange("increment", "month", setMonth);
                toggleItemsActions.monthly(newMonth);
              }}
            >
              <img src={toAbsoluteUrl("media/svg/misc/next.svg")} alt="Next" />
            </button>
          </div>
        )}
      </div>
      <CommonCard>
        <div>
          <div className="mb-6">
            <h5>Total Due This Month</h5>
            <h3 style={{ fontSize: "19px", fontWeight: "600" }}>
              ₹{" "}
              {loanStats?.activeLoansOverview?.totalDueThisMonth
                ? Math.round(
                    loanStats.activeLoansOverview.totalDueThisMonth
                  ).toLocaleString("en-IN")
                : "0"}
            </h3>
          </div>
          <div className="d-flex flex-wrap">
            {[
              {
                label: "Active Loan",
                value: loanStats?.activeLoansOverview?.activeLoan ?? 0,
                borderColor: "#7397C5",
              },
              {
                label: "Bill Due This Month",
                value: `₹ ${
                  loanStats?.activeLoansOverview?.billDueThisMonth?.toLocaleString(
                    "en-IN"
                  ) ?? "0"
                }`,
                borderColor: "#CB2C2C",
              },
              {
                label: "Previous Dues",
                value: `₹ ${
                  loanStats?.activeLoansOverview?.previousDue?.toLocaleString(
                    "en-IN"
                  ) ?? "0"
                }`,
                borderColor: "#1DD12C",
              },
              {
                label: "Amount Collected",
                value: `₹ ${
                  loanStats?.activeLoansOverview?.amountCollected?.toLocaleString(
                    "en-IN"
                  ) ?? "0"
                }`,
                borderColor: "#CB2C2C",
              },
              {
                label: "Auto Deduction On",
                value: loanStats?.activeLoansOverview?.autoDeductionOn
                  ? dayjs(loanStats.activeLoansOverview.autoDeductionOn).format(
                      "DD MMM YYYY"
                    )
                  : "-",
                borderColor: "#CB2C2C",
              },
              {
                label: "Change Requests",
                value: loanStats?.activeLoansOverview?.changeRequest ?? 0,
                borderColor: "#CB2C2C",
              },
            ].map((item, i) => (
              <div
                key={i}
                className="my-2 d-flex flex-column"
                style={{
                  borderLeft: `3px solid ${item.borderColor}`,
                  paddingLeft: "10px",
                  width: "50%", // Mobile optimized: 2 per row
                }}
              >
                <span style={commonStyle}>{item.label}</span>
                <span>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </CommonCard>

      <div>
        <InstallmentPayments resource={resourceNameMapWithCamelCase.loanInstallment} payments={loanStats?.InstallmentPayments || []} viewOthers={true} viewOwn={true} />
      </div>
    </div>
  );
};

export default Installments;
