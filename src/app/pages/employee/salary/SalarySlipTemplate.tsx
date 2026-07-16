import React, { useEffect, useState } from "react";
import { Page, Text, View, Document, StyleSheet, Image, Font } from "@react-pdf/renderer";
import { Employee } from "@redux/slices/employee";
import { fetchBranchById, fetchCompanyLogo, fetchCompanyOverview } from "@services/company";

// ── Register Noto Sans for full ₹ (U+20B9) support ──────────────────────────
Font.register({
  family: 'Noto',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/notosans/v27/o-0IIpQlx3QUlC5A4PNb4j5Ba_2c7A.ttf', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/notosans/v27/o-0NIpQlx3QUlC5A4PNjXhFlY9aA5Wl6PQ.ttf', fontWeight: 700 },
  ],
});

// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
  navy: '#1A2D4B',
  navyDark: '#0f1e34',
  brand: '#1E3A8A',
  green: '#16a34a', greenBg: '#f0fdf4', greenBd: '#bbf7d0',
  red: '#dc2626', redBg: '#fff5f5', redBd: '#fecaca',
  orange: '#ea580c', orangeBg: '#fff7ed', orangeBd: '#fed7aa',
  blue: '#1d6fc5', blueBg: '#eff6ff', blueBd: '#bfdbfe',
  amber: '#d97706', amberBg: '#fffbeb', amberBd: '#fde68a',
  gray50: '#f8fafc', gray100: '#f1f5f9', gray200: '#e2e8f0',
  gray300: '#cbd5e1', gray400: '#94a3b8', gray500: '#64748b',
  gray600: '#475569', gray700: '#334155', gray800: '#1e293b',
  white: '#ffffff',
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const parseAmt = (s: string | number): number => {
  if (typeof s === 'number') return isFinite(s) ? s : 0;
  return parseFloat((s || '0').replace(/,/g, '')) || 0;
};
const fmt0 = (n: number) => Math.trunc(n).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const fmt2 = (n: number) => Math.trunc(n).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const rupee = (v: string | number) => `₹${fmt0(parseAmt(v))}`;

function numberToWords(n: number): string {
  const num = Math.abs(n);
  const int = Math.floor(num);
  const paise = Math.round((num - int) * 100);
  if (int === 0 && paise === 0) return 'Zero Rupees Only';
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
  return `Rupees ${parts.join(' ')}${paise > 0 ? ` and ${h(paise)} Paise` : ''} Only`;
}

const fmtDate = (iso?: string) => {
  if (!iso) return 'N/A';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};
const nowStr = () => {
  const d = new Date();
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ', ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
};
const parsePeriod = (date: string, startDate?: string, endDate?: string) => {
  if (startDate && endDate) return { start: fmtDate(startDate), end: fmtDate(endDate) };
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const [mn, yr] = date.split(' ');
  const mIdx = months.indexOf(mn);
  const y = parseInt(yr) || new Date().getFullYear();
  const last = new Date(y, mIdx + 1, 0).getDate();
  const p = (n: number) => String(n).padStart(2, '0');
  return { start: `01 ${mn.slice(0, 3)} ${y}`, end: `${p(last)} ${mn.slice(0, 3)} ${y}` };
};

