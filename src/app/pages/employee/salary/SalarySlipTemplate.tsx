import React, { useEffect, useState } from "react";
import {
  Page,
  Text,
  View,
  Document,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import { Employee } from "@redux/slices/employee";
import { fetchBranchById, fetchCompanyLogo } from "@services/company";

const styles = StyleSheet.create({
  page: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    width: "100%",
    height: "100%",
  },
  section: {
    margin: 10,
    padding: 10,
    flexGrow: 1,
  },
  table: {
    display: "flex",
    width: "100%",
    borderStyle: "solid",
    borderWidth: 1,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  tableRow: {
    margin: "auto",
    flexDirection: "row",
  },
  tableCell: {
    width: "25%",
    borderStyle: "solid",
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    padding: "6px 3px",
    fontSize: 10,
  },
  bold: {
    fontFamily: "Helvetica-Bold",
  },
});

function SalarySlipTemplate({
  grossPayVariable,
  grossPayFixed,
  deductions, // variable
  taxes, // fixed
  totalGrossPayEarned,
  totalDeductionsEarned,
  employee,
  finalAmount,
  totalPayableDays,
  date,
  paidLeaves,
  unpaidLeaves,
}: {
  grossPayVariable: { name: string; value?: string; earned: string }[];
  grossPayFixed: { name: string; value?: string; earned: string }[];
  deductions: { name: string; value: string; earned: string }[];
  taxes: { name: string; value?: string; earned: string }[];
  totalGrossPayEarned: string;
  totalDeductionsEarned: string;
  employee: Employee;
  finalAmount: string;
  totalPayableDays: number;
  date: string;
  paidLeaves: number;
  unpaidLeaves: number;
}) {
  const [logoUrl, setLogoUrl] = useState("");
  const [branchAddress, setBranchAddress] = useState("");
  const [stampUrl, setStampUrl] = useState("");

  const getLogoUrl = async () => {
    try {
      const logo = await fetchCompanyLogo();
      return logo || "";
    } catch (error) {
      console.error("Error fetching company logo:", error);
      return "";
    }
  };

  const branchDetails = async (branchId: string) => {
    try {
      const res = await fetchBranchById(branchId);
      return res.data?.branch?.address;
    } catch (error) {
      console.error("Error fetching branch details:", error);
      return "";
    }
  };

  

  useEffect(() => {
    const fetchBranchAddress = async () => {
      const address = await branchDetails(employee.branchId);
      setBranchAddress(address);
    };

    if (employee.branchId) {
      fetchBranchAddress();
    }
  }, [employee]);

  useEffect(() => {
    const fetchLogo = async () => {
      const logoUrl = await getLogoUrl();
      setLogoUrl(logoUrl.data.logo);
      setStampUrl(logoUrl.data.salaryStamp);
      // console.log("stampUrl", logoUrl.data.salaryStamp);
    };

    fetchLogo();
  }, []);

  function createTotalSideData(
    variablePay: { name: string; earned: string }[],
    fixedPay: { name: string; earned: string }[],
    deductionsDetails: { name: string; value: string; earned: string }[],
    taxDetails: { name: string; earned: string }[]
  ) {
    // Validate input arrays and provide defaults if undefined
    const safeVariablePay = Array.isArray(variablePay) ? variablePay : [];
    const safeFixedPay = Array.isArray(fixedPay) ? fixedPay : [];
    const safeDeductionsDetails = Array.isArray(deductionsDetails) ? deductionsDetails : [];
    const safeTaxDetails = Array.isArray(taxDetails) ? taxDetails : [];

    let finalData: [
      {
        leftName: string;
        leftEarned: string | undefined;
        rightName: string;
        rightEarned: string | undefined;
      }
    ] = [
      {
        leftName: "Variables",
        leftEarned: undefined,
        rightName: "Variables",
        rightEarned: undefined,
      },
    ];
 
    let finalLength = Math.max(safeVariablePay.length, safeDeductionsDetails.length);

    for (let i = 0; i < finalLength; i++) {
      let obj = {
        leftName: safeVariablePay[i]?.name || '',
        leftEarned: safeVariablePay[i]?.earned ? (
          safeVariablePay[i].earned.startsWith('₹') ? 
          safeVariablePay[i].earned.slice(1) : safeVariablePay[i].earned
        ) : '',
        rightName: safeDeductionsDetails[i]?.name || '',
        rightEarned: safeDeductionsDetails[i]?.earned ? (
          safeDeductionsDetails[i].earned.startsWith('₹') ? 
          safeDeductionsDetails[i].earned.slice(1) : safeDeductionsDetails[i].earned
        ) : '',
      };

      finalData.push(obj);
    }

    finalData.push({
      leftName: "Fixed",
      leftEarned: undefined,
      rightName: "Fixed",
      rightEarned: undefined,
    });

    finalLength = Math.max(safeFixedPay.length, safeTaxDetails.length);

    for (let i = 0; i < finalLength; i++) {
      let obj = {
        leftName: safeFixedPay[i]?.name || '',
        leftEarned: safeFixedPay[i]?.earned ? (
          safeFixedPay[i].earned.startsWith('₹') ? 
          safeFixedPay[i].earned.slice(1) : safeFixedPay[i].earned
        ) : '',
        rightName: safeTaxDetails[i]?.name || "",
        rightEarned: safeTaxDetails[i]?.earned ? (
          safeTaxDetails[i].earned.startsWith('₹') ? 
          safeTaxDetails[i].earned.slice(1) : safeTaxDetails[i].earned
        ) : '',
      };
      finalData.push(obj);
    }

    finalData.push({
      leftName: "Total Earnings (A)",
      leftEarned: totalGrossPayEarned.startsWith('₹') ? 
        totalGrossPayEarned.slice(1) : totalGrossPayEarned,
      rightName: "Total Deductions (B)",
      rightEarned: totalDeductionsEarned.startsWith('₹') ? 
        totalDeductionsEarned.slice(1) : totalDeductionsEarned,
    });

    return finalData;
  }

  let totalData = createTotalSideData(
    grossPayVariable,
    grossPayFixed,
    deductions,
    taxes
  );

  console.log("totalData", totalData);
  // console.log("FinalData:: ",finalData);
  

  return (
    <Document>
      <Page
        size="A4"
        style={{
          flexDirection: "column",
          backgroundColor: "#FFFFFF",
          fontFamily: "Helvetica",
          width: "100%",
          height: "100%",
          justifyContent: "flex-start",
          alignItems: "flex-start",
          padding: "3% 10%",
        }}
      >
        <View
          style={{
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            width: "100%",
            height: "auto",
            fontSize: "10px",
          }}
        >
          <View style={{ width: "50%" }}>
            <Image 
              style={{ width: "200px", padding: "0px 3px" }}
              src={`${logoUrl}?noCache=${Math.random().toString()}`}
            />
          </View>
          <View
            style={{
              width: "50%",
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              padding: "10px 3px",
            }}
          >
            <Text
              style={{
                width: "70%",
                marginLeft: "auto",
                fontFamily: "Helvetica-Bold",
              }}
            >
              Address:
            </Text>
            <Text style={{ width: "70%" }}>{branchAddress}</Text>
          </View>
        </View>
        <View
          style={{
            backgroundColor: "",
            borderBottom: "1px solid black",
            borderTop: "1px solid black",
            width: "100%",
          }}
        >
          <Text
            style={{
              margin: "5px auto",
              fontFamily: "Helvetica-Bold",
              fontSize: "15px",
            }}
          >
            SALARY SLIP
          </Text>
        </View>
        <View
          style={{
            display: "flex",
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
            borderBottom: "1px solid black",
            fontSize: "10px",
            fontFamily: "Helvetica-Bold",
          }}
        >
          <Text style={{ width: "50%", margin: "5px auto" }}>
            PAYSLIP FOR MONTH
          </Text>
          <Text style={{ width: "50%", margin: "5px auto" }}>: {date}</Text>
        </View>
        <View
          style={{
            display: "flex",
            fontSize: "10px",
            flexDirection: "column",
            justifyContent: "center",
            fontFamily: "Helvetica-Bold",
            alignItems: "flex-start",
          }}
        >
          <Text
            style={{
              margin: "2px 0px",
              fontSize: "13px",
              fontFamily: "Helvetica-Bold",
              textDecoration: "underline",
            }}
          >
            Employee Details:
          </Text>
          <View
            style={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center",
              marginTop: "2px",
            }}
          >
            <Text style={{ width: "50%" }}>Employee Name</Text>
            <Text style={{ width: "50%" }}>
              : {employee?.users.firstName} {employee?.users.lastName}
            </Text>
          </View>
          <View
            style={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center",
              marginTop: "2px",
            }}
          >
            <Text style={{ width: "50%" }}>Total Working Days</Text>
            <Text style={{ width: "50%" }}>: {totalPayableDays}</Text>
          </View>

          {paidLeaves && (
            <View
              style={{
                display: "flex",
                flexDirection: "row",
                justifyContent: "center",
                alignItems: "center",
                marginTop: "2px",
              }}
            >
              <Text style={{ width: "50%" }}>This Month Paid Leave</Text>
              <Text style={{ width: "50%" }}>: {paidLeaves}</Text>
            </View>
          )}
          {unpaidLeaves && (
            <View
              style={{
                display: "flex",
                flexDirection: "row",
                justifyContent: "center",
                alignItems: "center",
                marginTop: "2px",
              }}
            >
              <Text style={{ width: "50%" }}>This Month Unpaid Leave</Text>
              <Text style={{ width: "50%" }}>: {unpaidLeaves}</Text>
            </View>
          )}
          <View
            style={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center",
              marginTop: "2px",
            }}
          >
            <Text style={{ width: "50%" }}>Basic Salary</Text>
            <Text style={{ width: "50%" }}>: {employee?.ctcInLpa}</Text>
          </View>
        </View>
        <View
          style={{
            display: "flex",
            flexDirection: "row",
            flexWrap: "wrap",
            backgroundColor: "white",
            width: "100%",
            height: "50%",
            marginTop: "20px",
          }}
        >
          <View style={{ width: "100%", fontSize: "5px" }}>
            <View style={styles.table}>
              <View style={styles.tableRow}>
                <View style={[styles.tableCell, { width: "35%" }]}>
                  <Text style={styles.bold}>Earnings</Text>
                </View>
                <View
                  style={[
                    styles.tableCell,
                    { width: "15%", textAlign: "center" },
                  ]}
                >
                  <Text style={styles.bold}>Amount (Rs.)</Text>
                </View>
                <View style={[styles.tableCell, { width: "35%" }]}>
                  <Text style={styles.bold}>Deductions</Text>
                </View>
                <View
                  style={[
                    styles.tableCell,
                    { width: "15%", textAlign: "center" },
                  ]}
                >
                  <Text style={styles.bold}>Amount (Rs.)</Text>
                </View>
              </View>
              {totalData.map((row, index) => (
                <View style={styles.tableRow} key={index}>
                  <View style={[styles.tableCell, { width: "35%" }]}>
                    <Text>{row.leftName}</Text>
                  </View>
                  <View
                    style={[
                      styles.tableCell,
                      { width: "15%", textAlign: "center" },
                    ]}
                  >
                    <Text>{row.leftEarned || ""}</Text>
                  </View>
                  <View style={[styles.tableCell, { width: "35%" }]}>
                    <Text>{row.rightName}</Text>
                  </View>
                  <View
                    style={[
                      styles.tableCell,
                      { width: "15%", textAlign: "center" },
                    ]}
                  >
                    <Text>{row.rightEarned || ""}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
          <View
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-start",
              alignItems: "flex-start",
              backgroundColor: "#FFFFFF",
              width: "100%",
              fontSize: "11px",
              padding: "10px 3px",
            }}
          >
            <Text>Net payable for the month ( A ) - ( B ) :</Text>
            <View
              style={{
                display: "flex",
                flexDirection: "row",
                width: "100%",
                paddingBottom: "15px",
                borderBottom: "1px solid black",
                justifyContent: "space-between",
                alignItems: "center",
                fontFamily: "Helvetica-Bold",
              }}
            >
              <Text>Paid in designated Salary</Text>
              <Text>Rs. {finalAmount}</Text>
            </View>
            <View
              style={{
                display: "flex",
                flexDirection: "column",
                width: "100%",
                padding: "13px 3px",
                fontFamily: "Helvetica-Bold",
                gap: "2px",
                justifyContent: "center",
                alignItems: "flex-end",
              }}
            >
              <View
                style={{
                  position: "relative",
                  width: "100%",
                  height: 80,
                  justifyContent: "flex-end",
                  alignItems: "flex-end",
                  marginTop: 10,
                }}
              >
                {/* Stamp Image */}
                {stampUrl && (
                  <Image
                    src={`${stampUrl}?noCache=${Math.random().toString()}`}
                    style={{
                      position: "absolute",
                      right: 0,
                      top: 0,
                      width: 80,
                      opacity: 0.5,
                    }}
                  />
                )}

                {/* Text Block */}
                <View
                  style={{
                    zIndex: 1,
                    width: "35%",
                    fontFamily: "Helvetica-Bold",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-end",
                  }}
                >
                  <Text>FOR WISETECH PVT. LTD.</Text>
                  <Text>Authorised Signatory.</Text>
                  <Text
                    style={{
                      fontSize: 7,
                      marginLeft: "auto",
                      textAlign: "right",
                    }}
                  >
                    This is a system generated payslip and does not require
                    signature.
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}

export default SalarySlipTemplate;