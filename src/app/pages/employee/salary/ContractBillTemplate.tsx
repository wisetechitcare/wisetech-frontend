import React, { useEffect, useState } from "react";
import { Page, Text, View, Document, StyleSheet, Font } from "@react-pdf/renderer";
import { Employee } from "@redux/slices/employee";
import { fetchBranchById, fetchCompanyOverview } from "@services/company";

Font.register({
  family: 'Noto',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/notosans/v27/o-0IIpQlx3QUlC5A4PNb4j5Ba_2c7A.ttf', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/notosans/v27/o-0NIpQlx3QUlC5A4PNjXhFlY9aA5Wl6PQ.ttf', fontWeight: 700 },
  ],
});

const C = {
  navy: '#1A2D4B',
  brand: '#AA393D',
  gold: '#B8860B',
  white: '#ffffff',
  gray50: '#f8fafc',
  gray100: '#f1f5f9',
  gray200: '#e2e8f0',
  gray300: '#cbd5e1',
  gray400: '#94a3b8',
  gray500: '#64748b',
  gray600: '#475569',
  gray700: '#334155',
  gray800: '#1e293b',
};

const parseAmt = (s: string | number): number => {
  if (typeof s === 'number') return isFinite(s) ? s : 0;
  return parseFloat((s || '0').replace(/,/g, '')) || 0;
};

const fmt0 = (n: number) => Math.trunc(n).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const rupee = (v: string | number) => `₹${fmt0(parseAmt(v))}`;

function numberToWords(n: number): string {
  const num = Math.abs(n);
  const int = Math.floor(num);
  if (int === 0) return 'Zero Rupees Only';

  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven',
    'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const t = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const h = (x: number): string => {
    if (!x) return '';
    if (x < 20) return a[x];
    if (x < 100) return t[Math.floor(x / 10)] + (x % 10 ? ' ' + a[x % 10] : '');
    return a[Math.floor(x / 100)] + ' Hundred' + (x % 100 ? ' ' + h(x % 100) : '');
  };

  const parts: string[] = [];
  if (Math.floor(int / 10000000)) parts.push(h(Math.floor(int / 10000000)) + ' Crore');
  if (Math.floor((int % 10000000) / 100000)) parts.push(h(Math.floor((int % 10000000) / 100000)) + ' Lakh');
  if (Math.floor((int % 100000) / 1000)) parts.push(h(Math.floor((int % 100000) / 1000)) + ' Thousand');
  if (int % 1000) parts.push(h(int % 1000));

  return `Rupees ${parts.join(' ')} Only`;
}