// ── Styles (Pixel-perfect clone of the image, no extra margins/spacing) ─────
const F = 'Noto';
const S = StyleSheet.create({
  page: {
    fontFamily: F,
    backgroundColor: C.white,
    paddingTop: 14,
    paddingBottom: 14,
    paddingLeft: 20,
    paddingRight: 20,
    fontSize: 8,
    color: C.gray800,
  },
  hRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  hLeft: { flexDirection: 'row', alignItems: 'center', width: 190 },
  hCtr: { flex: 1, alignItems: 'center', paddingHorizontal: 6 },
  hRight: { width: 170, alignItems: 'flex-end' },
  logoBox: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: C.navy,
    justifyContent: 'center', alignItems: 'center', marginRight: 7, flexShrink: 0
  },
  logoImg: { width: 40, height: 40, borderRadius: 20 },
  logoTxt: { fontFamily: F, fontWeight: 700, fontSize: 15, color: C.white },
  co1: { fontFamily: F, fontWeight: 700, fontSize: 9.5, color: C.navy },
  co2: { fontSize: 7, color: C.gray500, marginTop: 1 },
  co3: { fontSize: 6.5, color: C.gray400, marginTop: 2 },
  title1: { fontFamily: F, fontWeight: 700, fontSize: 19, color: C.brand, letterSpacing: 0.5 },
  title2: { fontSize: 7, color: C.gray500, marginTop: 2, letterSpacing: 0.3 },
  addrTxt: { fontSize: 6.5, color: C.gray600, textAlign: 'right', marginBottom: 1.5 },
  cinTxt: { fontSize: 5.5, color: C.gray400, textAlign: 'right', marginTop: 1 },
  divider: { borderTopWidth: 1.5, borderTopColor: C.brand, marginBottom: 6 },
  thinDivider: { borderTopWidth: 0.5, borderTopColor: C.gray200, marginBottom: 4 },
  pBar: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    borderWidth: 0.8, borderColor: C.gray200, borderRadius: 4,
    paddingVertical: 5, paddingHorizontal: 12, marginBottom: 6, backgroundColor: C.gray50
  },
  pItem: { flexDirection: 'row', alignItems: 'center' },
  pLbl: { fontFamily: F, fontWeight: 700, fontSize: 7.5, color: C.gray600, letterSpacing: 0.2 },
  pVal: { fontFamily: F, fontWeight: 700, fontSize: 8, color: C.navy, marginLeft: 4 },
  pSep: { width: 0.8, height: 14, backgroundColor: C.gray300, marginHorizontal: 18 },
  empCard: {
    flexDirection: 'row', borderWidth: 0.8, borderColor: C.gray200,
    borderRadius: 5, padding: 8, marginBottom: 6
  },
  empLeft: { flexDirection: 'row', alignItems: 'flex-start', width: 130, marginRight: 8 },
  avatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: C.blueBg,
    justifyContent: 'center', alignItems: 'center', marginRight: 8, flexShrink: 0,
    borderWidth: 1.5, borderColor: C.blue
  },
  avatarImg: { width: 40, height: 40, borderRadius: 20 },
  avatarTxt: { fontFamily: F, fontWeight: 700, fontSize: 14, color: C.blue },
  empName: { fontFamily: F, fontWeight: 700, fontSize: 10.5, color: C.navy },
  empBadge: {
    backgroundColor: C.blue, paddingHorizontal: 4, paddingVertical: 1.5,
    borderRadius: 3, marginLeft: 4
  },
  empBadgeTxt: { fontFamily: F, fontWeight: 700, fontSize: 6, color: C.white },
  empNameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  empDesig: { fontSize: 7.5, color: C.gray500, marginBottom: 1 },
  empDept: { fontSize: 7, color: C.gray400 },
  empRight: { flex: 1 },
  infoGrid: { flexDirection: 'row' },
  infoCol: { flex: 1, marginRight: 5 },
  infoItem: { marginBottom: 5 },
  infoLbl: { fontSize: 6, color: C.gray400, textTransform: 'uppercase', letterSpacing: 0.2, marginBottom: 1 },
  infoVal: { fontFamily: F, fontWeight: 700, fontSize: 7.5, color: C.gray700 },
  sumRow: { flexDirection: 'row', marginBottom: 6, gap: 5 },
  sumCard: {
    flex: 1, borderRadius: 5, padding: 7, flexDirection: 'row', alignItems: 'center',
    borderWidth: 0.8
  },
  sumIcon: {
    width: 26, height: 26, borderRadius: 13, justifyContent: 'center',
    alignItems: 'center', marginRight: 6, flexShrink: 0
  },
  sumIcoTxt: { fontFamily: F, fontWeight: 700, fontSize: 10, color: C.white },
  sumLbl: { fontSize: 6, textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 2 },
  sumAmt: { fontFamily: F, fontWeight: 700, fontSize: 10 },
  bRow: { flexDirection: 'row', marginBottom: 5, gap: 6 },
  bCol: { flex: 1 },
  secHdr: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  secIcon: {
    width: 14, height: 14, borderRadius: 2, justifyContent: 'center',
    alignItems: 'center', marginRight: 4
  },
  secIcoTxt: { fontFamily: F, fontWeight: 700, fontSize: 8, color: C.white },
  secTitle: { fontFamily: F, fontWeight: 700, fontSize: 7.5, textTransform: 'uppercase', letterSpacing: 0.4 },
  tBox: { borderWidth: 0.5, borderColor: C.gray200, borderRadius: 3, overflow: 'hidden' },
  subHdr: { paddingVertical: 3.5, paddingHorizontal: 6 },
  subTxt: { fontFamily: F, fontWeight: 700, fontSize: 6.5, letterSpacing: 0.2 },
  tHead: {
    flexDirection: 'row', paddingVertical: 3.5, paddingHorizontal: 6,
    borderBottomWidth: 0.5, borderBottomColor: C.gray200
  },
  thTxt: { fontFamily: F, fontWeight: 700, fontSize: 6, color: C.gray500, textTransform: 'uppercase' },
  tRow0: {
    flexDirection: 'row', paddingVertical: 3.5, paddingHorizontal: 6,
    borderBottomWidth: 0.5, borderBottomColor: C.gray100
  },
  tRow1: {
    flexDirection: 'row', paddingVertical: 3.5, paddingHorizontal: 6,
    backgroundColor: C.gray50, borderBottomWidth: 0.5, borderBottomColor: C.gray100
  },
  tCell: { fontSize: 7, color: C.gray700 },
  tCellC: { fontSize: 7, color: C.gray700, textAlign: 'center' },
  tCellR: { fontSize: 7, color: C.gray700, textAlign: 'right' },
  tRed: { fontSize: 7, color: C.red, textAlign: 'right' },
  subTot: {
    flexDirection: 'row', paddingVertical: 4, paddingHorizontal: 6,
    borderTopWidth: 0.5, borderTopColor: C.gray200
  },
  stTxt: { fontFamily: F, fontWeight: 700, fontSize: 6.5, color: C.gray600 },
  stVal: { fontFamily: F, fontWeight: 700, fontSize: 7, textAlign: 'right' },
  totGreen: { flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 6, backgroundColor: C.green },
  totRed: { flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 6, backgroundColor: C.red },
  totTxt: { fontFamily: F, fontWeight: 700, fontSize: 7.5, color: C.white },
  paymentHistoryBox: {
    backgroundColor: C.gray50, borderRadius: 5, borderWidth: 0.8, borderColor: C.gray200,
    padding: 8, marginBottom: 6
  },
  phTitle: { fontFamily: F, fontWeight: 700, fontSize: 7.5, color: C.navy, textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 5 },
  phTable: { borderTopWidth: 0.5, borderTopColor: C.gray200 },
  phHeader: { flexDirection: 'row', paddingVertical: 3.5, paddingHorizontal: 5, borderBottomWidth: 0.5, borderBottomColor: C.gray300, backgroundColor: C.gray100 },
  phHeaderText: { fontFamily: F, fontWeight: 700, fontSize: 5.5, color: C.gray600, textTransform: 'uppercase', letterSpacing: 0.2 },
  phRow: { flexDirection: 'row', paddingVertical: 3, paddingHorizontal: 5, borderBottomWidth: 0.5, borderBottomColor: C.gray100 },
  phRowAlt: { flexDirection: 'row', paddingVertical: 3, paddingHorizontal: 5, borderBottomWidth: 0.5, borderBottomColor: C.gray100, backgroundColor: C.gray50 },
  phCell: { fontSize: 6, color: C.gray700 },
  phCellRight: { fontSize: 6, color: C.gray700, textAlign: 'right' },
  phFallback: { flexDirection: 'row', paddingVertical: 4, paddingHorizontal: 5, justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 0.5, borderBottomColor: C.gray100 },
  phFallbackLabel: { fontSize: 6, color: C.gray600, fontFamily: F, fontWeight: 700 },
  phFallbackValue: { fontSize: 6, color: C.navy, fontFamily: F, fontWeight: 700, textAlign: 'right' },
  fInfoRow: {
    flexDirection: 'row', borderWidth: 0.5, borderColor: C.gray200,
    borderRadius: 3, overflow: 'hidden', marginBottom: 6
  },
  fInfoCell: { flex: 1, padding: 6, borderRightWidth: 0.5, borderRightColor: C.gray200 },
  fInfoLast: { flex: 1.6, padding: 6 },
  fInfoLbl: { fontSize: 6, color: C.gray400, textTransform: 'uppercase', letterSpacing: 0.2, marginBottom: 2 },
  fInfoVal: { fontFamily: F, fontWeight: 700, fontSize: 7, color: C.gray700 },
  fInfoNote: { fontSize: 6, color: C.gray500, lineHeight: 1.4 },
  sigRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 5 },
  sigLeft: { flex: 1, alignItems: 'center' },
  sigCtr: { flex: 1.5, alignItems: 'center' },
  sigRight: { flex: 1, alignItems: 'center' },
  sigImg: { height: 28, width: 70, objectFit: 'contain', marginBottom: 2 },
  sigLine: { width: '65%', borderTopWidth: 0.5, borderTopColor: C.gray400, marginBottom: 3 },
  sigName: { fontSize: 7, color: C.gray600 },
  sigLbl: { fontSize: 6.5, color: C.gray500, textTransform: 'uppercase', letterSpacing: 0.3 },
  checkCirc: {
    width: 20, height: 20, borderRadius: 10, backgroundColor: C.green,
    justifyContent: 'center', alignItems: 'center', marginBottom: 3
  },
  checkTxt: { fontFamily: F, fontWeight: 700, fontSize: 10, color: C.white },
  thankTxt: { fontSize: 7, color: C.gray600, textAlign: 'center', lineHeight: 1.4 },
  confBar: {
    backgroundColor: C.navy, borderRadius: 3, paddingVertical: 5,
    paddingHorizontal: 10, flexDirection: 'row', justifyContent: 'center', alignItems: 'center'
  },
  confTxt: { fontSize: 6.5, color: 'rgba(255,255,255,0.8)' },
});

