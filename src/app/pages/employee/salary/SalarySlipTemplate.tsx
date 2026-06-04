import React, { useEffect, useState } from "react";
import { Page, Text, View, Document, StyleSheet, Image } from "@react-pdf/renderer";
import { Employee } from "@redux/slices/employee";
import { fetchBranchById, fetchCompanyLogo, fetchCompanyOverview } from "@services/company";

// ─── Palette ─────────────────────────────────────────────────────────────────
const C = {
  navy:      '#1A2D4B',
  navyDark:  '#0f1e34',
  brand:     '#AA393D',
  green:     '#16a34a',
  greenBg:   '#f0fdf4',
  greenBd:   '#bbf7d0',
  red:       '#dc2626',
  redBg:     '#fff5f5',
  redBd:     '#fecaca',
  orange:    '#ea580c',
  orangeBg:  '#fff7ed',
  orangeBd:  '#fed7aa',
  blue:      '#1d6fc5',
  blueBg:    '#eff6ff',
  blueBd:    '#bfdbfe',
  gray50:    '#f8fafc',
  gray100:   '#f1f5f9',
  gray200:   '#e2e8f0',
  gray300:   '#cbd5e1',
  gray400:   '#94a3b8',
  gray500:   '#64748b',
  gray600:   '#475569',
  gray700:   '#334155',
  gray800:   '#1e293b',
  white:     '#ffffff',
  amber:     '#d97706',
  amberBg:   '#fef9eb',
  amberBd:   '#fde68a',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const parseAmt = (s: string | number): number => {
  if (typeof s === 'number') return isFinite(s) ? s : 0;
  return parseFloat((s || '0').replace(/,/g, '')) || 0;
};

const rupee = (v: string | number): string => {
  const n = parseAmt(v);
  return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};


function numberToWords(n: number): string {
  const num = Math.abs(n);
  const intPart = Math.floor(num);
  const paise = Math.round((num - intPart) * 100);
  if (intPart === 0 && paise === 0) return 'Zero Rupees Only';
  const a = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve',
    'Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
  const t = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  const h = (x: number): string => {
    if (!x) return '';
    if (x < 20) return a[x];
    if (x < 100) return t[Math.floor(x/10)] + (x%10 ? ' '+a[x%10] : '');
    return a[Math.floor(x/100)] + ' Hundred' + (x%100 ? ' '+h(x%100) : '');
  };
  const parts: string[] = [];
  if (Math.floor(intPart/10000000)) parts.push(h(Math.floor(intPart/10000000)) + ' Crore');
  if (Math.floor((intPart%10000000)/100000)) parts.push(h(Math.floor((intPart%10000000)/100000)) + ' Lakh');
  if (Math.floor((intPart%100000)/1000)) parts.push(h(Math.floor((intPart%100000)/1000)) + ' Thousand');
  if (intPart%1000) parts.push(h(intPart%1000));
  const paiseStr = paise > 0 ? ` and ${h(paise)} Paise` : '';
  return `Rupees ${parts.join(' ')}${paiseStr} Only`;
}

const fmtDate = (iso?: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const nowStr = () => {
  const d = new Date();
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ', ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
};

const parsePeriod = (date: string, startDate?: string, endDate?: string) => {
  if (startDate && endDate) {
    return { start: fmtDate(startDate), end: fmtDate(endDate) };
  }
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const parts = date.split(' ');
  const monthIdx = months.indexOf(parts[0]);
  const yr = parseInt(parts[1]) || new Date().getFullYear();
  const last = new Date(yr, monthIdx + 1, 0).getDate();
  const pad = (n: number) => String(n).padStart(2,'0');
  const mn = parts[0].slice(0,3);
  return { start: `01 ${mn} ${yr}`, end: `${pad(last)} ${mn} ${yr}` };
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    backgroundColor: C.white,
    paddingHorizontal: 18,
    paddingVertical: 14,
    fontSize: 8,
    color: C.gray800,
  },

  // ── Header ──
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 2.5 },
  logoBox: { width: 42, height: 42, backgroundColor: C.navy, borderRadius: 6, justifyContent: 'center', alignItems: 'center', marginRight: 7 },
  logoImg: { width: 42, height: 42, objectFit: 'contain' },
  logoText: { fontFamily: 'Helvetica-Bold', fontSize: 14, color: C.white },
  companyName: { fontFamily: 'Helvetica-Bold', fontSize: 11, color: C.navy },
  companySubName: { fontSize: 7, color: C.gray500, marginTop: 1 },
  companyTagline: { fontSize: 6.5, color: C.gray400, marginTop: 2, fontStyle: 'italic' },
  headerCenter: { flex: 2, alignItems: 'center', paddingHorizontal: 8 },
  titleMain: { fontFamily: 'Helvetica-Bold', fontSize: 20, color: C.brand, letterSpacing: 1 },
  titleSub: { fontSize: 7, color: C.gray500, marginTop: 2, letterSpacing: 0.5 },
  headerRight: { flex: 2, alignItems: 'flex-end' },
  contactLine: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  contactText: { fontSize: 6.5, color: C.gray600 },
  cinRow: { flexDirection: 'row', marginTop: 3 },
  cinText: { fontSize: 5.5, color: C.gray400 },

  // ── Divider ──
  divider: { borderTopWidth: 1.5, borderTopColor: C.brand, marginBottom: 6 },
  thinDivider: { borderTopWidth: 0.5, borderTopColor: C.gray200, marginBottom: 4 },

  // ── Pay Period Bar ──
  periodBar: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: C.gray200, borderRadius: 4,
    paddingVertical: 5, paddingHorizontal: 12, marginBottom: 6, backgroundColor: C.gray50,
  },
  periodItem: { flexDirection: 'row', alignItems: 'center' },
  periodLabel: { fontFamily: 'Helvetica-Bold', fontSize: 7.5, color: C.gray600, textTransform: 'uppercase', letterSpacing: 0.3 },
  periodValue: { fontFamily: 'Helvetica-Bold', fontSize: 8, color: C.navy, marginLeft: 4 },
  periodSep: { width: 1, height: 14, backgroundColor: C.gray300, marginHorizontal: 16 },

  // ── Employee Card ──
  empCard: {
    flexDirection: 'row', borderWidth: 1, borderColor: C.gray200, borderRadius: 5,
    padding: 8, marginBottom: 6, backgroundColor: C.white,
  },
  empLeft: { flexDirection: 'row', alignItems: 'flex-start', flex: 1, marginRight: 8 },
  avatarCircle: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: C.blueBg,
    justifyContent: 'center', alignItems: 'center', marginRight: 8,
    borderWidth: 1.5, borderColor: C.blue,
  },
  avatarImg: { width: 38, height: 38, borderRadius: 19 },
  avatarText: { fontSize: 14, color: C.blue, fontFamily: 'Helvetica-Bold' },
  empDetails: { flex: 1 },
  empName: { fontFamily: 'Helvetica-Bold', fontSize: 11, color: C.navy },
  empBadge: {
    backgroundColor: C.blue, paddingHorizontal: 5, paddingVertical: 1.5,
    borderRadius: 3, marginLeft: 5,
  },
  empBadgeText: { fontSize: 6, color: C.white, fontFamily: 'Helvetica-Bold' },
  empNameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  empDesig: { fontSize: 7.5, color: C.gray500, marginBottom: 1 },
  empDept: { fontSize: 7, color: C.gray400 },
  empRight: { flex: 2 },
  empInfoGrid: { flexDirection: 'row' },
  empInfoCol: { flex: 1, marginRight: 6 },
  empInfoItem: { marginBottom: 5 },
  empInfoLabel: { fontSize: 6, color: C.gray400, textTransform: 'uppercase', letterSpacing: 0.2, marginBottom: 1 },
  empInfoValue: { fontFamily: 'Helvetica-Bold', fontSize: 7.5, color: C.gray700 },

  // ── Summary Cards ──
  summaryRow: { flexDirection: 'row', marginBottom: 6, gap: 5 },
  summaryCard: {
    flex: 1, borderRadius: 5, padding: 7,
    flexDirection: 'row', alignItems: 'center',
  },
  summaryIconBox: {
    width: 26, height: 26, borderRadius: 13, justifyContent: 'center',
    alignItems: 'center', marginRight: 6,
  },
  summaryIconText: { fontSize: 11, color: C.white },
  summaryContent: { flex: 1 },
  summaryLabel: { fontSize: 6, textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 2 },
  summaryValue: { fontFamily: 'Helvetica-Bold', fontSize: 10 },

  // ── Breakdown Container ──
  breakdownRow: { flexDirection: 'row', marginBottom: 5, gap: 6 },
  breakdownCol: { flex: 1 },

  // ── Section Header ──
  secHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  secIconBox: {
    width: 14, height: 14, borderRadius: 2, justifyContent: 'center',
    alignItems: 'center', marginRight: 4,
  },
  secIconText: { fontSize: 8, color: C.white },
  secTitle: { fontFamily: 'Helvetica-Bold', fontSize: 7.5, textTransform: 'uppercase', letterSpacing: 0.5 },

  // ── Table ──
  tableBox: { borderWidth: 0.5, borderColor: C.gray200, borderRadius: 3, overflow: 'hidden' },

  // Sub-section header row (amber for earnings, light gray for deductions)
  subSecRow: { paddingVertical: 3, paddingHorizontal: 6 },
  subSecText: { fontFamily: 'Helvetica-Bold', fontSize: 6.5, letterSpacing: 0.2 },

  // Table head
  tHead: { flexDirection: 'row', paddingVertical: 4, paddingHorizontal: 6, borderBottomWidth: 0.5, borderBottomColor: C.gray200 },
  tHeadTxt: { fontFamily: 'Helvetica-Bold', fontSize: 6, color: C.gray500, textTransform: 'uppercase' },

  // Table rows
  tRow: { flexDirection: 'row', paddingVertical: 3.5, paddingHorizontal: 6, borderBottomWidth: 0.5, borderBottomColor: C.gray100 },
  tRowAlt: { flexDirection: 'row', paddingVertical: 3.5, paddingHorizontal: 6, backgroundColor: C.gray50, borderBottomWidth: 0.5, borderBottomColor: C.gray100 },
  tCell: { fontSize: 7, color: C.gray700 },
  tCellR: { fontSize: 7, color: C.gray700, textAlign: 'right' },
  tCellC: { fontSize: 7, color: C.gray700, textAlign: 'center' },
  tCellRed: { fontSize: 7, color: C.red, textAlign: 'right' },

  // Subtotal row
  subTotalRow: { flexDirection: 'row', paddingVertical: 4, paddingHorizontal: 6, borderTopWidth: 0.5, borderTopColor: C.gray200 },
  subTotalTxt: { fontFamily: 'Helvetica-Bold', fontSize: 6.5, color: C.gray600 },
  subTotalVal: { fontFamily: 'Helvetica-Bold', fontSize: 7, color: C.gray800, textAlign: 'right' },

  // Total row (colored)
  totalGreenRow: { flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 6, backgroundColor: C.green },
  totalGreenTxt: { fontFamily: 'Helvetica-Bold', fontSize: 7.5, color: C.white },
  totalRedRow: { flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 6, backgroundColor: C.red },
  totalRedTxt: { fontFamily: 'Helvetica-Bold', fontSize: 7.5, color: C.white },

  // ── Net Salary Bar ──
  netBar: {
    backgroundColor: C.navy, borderRadius: 5, padding: 10,
    flexDirection: 'row', alignItems: 'center', marginBottom: 6,
  },
  netLeft: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  netRupeeCircle: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center', marginRight: 8,
  },
  netRupeeText: { fontSize: 14, color: C.white },
  netLabelBox: {},
  netLabel: { fontSize: 7, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 0.5 },
  netSublabel: { fontSize: 6, color: 'rgba(255,255,255,0.5)', marginTop: 1 },
  netCenter: { flex: 1.5, alignItems: 'center' },
  netAmount: { fontFamily: 'Helvetica-Bold', fontSize: 22, color: C.white },
  readyBadge: {
    backgroundColor: C.green, paddingHorizontal: 7, paddingVertical: 2.5,
    borderRadius: 10, flexDirection: 'row', alignItems: 'center', marginTop: 4,
  },
  readyText: { fontSize: 6.5, color: C.white, fontFamily: 'Helvetica-Bold' },
  netRight: { flex: 1.2 },
  netWordsBox: {
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3,
    padding: 6, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.2)',
  },
  netWordsLabel: { fontSize: 5.5, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', marginBottom: 3 },
  netWordsText: { fontSize: 6.5, color: C.white, fontStyle: 'italic', lineHeight: 1.4 },

  // ── Footer Info ──
  footerInfoRow: {
    flexDirection: 'row', borderWidth: 0.5, borderColor: C.gray200,
    borderRadius: 3, overflow: 'hidden', marginBottom: 6,
  },
  footerInfoCell: { flex: 1, padding: 6, borderRightWidth: 0.5, borderRightColor: C.gray200 },
  footerInfoCellLast: { flex: 1.5, padding: 6 },
  footerInfoLabel: { fontSize: 6, color: C.gray400, textTransform: 'uppercase', letterSpacing: 0.2, marginBottom: 2 },
  footerInfoValue: { fontFamily: 'Helvetica-Bold', fontSize: 7, color: C.gray700 },
  footerInfoNote: { fontSize: 6, color: C.gray500, lineHeight: 1.4 },

  // ── Signatures ──
  sigRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 5 },
  sigLeft: { flex: 1, alignItems: 'center' },
  sigCenter: { flex: 1.5, alignItems: 'center' },
  sigRight: { flex: 1, alignItems: 'center' },
  sigImg: { height: 28, width: 70, objectFit: 'contain', marginBottom: 2 },
  sigLine: { width: '70%', borderTopWidth: 0.5, borderTopColor: C.gray400, marginBottom: 3 },
  sigName: { fontSize: 7, color: C.gray600, fontStyle: 'italic' },
  sigLabel: { fontSize: 6.5, color: C.gray500, textTransform: 'uppercase', letterSpacing: 0.3 },
  thankBox: { alignItems: 'center' },
  checkCircle: {
    width: 20, height: 20, borderRadius: 10, backgroundColor: C.green,
    justifyContent: 'center', alignItems: 'center', marginBottom: 3,
  },
  checkText: { fontSize: 10, color: C.white },
  thankText: { fontSize: 7, color: C.gray600, textAlign: 'center', fontStyle: 'italic', lineHeight: 1.4 },

  // ── Confidential Bar ──
  confBar: {
    backgroundColor: C.navy, borderRadius: 3,
    paddingVertical: 5, paddingHorizontal: 10,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
  },
  confText: { fontSize: 6.5, color: 'rgba(255,255,255,0.8)' },
});