const fmtDate = (iso?: string) => {
  if (!iso) return 'N/A';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const getMonthName = (monthStr: string) => {
  const months: { [key: string]: string } = {
    'January': 'January', 'February': 'February', 'March': 'March', 'April': 'April',
    'May': 'May', 'June': 'June', 'July': 'July', 'August': 'August',
    'September': 'September', 'October': 'October', 'November': 'November', 'December': 'December'
  };
  return months[monthStr] || monthStr;
};

const F = 'Noto';
const S = StyleSheet.create({
  page: {
    fontFamily: F,
    backgroundColor: C.white,
    paddingTop: 0,
    paddingBottom: 0,
    paddingLeft: 0,
    paddingRight: 0,
    fontSize: 9,
    color: C.gray800,
  },
  // Navy Header
  navyHeader: {
    backgroundColor: C.navy,
    padding: 12,
    paddingLeft: 16,
    paddingRight: 16,
  },
  empName: {
    fontFamily: F,
    fontWeight: 700,
    fontSize: 20,
    color: C.white,
    marginBottom: 0,
  },
  // Location Bar
  locationBar: {
    backgroundColor: C.gray100,
    padding: 8,
    paddingLeft: 16,
    paddingRight: 16,
    textAlign: 'center',
  },
  empLocation: {
    fontSize: 10,
    color: C.gray600,
    fontStyle: 'italic',
  },
  // Gold Bill Bar
  goldBillBar: {
    backgroundColor: C.gold,
    padding: 6,
    paddingLeft: 16,
    paddingRight: 16,
    textAlign: 'center',
  },
  billBarText: {
    fontFamily: F,
    fontWeight: 700,
    fontSize: 14,
    color: C.white,
    textTransform: 'uppercase',
  },
  // Main Content
  content: {
    padding: 12,
    paddingLeft: 16,
    paddingRight: 16,
  },
  // Bill Info Table
  billInfoTable: {
    marginBottom: 12,
    width: '100%',
    borderWidth: 0.5,
    borderColor: C.gray300,
  },
  billInfoRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: C.gray300,
  },
  billInfoLabel: {
    width: '20%',
    padding: 5,
    backgroundColor: C.gray50,
    fontSize: 8,
    fontWeight: 700,
    color: C.gray600,
  },
  billInfoValue: {
    width: '80%',
    padding: 5,
    fontSize: 9,
    color: C.gray800,
  },
  // Bill Items Table
  itemsTable: {
    marginBottom: 0,
    width: '100%',
    borderWidth: 0.5,
    borderColor: C.gray300,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: C.navy,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tableHeaderCell: {
    fontFamily: F,
    fontWeight: 700,
    fontSize: 8,
    color: C.white,
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: C.gray300,
    minHeight: 50,
  },
  tableCell: {
    fontSize: 9,
    color: C.gray700,
  },
  tableCellRight: {
    fontSize: 9,
    color: C.gray700,
    textAlign: 'right',
  },
  // Total Row
  totalSection: {
    flexDirection: 'row',
    backgroundColor: C.navy,
    paddingVertical: 6,
    paddingHorizontal: 8,
    color: C.white,
    fontWeight: 700,
    borderBottomWidth: 0.5,
    borderBottomColor: C.gray300,
  },
  totalLabel: {
    flex: 2,
    fontSize: 9,
    fontWeight: 700,
    color: C.white,
  },
  totalAmount: {
    flex: 1,
    fontSize: 9,
    fontWeight: 700,
    color: C.white,
    textAlign: 'right',
  },
  // Amount Words
  amountWordsSection: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: C.gray300,
    backgroundColor: C.gray50,
  },
  amountWordsLabel: {
    flex: 1,
    fontSize: 8,
    fontWeight: 700,
    color: C.gray600,
  },
  amountWordsText: {
    flex: 2,
    fontSize: 9,
    color: C.gray800,
  },
  // Bank Details
  bankDetailsTitle: {
    paddingVertical: 5,
    paddingHorizontal: 8,
    backgroundColor: C.navy,
    color: C.white,
    fontWeight: 700,
    fontSize: 8,
    textTransform: 'uppercase',
    borderBottomWidth: 0.5,
    borderBottomColor: C.gray300,
  },
  bankRow: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: C.gray300,
  },
  bankLabel: {
    width: '30%',
    fontSize: 8,
    fontWeight: 700,
    color: C.gray600,
  },
  bankValue: {
    width: '70%',
    fontSize: 9,
    color: C.gray800,
  },
  // Signature
  signatureSection: {
    flexDirection: 'row',
    marginTop: 12,
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  signatureCol: {
    width: '50%',
    textAlign: 'center',
  },
  signatureLine: {
    borderTopWidth: 0.5,
    borderTopColor: C.gray400,
    marginBottom: 3,
    height: 20,
  },
  signatureText: {
    fontSize: 7,
    fontWeight: 700,
    color: C.gray700,
  },
  // Footer - Gold Bar
  footerGoldBar: {
    backgroundColor: C.gold,
    paddingVertical: 8,
    paddingHorizontal: 16,
    textAlign: 'center',
  },
  footerGoldTitle: {
    fontFamily: F,
    fontWeight: 700,
    fontSize: 9,
    color: C.white,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  footerGoldSubtitle: {
    fontFamily: F,
    fontWeight: 700,
    fontSize: 7,
    color: C.white,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  paymentGrid: {
    flexDirection: 'row',
    gap: 0,
  },
  paymentBox: {
    flex: 1,
    backgroundColor: C.white,
    padding: 6,
    textAlign: 'center',
    borderRightWidth: 0.5,
    borderRightColor: C.gold,
  },
  paymentBoxLast: {
    flex: 1,
    backgroundColor: C.white,
    padding: 6,
    textAlign: 'center',
  },
  paymentLabel: {
    fontSize: 6,
    fontWeight: 700,
    color: C.gray600,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  paymentValue: {
    fontSize: 9,
    fontWeight: 700,
    color: C.brand,
  },
  // Footer Text
  footerText: {
    backgroundColor: C.gray100,
    paddingVertical: 6,
    paddingHorizontal: 16,
    textAlign: 'center',
    fontSize: 8,
    color: C.gray600,
    borderTopWidth: 0.5,
    borderTopColor: C.gray300,
  },
});

interface BillItem {
  description: string;
  amount: number;
}

interface ContractBillTemplateProps {
  employee: Employee;
  billNumber: string;
  billDate: string;
  month: string;
  year: number;
  billItems: BillItem[];
  totalAmount: number;
  tdsAmount: number;
  paidAmount: number;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  panNumber?: string;
  mobileNumber?: string;
}

export default function ContractBillTemplate({
  employee,
  billNumber,
  billDate,
  month,
  year,
  billItems,
  totalAmount,
  tdsAmount,
  paidAmount,
  bankName = 'N/A',
  accountNumber = 'N/A',
  ifscCode = 'N/A',
  panNumber = 'N/A',
  mobileNumber = 'N/A',
}: ContractBillTemplateProps) {
  const [branchAddress, setBranchAddress] = useState('');
  const [companyName, setCompanyName] = useState('');

  useEffect(() => {
    fetchCompanyOverview().then((r: any) => {
      const o = r?.data?.companyOverview?.[0] || {};
      setCompanyName(o.name || '');
    }).catch(() => { });
  }, []);

  useEffect(() => {
    if (employee?.branchId) {
      fetchBranchById(employee.branchId).then(r => {
        setBranchAddress(r?.data?.branch?.address || '');
      }).catch(() => { });
    }
  }, [employee]);

  const empName = `${employee?.users?.firstName || ''} ${employee?.users?.lastName || ''}`.trim();
  const empLocation = (employee as any)?.branch?.city || 'Mumbai';
  const balance = totalAmount - tdsAmount - paidAmount;
  const monthName = getMonthName(month);

  return (
    <Document>
      <Page size="A4" style={S.page}>
        {/* Navy Header */}
        <View style={S.navyHeader}>
          <Text style={S.empName}>{empName || 'Employee Name'}</Text>
        </View>

        {/* Location Bar */}
        <View style={S.locationBar}>
          <Text style={S.empLocation}>{empLocation}</Text>
        </View>

        {/* Gold Bill Bar */}
        <View style={S.goldBillBar}>
          <Text style={S.billBarText}>BILL</Text>
        </View>

        {/* Main Content */}
        <View style={S.content}>
          {/* Bill Info Table */}
          <View style={S.billInfoTable}>
            <View style={S.billInfoRow}>
              <Text style={S.billInfoLabel}>Bill No:</Text>
              <Text style={S.billInfoValue}>{billNumber}</Text>
            </View>
            <View style={S.billInfoRow}>
              <Text style={S.billInfoLabel}>Date:</Text>
              <Text style={S.billInfoValue}>{fmtDate(billDate)}</Text>
              <Text style={[S.billInfoLabel, { width: '10%', backgroundColor: 'transparent' }]}>Month:</Text>
              <Text style={[S.billInfoValue, { width: '10%' }]}>{monthName}</Text>
            </View>
            <View style={S.billInfoRow}>
              <Text style={S.billInfoLabel}>Messer's:</Text>
              <Text style={S.billInfoValue}>{companyName || 'WiseTech MEP CONSULTANTS Pvt. Ltd.'}</Text>
            </View>
            <View style={[S.billInfoRow, { borderBottomWidth: 0 }]}>
              <Text style={S.billInfoLabel}>Address:</Text>
              <Text style={S.billInfoValue}>{branchAddress || '1st Floor, Loanwat Compound, Ghaswala Estate, Next to Millat Hospital, SV Road, Jogeshwari (W), Mumbai- 400102'}</Text>
            </View>
          </View>

          {/* Items Table */}
          <View style={S.itemsTable}>
            <View style={S.tableHeader}>
              <Text style={[S.tableHeaderCell, { width: '10%', textAlign: 'center' }]}>Sr No</Text>
              <Text style={[S.tableHeaderCell, { width: '60%' }]}>Description</Text>
              <Text style={[S.tableHeaderCell, { width: '30%', textAlign: 'right' }]}>Amount</Text>
            </View>

            {billItems.map((item, idx) => (
              <View key={idx} style={S.tableRow}>
                <Text style={[S.tableCell, { width: '10%', textAlign: 'center' }]}>{idx + 1}</Text>
                <Text style={[S.tableCell, { width: '60%' }]}>{item.description}</Text>
                <Text style={[S.tableCellRight, { width: '30%' }]}>{rupee(item.amount)}</Text>
              </View>
            ))}

            {/* Total Row */}
            <View style={S.totalSection}>
              <Text style={S.totalLabel}>TOTAL</Text>
              <Text style={S.totalAmount}>{rupee(totalAmount)}</Text>
            </View>

            {/* Amount in Words */}
            <View style={S.amountWordsSection}>
              <Text style={S.amountWordsLabel}>RUPEES:</Text>
              <Text style={S.amountWordsText}>{numberToWords(totalAmount)}</Text>
            </View>
          </View>

          {/* Bank Details */}
          <View style={{ marginTop: 12, marginBottom: 12, borderWidth: 0.5, borderColor: C.gray300 }}>
            {/* Header Row */}
            <View style={{ flexDirection: 'row', backgroundColor: C.gray50, borderBottomWidth: 0.5, borderBottomColor: C.gray300 }}>
              <Text style={[S.bankDetailsTitle, { width: '62%', backgroundColor: 'transparent', color: C.navy, borderBottomWidth: 0 }]}>Bank Details</Text>
              <Text style={[S.bankDetailsTitle, { width: '38%', backgroundColor: 'transparent', color: C.navy, borderLeftWidth: 0.5, borderLeftColor: C.gray300, borderBottomWidth: 0 }]}>For</Text>
            </View>
            
            {/* Body */}
            <View style={{ flexDirection: 'row' }}>
              <View style={{ width: '62%', borderRightWidth: 0.5, borderRightColor: C.gray300 }}>
                <View style={S.bankRow}>
                  <Text style={S.bankLabel}>Account no</Text>
                  <Text style={S.bankValue}>{accountNumber}</Text>
                </View>
                <View style={S.bankRow}>
                  <Text style={S.bankLabel}>Name</Text>
                  <Text style={S.bankValue}>{bankName}</Text>
                </View>
                <View style={S.bankRow}>
                  <Text style={S.bankLabel}>IFSC</Text>
                  <Text style={S.bankValue}>{ifscCode}</Text>
                </View>
                <View style={S.bankRow}>
                  <Text style={S.bankLabel}>PAN No:</Text>
                  <Text style={S.bankValue}>{panNumber}</Text>
                </View>
                <View style={[S.bankRow, { borderBottomWidth: 0 }]}>
                  <Text style={S.bankLabel}>Mobile No</Text>
                  <Text style={S.bankValue}>{mobileNumber}</Text>
                </View>
              </View>
              <View style={{ width: '38%', alignItems: 'center', justifyContent: 'flex-start', paddingTop: 10 }}>
                <Text style={{ fontSize: 9, color: C.gray800 }}>{empName}</Text>
              </View>
            </View>
          </View>

          {/* Signature */}
          <View style={S.signatureSection}>
            <View style={S.signatureCol}>
              <View style={S.signatureLine} />
              <Text style={S.signatureText}>Authorized Signatory</Text>
            </View>
            <View style={S.signatureCol}>
              <View style={S.signatureLine} />
              <Text style={S.signatureText}>For {empName}</Text>
            </View>
          </View>
        </View>

        {/* Gold Footer */}
        <View style={S.footerGoldBar}>
          <Text style={S.footerGoldTitle}>{companyName || 'WiseTech'} MEP CONSULTANTS Pvt. Ltd.</Text>
          <Text style={S.footerGoldSubtitle}>Payment Details</Text>
          <View style={S.paymentGrid}>
            <View style={S.paymentBox}>
              <Text style={S.paymentLabel}>Basic</Text>
              <Text style={S.paymentValue}>{rupee(totalAmount)}</Text>
            </View>
            <View style={S.paymentBox}>
              <Text style={S.paymentLabel}>TDS</Text>
              <Text style={[S.paymentValue, { color: C.brand }]}>-{rupee(tdsAmount)}</Text>
            </View>
            <View style={S.paymentBox}>
              <Text style={S.paymentLabel}>Paid</Text>
              <Text style={S.paymentValue}>{rupee(paidAmount)}</Text>
            </View>
            <View style={S.paymentBoxLast}>
              <Text style={S.paymentLabel}>Balance</Text>
              <Text style={[S.paymentValue, { color: balance < 0 ? C.brand : '#16a34a' }]}>
                {balance < 0 ? '-' : ''}{rupee(Math.abs(balance))}
              </Text>
            </View>
          </View>
        </View>

        {/* Footer Text */}
        <View style={S.footerText}>
          <Text>Thank You For Your Business!</Text>
        </View>
      </Page>
    </Document>
  );
}