// ── Component ─────────────────────────────────────────────────────────────────
interface PaymentRecord {
  id?: string;
  amount: number;
  paidAt: string;
  paymentMethod?: string;
  transactionId?: string | null;
}

interface PaymentHistory {
  salaryPayments: PaymentRecord[];
  netPayable: number;
  amountPaid: number;
}

export default function SalarySlipTemplate({
  grossPayVariable,
  grossPayFixed,
  deductions,
  taxes,
  totalGrossPayEarned,
  totalDeductionsEarned,
  employee,
  finalAmount,
  totalPayableDays,
  date,
  paidLeaves,
  unpaidLeaves,
  pipeline,
  hourlySalary: hourlySalaryProp,
  presentDays,
  monthStartDate,
  monthEndDate,
  paymentHistory: paymentHistoryProp,
  salaryId,
}: {
  grossPayVariable: { name: string; value?: string; earned: string }[];
  grossPayFixed: { name: string; value?: string; earned: string }[];
  deductions: { name: string; value?: string; earned: string }[];
  taxes: { name: string; value?: string; earned: string }[];
  totalGrossPayEarned: string;
  totalDeductionsEarned: string;
  employee: Employee;
  finalAmount: string;
  totalPayableDays: number;
  date: string;
  paidLeaves: number;
  unpaidLeaves: number;
  pipeline?: {
    grossPay: string;
    totalVariableDeductions: string;
    intermediateSalary: string;
    totalFixedDeductions: string;
    finalNetSalary: string;
    variableDeductions: { name: string; earned: string }[];
    fixedDeductions: { name: string; earned: string }[];
  };
  hourlySalary?: number;
  presentDays?: number;
  monthStartDate?: string;
  monthEndDate?: string;
  paymentHistory?: PaymentHistory | null;
  salaryId?: string;
}) {
  const [logoUrl, setLogoUrl] = useState('');
  const [stampUrl, setStampUrl] = useState('');
  const [branchAddress, setBranchAddress] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [companyWeb, setCompanyWeb] = useState('');
  const [companyCIN, setCompanyCIN] = useState('');
  const [companyGST, setCompanyGST] = useState('');
  const [companyName, setCompanyName] = useState('');

  useEffect(() => {
    fetchCompanyLogo().then(r => {
      setLogoUrl(r?.data?.logo || '');
      setStampUrl(r?.data?.salaryStamp || '');
    }).catch(() => { });
    fetchCompanyOverview().then((r: any) => {
      const o = r?.data?.companyOverview?.[0] || {};
      setCompanyName(o.name || '');
      setCompanyEmail(o.superAdminEmail || '');
      setCompanyPhone(o.contactNumber || '');
      setCompanyWeb(o.websiteUrl || '');
      setCompanyCIN(o.certificateOfIncorporation || '');
      setCompanyGST(o.gstNumber || '');
    }).catch(() => { });
  }, []);

  useEffect(() => {
    if (employee?.branchId) {
      fetchBranchById(employee.branchId).then(r => {
        setBranchAddress(r?.data?.branch?.address || '');
      }).catch(() => { });
    }
  }, [employee]);

  // Employee data
  const empName = `${employee?.users?.firstName || ''} ${employee?.users?.lastName || ''}`.trim();
  const empId = (employee as any)?.wiseEmployeeId || (employee as any)?.employeeCode || 'N/A';
  const designation = (employee as any)?.designations?.role || 'N/A';
  const department = (employee as any)?.departments?.name || 'N/A';
  const doj = employee?.dateOfJoining ? fmtDate(employee.dateOfJoining as string) : 'N/A';
  const empType = (employee as any)?.employeeType || 'Full Time';
  const bankName = (employee as any)?.bankName || 'N/A';
  const acctLast4 = (employee as any)?.accountNumber ? `**** ${String((employee as any).accountNumber).slice(-4)}` : 'N/A';
  const uanNo = (employee as any)?.uan || (employee as any)?.pfNumber || 'N/A';
  const initials = empName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase() || '?';
  const avatarSrc = employee?.avatar;

  // Amounts
  const grossEarned = parseAmt(pipeline?.grossPay || totalGrossPayEarned);
  const attAdj = parseAmt(pipeline?.totalVariableDeductions || '0');
  const fixedDed = parseAmt(pipeline?.totalFixedDeductions || '0');
  const totalDed = fixedDed + attAdj || parseAmt(totalDeductionsEarned);
  const netPay = parseAmt(pipeline?.finalNetSalary || finalAmount);
  const leaveDays = (paidLeaves || 0) + (unpaidLeaves || 0);
  const hourlySal = hourlySalaryProp || (employee as any)?.hourlySalary || 0;
  const dailySal = hourlySal * 8;

  // Period
  const { start: pStart, end: pEnd } = parsePeriod(date, monthStartDate, monthEndDate);
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const [mName, mYr] = date.split(' ');
  const mIdx = months.indexOf(mName);
  const yr = parseInt(mYr) || new Date().getFullYear();
  const psMonth = (mIdx + 1).toString().padStart(2, '0');
  const empNum = parseInt((employee?.id || '').slice(-4), 16) || 124;
  const payslipId = `PS-${yr}-${psMonth}-${String(empNum).padStart(6, '0').slice(0, 6)}`;

  // Rate helpers
  const varRate = (i: number) => {
    if (!hourlySal) return 'N/A';
    const nm = (grossPayVariable[i]?.name || '').toLowerCase().replace(/\s/g, '');
    return (nm.includes('workingtime') || nm.includes('overtime'))
      ? `₹${hourlySal.toFixed(2)}/Hour`
      : `₹${dailySal.toFixed(2)}/Day`;
  };
  const dedRate = (i: number) => {
    const nm = (deductions[i]?.name || '').toLowerCase();
    return (nm.includes('late') && dailySal) ? `₹${dailySal.toFixed(2)}/Day` : 'N/A';
  };
  const isPercent = (v?: string) => (v || '').trim().endsWith('%');
  const dedTypeLbl = (v?: string) => isPercent(v) ? 'Percentage' : 'Fixed';
  const dedRateDsp = (v?: string) => {
    if (!v || v === '-') return 'N/A';
    if (isPercent(v)) return v;
    const n = parseAmt(v);
    return n > 0 ? `₹${n.toFixed(2)}` : 'N/A';
  };
  const dedBase = (v?: string) => isPercent(v) ? rupee(grossEarned) : 'N/A';

  const varSubtotal = grossPayVariable.reduce((a, r) => a + parseAmt(r.earned), 0);
  const fixedSubtotal = grossPayFixed.reduce((a, r) => a + parseAmt(r.earned), 0);
  const attSubtotal = deductions.reduce((a, r) => a + parseAmt(r.earned), 0);
  const govSubtotal = taxes.reduce((a, r) => a + parseAmt(r.earned), 0);

  return (
    <Document>
      <Page size="A4" style={S.page}>
        {/* Header */}
        <View style={S.hRow}>
          <View style={S.hLeft}>
            <View style={S.logoBox}>
              {logoUrl ? <Image src={`${logoUrl}?nc=${Date.now()}`} style={S.logoImg} /> : <Text style={S.logoTxt}>W</Text>}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={S.co1}>{companyName || 'WiseTech'}</Text>
              <Text style={S.co2}>MEP CONSULTANTS PVT. LTD.</Text>
              <Text style={S.co3}>Engineering · Design · Excellence</Text>
            </View>
          </View>
          <View style={S.hCtr}>
            <Text style={S.title1}>SALARY SLIP</Text>
            <Text style={S.title2}>Monthly Payroll Statement</Text>
          </View>
          <View style={S.hRight}>
            {branchAddress ? <Text style={S.addrTxt}>{branchAddress}</Text> : null}
            {companyEmail ? <Text style={S.addrTxt}>{companyEmail}</Text> : null}
            {companyPhone ? <Text style={S.addrTxt}>{companyPhone}</Text> : null}
            {companyWeb ? <Text style={S.addrTxt}>{companyWeb}</Text> : null}
            {companyCIN ? <Text style={S.cinTxt}>CIN: {companyCIN}</Text> : null}
            {companyGST ? <Text style={S.cinTxt}>GSTIN: {companyGST}</Text> : null}
          </View>
        </View>
        <View style={S.divider} />

        {/* Pay Period Bar */}
        <View style={S.pBar}>
          <View style={S.pItem}><Text style={S.pLbl}>PAY MONTH :</Text><Text style={S.pVal}>{date}</Text></View>
          <View style={S.pSep} />
          <View style={S.pItem}><Text style={S.pLbl}>PAY PERIOD :</Text><Text style={S.pVal}>{pStart} - {pEnd}</Text></View>
        </View>

        {/* Employee Card */}
        <View style={S.empCard}>
          <View style={S.empLeft}>
            <View style={S.avatar}>
              {avatarSrc ? <Image src={`${avatarSrc}?nc=${Date.now()}`} style={S.avatarImg} /> : <Text style={S.avatarTxt}>{initials}</Text>}
            </View>
            <View style={{ flex: 1 }}>
              <View style={S.empNameRow}>
                <Text style={S.empName}>{empName || 'N/A'}</Text>
                <View style={S.empBadge}><Text style={S.empBadgeTxt}>{empId}</Text></View>
              </View>
              <Text style={S.empDesig}>Designation : {designation}</Text>
              <Text style={S.empDept}>Department : {department}</Text>
            </View>
          </View>
          <View style={S.empRight}>
            <View style={S.infoGrid}>
              <View style={S.infoCol}>
                <View style={S.infoItem}><Text style={S.infoLbl}>Joining Date</Text><Text style={S.infoVal}>{doj}</Text></View>
                <View style={S.infoItem}><Text style={S.infoLbl}>Employment Type</Text><Text style={S.infoVal}>{empType}</Text></View>
                <View style={S.infoItem}><Text style={S.infoLbl}>Pay Mode</Text><Text style={S.infoVal}>Bank Transfer</Text></View>
              </View>
              <View style={S.infoCol}>
                <View style={S.infoItem}><Text style={S.infoLbl}>Total Working Days</Text><Text style={S.infoVal}>{totalPayableDays || 0}</Text></View>
                <View style={S.infoItem}><Text style={S.infoLbl}>Present Days</Text><Text style={S.infoVal}>{presentDays ?? totalPayableDays ?? 0}</Text></View>
                <View style={S.infoItem}><Text style={S.infoLbl}>Leave Days</Text><Text style={S.infoVal}>{leaveDays}</Text></View>
              </View>
              <View style={[S.infoCol, { marginRight: 0 }]}>
                <View style={S.infoItem}><Text style={S.infoLbl}>Bank Name</Text><Text style={S.infoVal}>{bankName}</Text></View>
                <View style={S.infoItem}><Text style={S.infoLbl}>A/C No (Last 4)</Text><Text style={S.infoVal}>{acctLast4}</Text></View>
                <View style={S.infoItem}><Text style={S.infoLbl}>UAN (PF)</Text><Text style={S.infoVal}>{uanNo}</Text></View>
              </View>
            </View>
          </View>
        </View>

        {/* Summary Cards */}
        <View style={S.sumRow}>
          <View style={[S.sumCard, { backgroundColor: C.greenBg, borderColor: C.greenBd }]}>
            <View style={[S.sumIcon, { backgroundColor: C.green }]}><Text style={S.sumIcoTxt}>₹</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={[S.sumLbl, { color: C.green }]}>Gross Pay</Text>
              <Text style={[S.sumAmt, { color: C.green }]}>{rupee(grossEarned)}</Text>
            </View>
          </View>
          <View style={[S.sumCard, { backgroundColor: C.orangeBg, borderColor: C.orangeBd }]}>
            <View style={[S.sumIcon, { backgroundColor: C.orange }]}><Text style={S.sumIcoTxt}>%</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={[S.sumLbl, { color: C.orange }]}>Attendance Adj.</Text>
              <Text style={[S.sumAmt, { color: C.orange }]}>-{rupee(attAdj)}</Text>
            </View>
          </View>
          <View style={[S.sumCard, { backgroundColor: C.redBg, borderColor: C.redBd }]}>
            <View style={[S.sumIcon, { backgroundColor: C.red }]}><Text style={S.sumIcoTxt}>-</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={[S.sumLbl, { color: C.red }]}>Total Deductions</Text>
              <Text style={[S.sumAmt, { color: C.red }]}>-{rupee(totalDed)}</Text>
            </View>
          </View>
          <View style={[S.sumCard, { backgroundColor: C.blueBg, borderColor: C.blueBd }]}>
            <View style={[S.sumIcon, { backgroundColor: C.blue }]}><Text style={S.sumIcoTxt}>₹</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={[S.sumLbl, { color: C.blue }]}>Net Salary</Text>
              <Text style={[S.sumAmt, { color: C.blue }]}>{rupee(netPay)}</Text>
            </View>
          </View>
        </View>

        {/* Breakdown Tables */}
        <View style={S.bRow}>
          {/* Left: Earnings */}
          <View style={S.bCol}>
            <View style={S.secHdr}>
              <View style={[S.secIcon, { backgroundColor: C.green }]}><Text style={S.secIcoTxt}>$</Text></View>
              <Text style={[S.secTitle, { color: C.green }]}>Earnings Breakdown</Text>
            </View>
            <View style={S.tBox}>
              <View style={[S.subHdr, { backgroundColor: C.amberBg, borderBottomWidth: 0.5, borderBottomColor: C.amberBd }]}>
                <Text style={[S.subTxt, { color: C.amber }]}>A. Work Earnings (Variable)</Text>
              </View>
              <View style={[S.tHead, { backgroundColor: C.gray50 }]}>
                <Text style={[S.thTxt, { flex: 2.2 }]}>Description</Text>
                <Text style={[S.thTxt, { flex: 1.3, textAlign: 'center' }]}>Details</Text>
                <Text style={[S.thTxt, { flex: 1.8, textAlign: 'center' }]}>Rate</Text>
                <Text style={[S.thTxt, { flex: 1.2, textAlign: 'right' }]}>Amount (₹)</Text>
              </View>
              {grossPayVariable.map((r, i) => (
                <View key={i} style={i % 2 === 0 ? S.tRow0 : S.tRow1}>
                  <Text style={[S.tCell, { flex: 2.2 }]}>{r.name}</Text>
                  <Text style={[S.tCellC, { flex: 1.3 }]}>{r.value || 'N/A'}</Text>
                  <Text style={[S.tCellC, { flex: 1.8 }]}>{varRate(i)}</Text>
                  <Text style={[S.tCellR, { flex: 1.2 }]}>{fmt2(parseAmt(r.earned))}</Text>
                </View>
              ))}
              <View style={[S.subTot, { backgroundColor: C.amberBg }]}>
                <Text style={[S.stTxt, { flex: 1, color: C.amber }]}>Subtotal Variable Earnings</Text>
                <Text style={[S.stVal, { color: C.amber }]}>{rupee(varSubtotal)}</Text>
              </View>
              <View style={[S.subHdr, { backgroundColor: C.amberBg, borderTopWidth: 0.5, borderTopColor: C.amberBd, borderBottomWidth: 0.5, borderBottomColor: C.amberBd }]}>
                <Text style={[S.subTxt, { color: C.amber }]}>B. Allowances &amp; Benefits (Fixed)</Text>
              </View>
              <View style={[S.tHead, { backgroundColor: C.gray50 }]}>
                <Text style={[S.thTxt, { flex: 3.5 }]}>Description</Text>
                <Text style={[S.thTxt, { flex: 1.2, textAlign: 'right' }]}>Amount (₹)</Text>
              </View>
              {grossPayFixed.map((r, i) => (
                <View key={i} style={i % 2 === 0 ? S.tRow0 : S.tRow1}>
                  <Text style={[S.tCell, { flex: 3.5 }]}>{r.name}</Text>
                  <Text style={[S.tCellR, { flex: 1.2 }]}>{fmt2(parseAmt(r.earned))}</Text>
                </View>
              ))}
              <View style={[S.subTot, { backgroundColor: C.amberBg }]}>
                <Text style={[S.stTxt, { flex: 1, color: C.amber }]}>Subtotal Fixed Earnings</Text>
                <Text style={[S.stVal, { color: C.amber }]}>{rupee(fixedSubtotal)}</Text>
              </View>
              <View style={S.totGreen}>
                <Text style={[S.totTxt, { flex: 1 }]}>Total Earnings (A+B)</Text>
                <Text style={S.totTxt}>{rupee(totalGrossPayEarned)}</Text>
              </View>
            </View>
          </View>

          {/* Right: Deductions */}
          <View style={S.bCol}>
            <View style={S.secHdr}>
              <View style={[S.secIcon, { backgroundColor: C.red, borderRadius: 7 }]}><Text style={[S.secIcoTxt, { fontSize: 7 }]}>&#9099;</Text></View>
              <Text style={[S.secTitle, { color: C.red }]}>Deductions Breakdown</Text>
            </View>
            <View style={S.tBox}>
              <View style={[S.subHdr, { backgroundColor: C.redBg, borderBottomWidth: 0.5, borderBottomColor: C.redBd }]}>
                <Text style={[S.subTxt, { color: C.red }]}>1. Attendance Adjustments</Text>
              </View>
              <View style={[S.tHead, { backgroundColor: C.gray50 }]}>
                <Text style={[S.thTxt, { flex: 2.2 }]}>Description</Text>
                <Text style={[S.thTxt, { flex: 1.2, textAlign: 'center' }]}>Details</Text>
                <Text style={[S.thTxt, { flex: 1.7, textAlign: 'center' }]}>Rate</Text>
                <Text style={[S.thTxt, { flex: 1.2, textAlign: 'right' }]}>Amount (₹)</Text>
              </View>
              {deductions.map((r, i) => (
                <View key={i} style={i % 2 === 0 ? S.tRow0 : S.tRow1}>
                  <Text style={[S.tCell, { flex: 2.2 }]}>{r.name}</Text>
                  <Text style={[S.tCellC, { flex: 1.2 }]}>{r.value ?? 'N/A'}</Text>
                  <Text style={[S.tCellC, { flex: 1.7 }]}>{dedRate(i)}</Text>
                  <Text style={[S.tRed, { flex: 1.2 }]}>-{fmt2(parseAmt(r.earned))}</Text>
                </View>
              ))}
              <View style={[S.subTot, { backgroundColor: C.redBg }]}>
                <Text style={[S.stTxt, { flex: 1, color: C.red }]}>Total Attendance Adjustments</Text>
                <Text style={[S.stVal, { color: C.red }]}>-{rupee(attSubtotal)}</Text>
              </View>
              <View style={[S.subHdr, { backgroundColor: C.redBg, borderTopWidth: 0.5, borderTopColor: C.redBd, borderBottomWidth: 0.5, borderBottomColor: C.redBd }]}>
                <Text style={[S.subTxt, { color: C.red }]}>2. Government &amp; Payroll Deductions</Text>
              </View>
              <View style={[S.tHead, { backgroundColor: C.gray50 }]}>
                <Text style={[S.thTxt, { flex: 1.8 }]}>Description</Text>
                <Text style={[S.thTxt, { flex: 1.1, textAlign: 'center' }]}>Type</Text>
                <Text style={[S.thTxt, { flex: 1, textAlign: 'center' }]}>Rate</Text>
                <Text style={[S.thTxt, { flex: 1.2, textAlign: 'center' }]}>Base</Text>
                <Text style={[S.thTxt, { flex: 1, textAlign: 'right' }]}>Amount (₹)</Text>
              </View>
              {taxes.map((r, i) => (
                <View key={i} style={i % 2 === 0 ? S.tRow0 : S.tRow1}>
                  <Text style={[S.tCell, { flex: 1.8 }]}>{r.name}</Text>
                  <Text style={[S.tCellC, { flex: 1.1 }]}>{dedTypeLbl(r.value)}</Text>
                  <Text style={[S.tCellC, { flex: 1 }]}>{dedRateDsp(r.value)}</Text>
                  <Text style={[S.tCellC, { flex: 1.2 }]}>{dedBase(r.value)}</Text>
                  <Text style={[S.tRed, { flex: 1 }]}>-{fmt2(parseAmt(r.earned))}</Text>
                </View>
              ))}
              <View style={[S.subTot, { backgroundColor: C.redBg, borderTopWidth: 0.5, borderTopColor: C.redBd }]}>
                <Text style={[S.stTxt, { flex: 1, color: C.red }]}>Total Gov. &amp; Payroll Deductions</Text>
                <Text style={[S.stVal, { color: C.red }]}>-{rupee(govSubtotal)}</Text>
              </View>
              <View style={S.totRed}>
                <Text style={[S.totTxt, { flex: 1 }]}>Total Deductions</Text>
                <Text style={S.totTxt}>-{rupee(totalDeductionsEarned)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Payment History / Salary Summary */}
        <View style={S.paymentHistoryBox}>
          <Text style={S.phTitle}>Payment History</Text>
          {paymentHistoryProp?.salaryPayments && paymentHistoryProp.salaryPayments.length > 0 ? (
            <View style={S.phTable}>
              <View style={S.phHeader}>
                <Text style={[S.phHeaderText, { flex: 2 }]}>Date</Text>
                <Text style={[S.phHeaderText, { flex: 1.5, textAlign: 'right' }]}>Net Payable</Text>
                <Text style={[S.phHeaderText, { flex: 1.5, textAlign: 'right' }]}>Paid</Text>
                <Text style={[S.phHeaderText, { flex: 1.5, textAlign: 'right' }]}>Remaining</Text>
              </View>
              {paymentHistoryProp.salaryPayments.map((payment: PaymentRecord, idx: number) => {
                const paidDate = new Date(payment.paidAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
                const netPayable = paymentHistoryProp.netPayable || 0;
                const remaining = Math.max(0, netPayable - (paymentHistoryProp.salaryPayments.slice(0, idx + 1).reduce((sum, p) => sum + p.amount, 0)));
                return (
                  <View key={idx} style={idx % 2 === 0 ? S.phRow : S.phRowAlt}>
                    <Text style={[S.phCell, { flex: 2 }]}>{paidDate}</Text>
                    <Text style={[S.phCellRight, { flex: 1.5 }]}>{rupee(netPayable)}</Text>
                    <Text style={[S.phCellRight, { flex: 1.5 }]}>{rupee(payment.amount)}</Text>
                    <Text style={[S.phCellRight, { flex: 1.5, color: remaining > 0 ? C.red : C.green }]}>{rupee(remaining)}</Text>
                  </View>
                );
              })}
            </View>
          ) : (
            <View>
              <View style={S.phFallback}>
                <Text style={S.phFallbackLabel}>Net Payable</Text>
                <Text style={S.phFallbackValue}>{rupee(netPay)}</Text>
              </View>
              <View style={S.phFallback}>
                <Text style={S.phFallbackLabel}>Paid</Text>
                <Text style={S.phFallbackValue}>₹0</Text>
              </View>
              <View style={S.phFallback}>
                <Text style={S.phFallbackLabel}>Remaining</Text>
                <Text style={[S.phFallbackValue, { color: C.red }]}>{rupee(netPay)}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Footer Info */}
        <View style={S.fInfoRow}>
          <View style={S.fInfoCell}><Text style={S.fInfoLbl}>Payslip Generated On</Text><Text style={S.fInfoVal}>{nowStr()}</Text></View>
          <View style={S.fInfoCell}><Text style={S.fInfoLbl}>Generated By</Text><Text style={S.fInfoVal}>Payroll System</Text></View>
          <View style={S.fInfoCell}><Text style={S.fInfoLbl}>Payslip ID</Text><Text style={S.fInfoVal}>{payslipId}</Text></View>
          <View style={S.fInfoLast}><Text style={S.fInfoNote}>This is a system-generated document.{'\n'}No signature is required.</Text></View>
        </View>

        {/* Signatures */}
        <View style={S.sigRow}>
          <View style={S.sigRight}>
            {stampUrl ? <Image src={`${stampUrl}?nc=${Date.now()}`} style={S.sigImg} /> : <View style={{ height: 28 }} />}
            <View style={S.sigLine} /><Text style={S.sigName}>( {companyName || 'WiseTech'} )</Text><Text style={S.sigLbl}>Authorized Signatory</Text>
          </View>
        </View>

        {/* Confidential Bar */}
        <View style={S.confBar}>
          <Text style={S.confTxt}>Confidential: This salary slip is confidential and intended for the employee only.</Text>
        </View>
      </Page>
    </Document>
  );
} 