// ─── Main Component ───────────────────────────────────────────────────────────
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
}) {
  const [logoUrl, setLogoUrl] = useState('');
  const [stampUrl, setStampUrl] = useState('');
  const [branchAddress, setBranchAddress] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [companyWebsite, setCompanyWebsite] = useState('');
  const [companyCIN, setCompanyCIN] = useState('');
  const [companyGST, setCompanyGST] = useState('');
  const [companyName, setCompanyName] = useState('');

  useEffect(() => {
    fetchCompanyLogo().then(res => {
      setLogoUrl(res?.data?.logo || '');
      setStampUrl(res?.data?.salaryStamp || '');
    }).catch(() => {});

    fetchCompanyOverview().then((res: any) => {
      const ov = res?.data?.companyOverview?.[0] || {};
      setCompanyName(ov.name || '');
      setCompanyEmail(ov.superAdminEmail || '');
      setCompanyPhone(ov.contactNumber || '');
      setCompanyWebsite(ov.websiteUrl || '');
      setCompanyCIN(ov.certificateOfIncorporation || '');
      setCompanyGST(ov.gstNumber || '');
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (employee?.branchId) {
      fetchBranchById(employee.branchId).then(res => {
        setBranchAddress(res?.data?.branch?.address || '');
      }).catch(() => {});
    }
  }, [employee]);

  // ── Employee data
  const empName = `${employee?.users?.firstName || ''} ${employee?.users?.lastName || ''}`.trim();
  const empId = (employee as any)?.wiseEmployeeId || (employee as any)?.employeeId || employee?.employeeCode || '—';
  const designation = (employee as any)?.designation?.name || (employee as any)?.designationName || (employee?.designations as any)?.role || '—';
  const department = (employee as any)?.department?.name || (employee as any)?.departmentName || (employee?.departments as any)?.name || '—';
  const doj = employee?.dateOfJoining ? new Date(employee.dateOfJoining as string).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
  const empType = (employee as any)?.employeeType || '—';
  const payModeVal = 'Bank Transfer';
  const bankName = (employee as any)?.bankName || '—';
  const acctLast4 = (employee as any)?.accountNumber ? `**** ${String((employee as any).accountNumber).slice(-4)}` : '—';
  const uanNo = (employee as any)?.uan || (employee as any)?.pfNumber || '—';
  const initials = empName.split(' ').map((w: string) => w[0]).join('').slice(0,2).toUpperCase();
  const avatarSrc = employee?.avatar;

  // ── Calculations
  const grossEarned = parseAmt(pipeline?.grossPay || totalGrossPayEarned);
  const attAdj = parseAmt(pipeline?.totalVariableDeductions || '0');
  const totalDed = parseAmt(pipeline?.totalFixedDeductions || '0') + attAdj || parseAmt(totalDeductionsEarned);
  const netPay = parseAmt(pipeline?.finalNetSalary || finalAmount);
  const leaveDays = (paidLeaves || 0) + (unpaidLeaves || 0);
  const hourlySal = hourlySalaryProp || (employee as any)?.hourlySalary || 0;
  const dailySal = hourlySal * 8;

  // ── Period
  const { start: periodStart, end: periodEnd } = parsePeriod(date, monthStartDate, monthEndDate);
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const mParts = date.split(' ');
  const mIdx = months.indexOf(mParts[0]);
  const yr = parseInt(mParts[1]) || new Date().getFullYear();
  const psMonth = (mIdx + 1).toString().padStart(2, '0');
  const empIdNum = parseInt((employee?.id || '').slice(-4), 16) || 124;
  const payslipId = `PS-${yr}-${psMonth}-${String(empIdNum).padStart(6,'0').slice(0,6)}`;

  // ── Variable earnings rate helper
  const varRate = (idx: number): string => {
    if (!hourlySal) return '—';
    const hourlyItems = ['workingtime','overtime','working time','over time'];
    const nm = (grossPayVariable[idx]?.name || '').toLowerCase().replace(/\s/g,'');
    const isHourly = hourlyItems.some(k => nm.includes(k.replace(/\s/g,'')));
    if (isHourly) return `₹${hourlySal.toFixed(2)}/Hour`;
    return `₹${dailySal.toFixed(2)}/Day`;
  };

  // ── Variable deduction rate helper
  const dedRate = (_idx: number): string => {
    if (!hourlySal || !dailySal) return '—';
    return `₹${dailySal.toFixed(2)}/Day`;
  };

  // ── Fixed deduction type/base helpers
  const isPercent = (val?: string): boolean => (val || '').trim().endsWith('%');
  const dedTypeLabel = (val?: string): string => isPercent(val) ? 'Percentage' : 'Fixed';
  const dedRateDisplay = (val?: string): string => {
    if (!val || val === '-') return '—';
    if (isPercent(val)) return val;
    const n = parseAmt(val);
    return `₹${n.toFixed(2)}`;
  };
  const dedBase = (val?: string): string => {
    if (isPercent(val)) return rupee(totalGrossPayEarned);
    return '—';
  };

  return (
    <Document>
      <Page size="A4" style={S.page}>

        {/* ── 1. HEADER ─────────────────────────────────────────────────── */}
        <View style={S.headerRow}>
          {/* Left: Logo + Company name */}
          <View style={S.headerLeft}>
            <View style={S.logoBox}>
              {logoUrl
                ? <Image src={`${logoUrl}?nc=${Date.now()}`} style={S.logoImg} />
                : <Text style={S.logoText}>W</Text>
              }
            </View>
            <View>
              <Text style={S.companyName}>{companyName || 'WiseTech'}</Text>
              <Text style={S.companySubName}>MEP CONSULTANTS PVT. LTD.</Text>
              <Text style={S.companyTagline}>Engineering · Design · Excellence</Text>
            </View>
          </View>

          {/* Center: Title */}
          <View style={S.headerCenter}>
            <Text style={S.titleMain}>SALARY SLIP</Text>
            <Text style={S.titleSub}>Monthly Payroll Statement</Text>
          </View>

          {/* Right: Contact info */}
          <View style={S.headerRight}>
            {branchAddress ? (
              <Text style={[S.contactText, { marginBottom: 2, textAlign: 'right' }]}>{branchAddress}</Text>
            ) : null}
            {companyEmail ? (
              <View style={S.contactLine}>
                <Text style={S.contactText}>{companyEmail}</Text>
              </View>
            ) : null}
            {companyPhone ? (
              <View style={S.contactLine}>
                <Text style={S.contactText}>{companyPhone}</Text>
              </View>
            ) : null}
            {companyWebsite ? (
              <View style={S.contactLine}>
                <Text style={S.contactText}>{companyWebsite}</Text>
              </View>
            ) : null}
            {(companyCIN || companyGST) ? (
              <View style={[S.cinRow, { flexDirection: 'column', alignItems: 'flex-end' }]}>
                {companyCIN ? <Text style={S.cinText}>CIN: {companyCIN}</Text> : null}
                {companyGST ? <Text style={[S.cinText, { marginTop: 1 }]}>GSTIN: {companyGST}</Text> : null}
              </View>
            ) : null}
          </View>
        </View>

        {/* ── Brand Divider ── */}
        <View style={S.divider} />

        {/* ── 2. PAY PERIOD BAR ─────────────────────────────────────────── */}
        <View style={S.periodBar}>
          <View style={S.periodItem}>
            <Text style={S.periodLabel}>Pay Month :</Text>
            <Text style={S.periodValue}>{date}</Text>
          </View>
          <View style={S.periodSep} />
          <View style={S.periodItem}>
            <Text style={S.periodLabel}>Pay Period :</Text>
            <Text style={S.periodValue}>{periodStart} - {periodEnd}</Text>
          </View>
        </View>

        {/* ── 3. EMPLOYEE CARD ──────────────────────────────────────────── */}
        <View style={S.empCard}>
          {/* Avatar + Name */}
          <View style={S.empLeft}>
            <View style={S.avatarCircle}>
              {avatarSrc
                ? <Image src={`${avatarSrc}?nc=${Date.now()}`} style={S.avatarImg} />
                : <Text style={S.avatarText}>{initials || '?'}</Text>
              }
            </View>
            <View style={S.empDetails}>
              <View style={S.empNameRow}>
                <Text style={S.empName}>{empName || '—'}</Text>
                <View style={S.empBadge}><Text style={S.empBadgeText}>{empId}</Text></View>
              </View>
              <Text style={S.empDesig}>Designation :  {designation}</Text>
              <Text style={S.empDept}>Department :  {department}</Text>
            </View>
          </View>

          {/* Info Grid */}
          <View style={S.empRight}>
            <View style={S.empInfoGrid}>
              {/* Column 1: Joining, Employment, Pay Mode */}
              <View style={S.empInfoCol}>
                <View style={S.empInfoItem}>
                  <Text style={S.empInfoLabel}>Joining Date</Text>
                  <Text style={S.empInfoValue}>{doj}</Text>
                </View>
                <View style={S.empInfoItem}>
                  <Text style={S.empInfoLabel}>Employment Type</Text>
                  <Text style={S.empInfoValue}>{empType || 'Full Time'}</Text>
                </View>
                <View style={S.empInfoItem}>
                  <Text style={S.empInfoLabel}>Pay Mode</Text>
                  <Text style={S.empInfoValue}>{payModeVal}</Text>
                </View>
              </View>
              {/* Column 2: Working Days, Present, Leave */}
              <View style={S.empInfoCol}>
                <View style={S.empInfoItem}>
                  <Text style={S.empInfoLabel}>Total Working Days</Text>
                  <Text style={S.empInfoValue}>{totalPayableDays || 0}</Text>
                </View>
                <View style={S.empInfoItem}>
                  <Text style={S.empInfoLabel}>Present Days</Text>
                  <Text style={S.empInfoValue}>{presentDays ?? totalPayableDays ?? 0}</Text>
                </View>
                <View style={S.empInfoItem}>
                  <Text style={S.empInfoLabel}>Leave Days</Text>
                  <Text style={S.empInfoValue}>{leaveDays}</Text>
                </View>
              </View>
              {/* Column 3: Bank, Account, UAN */}
              <View style={[S.empInfoCol, { marginRight: 0 }]}>
                <View style={S.empInfoItem}>
                  <Text style={S.empInfoLabel}>Bank Name</Text>
                  <Text style={S.empInfoValue}>{bankName}</Text>
                </View>
                <View style={S.empInfoItem}>
                  <Text style={S.empInfoLabel}>A/C No (Last 4)</Text>
                  <Text style={S.empInfoValue}>{acctLast4}</Text>
                </View>
                <View style={S.empInfoItem}>
                  <Text style={S.empInfoLabel}>UAN (PF)</Text>
                  <Text style={S.empInfoValue}>{uanNo}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* ── 4. SUMMARY CARDS ──────────────────────────────────────────── */}
        <View style={S.summaryRow}>
          {/* Gross Pay */}
          <View style={[S.summaryCard, { backgroundColor: C.greenBg, borderWidth: 1, borderColor: C.greenBd }]}>
            <View style={[S.summaryIconBox, { backgroundColor: C.green }]}>
              <Text style={S.summaryIconText}>₹</Text>
            </View>
            <View style={S.summaryContent}>
              <Text style={[S.summaryLabel, { color: C.green }]}>Gross Pay</Text>
              <Text style={[S.summaryValue, { color: C.green }]}>{rupee(grossEarned)}</Text>
            </View>
          </View>

          {/* Attendance Adj */}
          <View style={[S.summaryCard, { backgroundColor: C.orangeBg, borderWidth: 1, borderColor: C.orangeBd }]}>
            <View style={[S.summaryIconBox, { backgroundColor: C.orange }]}>
              <Text style={S.summaryIconText}>%</Text>
            </View>
            <View style={S.summaryContent}>
              <Text style={[S.summaryLabel, { color: C.orange }]}>Attendance Adj.</Text>
              <Text style={[S.summaryValue, { color: C.orange }]}>-{rupee(attAdj)}</Text>
            </View>
          </View>

          {/* Total Deductions */}
          <View style={[S.summaryCard, { backgroundColor: C.navy, borderWidth: 1, borderColor: C.navyDark }]}>
            <View style={[S.summaryIconBox, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <Text style={S.summaryIconText}>-</Text>
            </View>
            <View style={S.summaryContent}>
              <Text style={[S.summaryLabel, { color: 'rgba(255,255,255,0.7)' }]}>Total Deductions</Text>
              <Text style={[S.summaryValue, { color: C.white }]}>-{rupee(totalDed)}</Text>
            </View>
          </View>

          {/* Net Salary */}
          <View style={[S.summaryCard, { backgroundColor: C.blueBg, borderWidth: 1, borderColor: C.blueBd }]}>
            <View style={[S.summaryIconBox, { backgroundColor: C.blue }]}>
              <Text style={S.summaryIconText}>₹</Text>
            </View>
            <View style={S.summaryContent}>
              <Text style={[S.summaryLabel, { color: C.blue }]}>Net Salary</Text>
              <Text style={[S.summaryValue, { color: C.blue }]}>{rupee(netPay)}</Text>
            </View>
          </View>
        </View>

        {/* ── 5. EARNINGS + DEDUCTIONS TABLES ──────────────────────────── */}
        <View style={S.breakdownRow}>

          {/* LEFT: Earnings Breakdown */}
          <View style={S.breakdownCol}>
            <View style={S.secHeader}>
              <View style={[S.secIconBox, { backgroundColor: C.green }]}>
                <Text style={S.secIconText}>$</Text>
              </View>
              <Text style={[S.secTitle, { color: C.green }]}>Earnings Breakdown</Text>
            </View>
            <View style={S.tableBox}>

              {/* A. Variable Earnings */}
              <View style={[S.subSecRow, { backgroundColor: C.amberBg, borderBottomWidth: 0.5, borderBottomColor: C.amberBd }]}>
                <Text style={[S.subSecText, { color: C.amber }]}>A. Work Earnings (Variable)</Text>
              </View>
              <View style={[S.tHead, { backgroundColor: C.gray50 }]}>
                <Text style={[S.tHeadTxt, { flex: 2 }]}>Description</Text>
                <Text style={[S.tHeadTxt, { flex: 1.4, textAlign: 'center' }]}>Details</Text>
                <Text style={[S.tHeadTxt, { flex: 1.8, textAlign: 'center' }]}>Rate</Text>
                <Text style={[S.tHeadTxt, { flex: 1.2, textAlign: 'right' }]}>Amount (₹)</Text>
              </View>
              {grossPayVariable.length === 0 ? (
                <View style={S.tRow}><Text style={[S.tCell, { color: C.gray400 }]}>No earnings</Text></View>
              ) : (
                grossPayVariable.map((row, i) => (
                  <View key={i} style={i % 2 === 0 ? S.tRow : S.tRowAlt}>
                    <Text style={[S.tCell, { flex: 2 }]}>{row.name}</Text>
                    <Text style={[S.tCellC, { flex: 1.4 }]}>{row.value || '—'}</Text>
                    <Text style={[S.tCellC, { flex: 1.8 }]}>{varRate(i)}</Text>
                    <Text style={[S.tCellR, { flex: 1.2 }]}>{parseAmt(row.earned) === 0 ? '0.00' : parseAmt(row.earned).toFixed(2)}</Text>
                  </View>
                ))
              )}
              <View style={[S.subTotalRow, { backgroundColor: C.amberBg }]}>
                <Text style={[S.subTotalTxt, { flex: 1, color: C.amber }]}>Subtotal Variable Earnings</Text>
                <Text style={[S.subTotalVal, { color: C.amber }]}>
                  {rupee(grossPayVariable.reduce((a, r) => a + parseAmt(r.earned), 0))}
                </Text>
              </View>

              {/* B. Fixed Allowances */}
              <View style={[S.subSecRow, { backgroundColor: C.amberBg, borderTopWidth: 0.5, borderTopColor: C.amberBd, borderBottomWidth: 0.5, borderBottomColor: C.amberBd }]}>
                <Text style={[S.subSecText, { color: C.amber }]}>B. Allowances &amp; Benefits (Fixed)</Text>
              </View>
              <View style={[S.tHead, { backgroundColor: C.gray50 }]}>
                <Text style={[S.tHeadTxt, { flex: 3 }]}>Description</Text>
                <Text style={[S.tHeadTxt, { flex: 1.2, textAlign: 'right' }]}>Amount (₹)</Text>
              </View>
              {grossPayFixed.length === 0 ? (
                <View style={S.tRow}><Text style={[S.tCell, { color: C.gray400 }]}>No allowances</Text></View>
              ) : (
                grossPayFixed.map((row, i) => (
                  <View key={i} style={i % 2 === 0 ? S.tRow : S.tRowAlt}>
                    <Text style={[S.tCell, { flex: 3 }]}>{row.name}</Text>
                    <Text style={[S.tCellR, { flex: 1.2 }]}>{parseAmt(row.earned) === 0 ? '0.00' : parseAmt(row.earned).toFixed(2)}</Text>
                  </View>
                ))
              )}
              <View style={[S.subTotalRow, { backgroundColor: C.amberBg }]}>
                <Text style={[S.subTotalTxt, { flex: 1, color: C.amber }]}>Subtotal Fixed Earnings</Text>
                <Text style={[S.subTotalVal, { color: C.amber }]}>
                  {rupee(grossPayFixed.reduce((a, r) => a + parseAmt(r.earned), 0))}
                </Text>
              </View>

              {/* Total Earnings */}
              <View style={S.totalGreenRow}>
                <Text style={[S.totalGreenTxt, { flex: 1 }]}>Total Earnings (A+B)</Text>
                <Text style={S.totalGreenTxt}>{rupee(totalGrossPayEarned)}</Text>
              </View>
            </View>
          </View>

          {/* RIGHT: Deductions Breakdown */}
          <View style={S.breakdownCol}>
            <View style={S.secHeader}>
              <View style={[S.secIconBox, { backgroundColor: C.red }]}>
                <Text style={S.secIconText}>!</Text>
              </View>
              <Text style={[S.secTitle, { color: C.red }]}>Deductions Breakdown</Text>
            </View>
            <View style={S.tableBox}>

              {/* 1. Attendance Adjustments */}
              <View style={[S.subSecRow, { backgroundColor: C.redBg, borderBottomWidth: 0.5, borderBottomColor: C.redBd }]}>
                <Text style={[S.subSecText, { color: C.red }]}>1. Attendance Adjustments</Text>
              </View>
              <View style={[S.tHead, { backgroundColor: C.gray50 }]}>
                <Text style={[S.tHeadTxt, { flex: 2 }]}>Description</Text>
                <Text style={[S.tHeadTxt, { flex: 1.2, textAlign: 'center' }]}>Details</Text>
                <Text style={[S.tHeadTxt, { flex: 1.6, textAlign: 'center' }]}>Rate</Text>
                <Text style={[S.tHeadTxt, { flex: 1.2, textAlign: 'right' }]}>Amount (₹)</Text>
              </View>
              {deductions.length === 0 ? (
                <View style={S.tRow}><Text style={[S.tCell, { color: C.gray400 }]}>No adjustments</Text></View>
              ) : (
                deductions.map((row, i) => (
                  <View key={i} style={i % 2 === 0 ? S.tRow : S.tRowAlt}>
                    <Text style={[S.tCell, { flex: 2 }]}>{row.name}</Text>
                    <Text style={[S.tCellC, { flex: 1.2 }]}>{row.value ?? '—'}</Text>
                    <Text style={[S.tCellC, { flex: 1.6 }]}>{dedRate(i)}</Text>
                    <Text style={[S.tCellRed, { flex: 1.2 }]}>-{parseAmt(row.earned) === 0 ? '0.00' : parseAmt(row.earned).toFixed(2)}</Text>
                  </View>
                ))
              )}
              <View style={[S.subTotalRow, { backgroundColor: C.redBg }]}>
                <Text style={[S.subTotalTxt, { flex: 1, color: C.red }]}>Total Attendance Adjustments</Text>
                <Text style={[S.subTotalVal, { color: C.red }]}>
                  -{rupee(deductions.reduce((a, r) => a + parseAmt(r.earned), 0))}
                </Text>
              </View>

              {/* 2. Government & Payroll Deductions */}
              <View style={[S.subSecRow, { backgroundColor: C.redBg, borderTopWidth: 0.5, borderTopColor: C.redBd, borderBottomWidth: 0.5, borderBottomColor: C.redBd }]}>
                <Text style={[S.subSecText, { color: C.red }]}>2. Government &amp; Payroll Deductions</Text>
              </View>
              <View style={[S.tHead, { backgroundColor: C.gray50 }]}>
                <Text style={[S.tHeadTxt, { flex: 1.8 }]}>Description</Text>
                <Text style={[S.tHeadTxt, { flex: 1.2, textAlign: 'center' }]}>Type</Text>
                <Text style={[S.tHeadTxt, { flex: 1, textAlign: 'center' }]}>Rate</Text>
                <Text style={[S.tHeadTxt, { flex: 1.2, textAlign: 'center' }]}>Base</Text>
                <Text style={[S.tHeadTxt, { flex: 1, textAlign: 'right' }]}>Amount (₹)</Text>
              </View>
              {taxes.length === 0 ? (
                <View style={S.tRow}><Text style={[S.tCell, { color: C.gray400 }]}>No deductions</Text></View>
              ) : (
                taxes.map((row, i) => (
                  <View key={i} style={i % 2 === 0 ? S.tRow : S.tRowAlt}>
                    <Text style={[S.tCell, { flex: 1.8 }]}>{row.name}</Text>
                    <Text style={[S.tCellC, { flex: 1.2 }]}>{dedTypeLabel(row.value)}</Text>
                    <Text style={[S.tCellC, { flex: 1 }]}>{dedRateDisplay(row.value)}</Text>
                    <Text style={[S.tCellC, { flex: 1.2 }]}>{dedBase(row.value)}</Text>
                    <Text style={[S.tCellRed, { flex: 1 }]}>-{parseAmt(row.earned) === 0 ? '0.00' : parseAmt(row.earned).toFixed(2)}</Text>
                  </View>
                ))
              )}
              <View style={[S.subTotalRow, { backgroundColor: C.redBg, borderTopWidth: 0.5, borderTopColor: C.redBd }]}>
                <Text style={[S.subTotalTxt, { flex: 1, color: C.red }]}>Total Gov. &amp; Payroll Deductions</Text>
                <Text style={[S.subTotalVal, { color: C.red }]}>
                  -{rupee(taxes.reduce((a, r) => a + parseAmt(r.earned), 0))}
                </Text>
              </View>

              {/* Total Deductions */}
              <View style={S.totalRedRow}>
                <Text style={[S.totalRedTxt, { flex: 1 }]}>Total Deductions</Text>
                <Text style={S.totalRedTxt}>-{rupee(totalDeductionsEarned)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── 6. NET SALARY PAYABLE ─────────────────────────────────────── */}
        <View style={S.netBar}>
          <View style={S.netLeft}>
            <View style={S.netRupeeCircle}>
              <Text style={S.netRupeeText}>₹</Text>
            </View>
            <View style={S.netLabelBox}>
              <Text style={S.netLabel}>Net Salary Payable</Text>
              <Text style={S.netSublabel}>After all deductions</Text>
            </View>
          </View>
          <View style={S.netCenter}>
            <Text style={S.netAmount}>{rupee(netPay)}</Text>
            <View style={S.readyBadge}>
              <Text style={S.readyText}> ✓  READY TO PAY</Text>
            </View>
          </View>
          <View style={S.netRight}>
            <View style={S.netWordsBox}>
              <Text style={S.netWordsLabel}>Amount in Words</Text>
              <Text style={S.netWordsText}>{numberToWords(netPay)}</Text>
            </View>
          </View>
        </View>

        {/* ── 7. FOOTER INFO ROW ────────────────────────────────────────── */}
        <View style={S.footerInfoRow}>
          <View style={S.footerInfoCell}>
            <Text style={S.footerInfoLabel}>Payslip Generated On</Text>
            <Text style={S.footerInfoValue}>{nowStr()}</Text>
          </View>
          <View style={S.footerInfoCell}>
            <Text style={S.footerInfoLabel}>Generated By</Text>
            <Text style={S.footerInfoValue}>Payroll System</Text>
          </View>
          <View style={S.footerInfoCell}>
            <Text style={S.footerInfoLabel}>Payslip ID</Text>
            <Text style={S.footerInfoValue}>{payslipId}</Text>
          </View>
          <View style={S.footerInfoCellLast}>
            <Text style={S.footerInfoNote}>
              This is a system-generated document.{'\n'}No signature is required.
            </Text>
          </View>
        </View>

        {/* ── 8. SIGNATURES ─────────────────────────────────────────────── */}
        <View style={S.sigRow}>
          <View style={S.sigLeft}>
            {(employee as any)?.digitalSignaturePath ? (
              <Image src={`${(employee as any).digitalSignaturePath}?nc=${Date.now()}`} style={S.sigImg} />
            ) : <View style={{ height: 28 }} />}
            <View style={S.sigLine} />
            <Text style={S.sigName}>( {empName} )</Text>
            <Text style={S.sigLabel}>Employee Signature</Text>
          </View>

          <View style={S.sigCenter}>
            <View style={S.thankBox}>
              <View style={S.checkCircle}><Text style={S.checkText}>✓</Text></View>
              <Text style={S.thankText}>Thank you for your{'\n'}valuable contributions!</Text>
            </View>
          </View>

          <View style={S.sigRight}>
            {stampUrl ? (
              <Image src={`${stampUrl}?nc=${Date.now()}`} style={S.sigImg} />
            ) : <View style={{ height: 28 }} />}
            <View style={S.sigLine} />
            <Text style={S.sigName}>( {companyName || 'WiseTech'} )</Text>
            <Text style={S.sigLabel}>Authorized Signatory</Text>
          </View>
        </View>

        {/* ── 9. CONFIDENTIAL BAR ───────────────────────────────────────── */}
        <View style={S.confBar}>
          <Text style={S.confText}>
            Confidential: This salary slip is confidential and intended for the employee only.
          </Text>
        </View>

      </Page>
    </Document>
  );
}
