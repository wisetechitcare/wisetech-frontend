import { safeJsonParse } from '@utils/safeJson';
﻿import React, { useEffect, useState } from "react";
import { Modal } from "react-bootstrap";
import { Form, Formik } from "formik";
import * as Yup from "yup";
import { fetchConfiguration, updateConfigurationById } from "@services/company";
import { successConfirmation } from "@utils/modal";
import { DEDUCTIONS } from "@constants/configurations-key";
import { hasPermission } from "@utils/authAbac";
import { permissionConstToUseWithHasPermission, resourceNameMapWithCamelCase } from "@constants/statistics";
import TextInput from "@app/modules/common/inputs/TextInput";
import DropdownInput from "@app/modules/common/inputs/DropdownInput";

// Interfaces matching the specific JSON structure
interface IRuleTill {
  minValue: number;
  maxValue: number;
  monthlyTax: number;
  isActive: boolean;
}

interface IRuleRange {
  minValue: number;
  maxValue: number;
  monthlyTax: number; // Note: lowercase 't' in monthlytax
  isActive: boolean;
}

interface IRuleMoreThan {
  minValue: number;
  monthlyTax: number;
  isActive: boolean;
}

interface IRuleLastMonth {
  month: number;
  monthlyTax: number; // Note: Capital 'M' in MonthlyTax
  isActive: boolean;
}

interface IGenderRules {
  till: IRuleTill;
  range: IRuleRange;
  moreThan: IRuleMoreThan;
  lastMonth: IRuleLastMonth;
}

interface IProfessionalTax {
  male: IGenderRules;
  female: IGenderRules;
}

interface IProvidentFund {
  name: string;
  type: string;
  deduction: number;
}

interface IProfessionalFees {
  name: string;
  type: string;
  deduction: number;
}

interface IDeductionConfig {
  professionalTax?: IProfessionalTax;
  providentFund?: IProvidentFund;
  professionalFees?: IProfessionalFees;
}

// Default values for empty backend response
const defaultProfessionalTax: IProfessionalTax = {
  male: {
    till: { minValue: 0, maxValue: 7500, monthlyTax: 0, isActive: true },
    range: { minValue: 7501, maxValue: 10000, monthlyTax: 175, isActive: true },
    moreThan: { minValue: 10000, monthlyTax: 175, isActive: true },
    lastMonth: { month: 0, monthlyTax: 300, isActive: true }
  },
  female: {
    till: { minValue: 0, maxValue: 7500, monthlyTax: 0, isActive: true },
    range: { minValue: 7501, maxValue: 10000, monthlyTax: 175, isActive: true },
    moreThan: { minValue: 10000, monthlyTax: 175, isActive: true },
    lastMonth: { month: 0, monthlyTax: 300, isActive: true }
  }
};

const defaultProvidentFund: IProvidentFund = {
  name: "Provident Fund",
  type: "percentage",
  deduction: 0
};

const defaultProfessionalFees: IProfessionalFees = {
  name: "Tax Deducted at Source (TDS)",
  type: "number",
  deduction: 0
};

// Validation Schemas
const providentFundSchema = Yup.object({
  name: Yup.string().required("Name is required"),
  type: Yup.string().required("Type is required"),
  deduction: Yup.number().required("Deduction percentage is required").min(0).max(100),
});

const genderRuleSchema = Yup.object({
  till: Yup.object({
    minValue: Yup.number().required(),
    maxValue: Yup.number().required(),
    monthlyTax: Yup.number().required(),
    isActive: Yup.boolean()
  }),
  range: Yup.object({
    minValue: Yup.number().required(),
    maxValue: Yup.number().required(),
    monthlyTax: Yup.number().required(),
    isActive: Yup.boolean()
  }),
  moreThan: Yup.object({
    minValue: Yup.number().required(),
    monthlyTax: Yup.number().required(),
    isActive: Yup.boolean()
  }),
  lastMonth: Yup.object({
    month: Yup.number().required(),
    monthlyTax: Yup.number().required(),
    isActive: Yup.boolean()
  }),
});

const professionalTaxSchema = Yup.object({
  male: genderRuleSchema,
  female: genderRuleSchema,
});

const monthOptions = Array.from({ length: 12 }, (_, i) => ({
  label: new Date(0, i).toLocaleString('default', { month: 'long' }),
  value: i
}));

const numberParser = (value: string) => value === "" ? "" : Number(value);

function DeductionRules() {
  const [configurationId, setConfigurationId] = useState('');
  const [config, setConfig] = useState<IDeductionConfig>({});
  const [loading, setLoading] = useState(false);
  const [showPFModal, setShowPFModal] = useState(false);
  const [showPTModal, setShowPTModal] = useState(false);

  // const defaultConfig = { "providentFund": { "name": "Employee Provident Fund (EPF)", "type": "percentage", "deduction": 12 }, "professionalTax": { "male": { "till": { "isActive": true, "maxValue": 7500, "minValue": 0, "monthlyTax": 100 }, "range": { "isActive": true, "maxValue": 10000, "minValue": 7501, "monthlytax": 175 }, "moreThan": { "isActive": true, "minValue": 10000, "monthlyTax": 175 }, "lastMonth": { "month": 0, "isActive": true, "MonthlyTax": 300 } }, "female": { "till": { "isActive": true, "maxValue": 7500, "minValue": 0, "monthlyTax": 0 }, "range": { "isActive": true, "maxValue": 10000, "minValue": 7501, "monthlytax": 175 }, "moreThan": { "isActive": true, "minValue": 10000, "monthlyTax": 175 }, "lastMonth": { "month": 0, "isActive": true, "MonthlyTax": 300 } } } }

  const canEdit = hasPermission(resourceNameMapWithCamelCase.salary, permissionConstToUseWithHasPermission.editOthers);

  async function fetchPayrollConfiguration() {
    try {
      const { data: { configuration } } = await fetchConfiguration(DEDUCTIONS);
      const configurationComplete = safeJsonParse(configuration?.configuration || '{}');
      console.log("configurationComplete:: ", configurationComplete);
      console.log("typeofconfigurationComplete:: ", typeof(configurationComplete));

      setConfig(configurationComplete);
      setConfigurationId(configuration?.id);
    } catch (error) {
      console.error("Error fetching configuration:", error);
      setConfig({});
    }
  }

  useEffect(() => {
    fetchPayrollConfiguration();
  }, []);

  const handleSavePF = async (values: IProvidentFund) => {
    const updatedConfig = {
      ...config,
      providentFund: values
    };
    try {
      await saveConfiguration(updatedConfig, "Provident Fund updated successfully");
      setShowPFModal(false);
    } catch (error) {
      // Error handled in saveConfiguration
    }
  };

  const handleSavePT = async (values: IProfessionalTax) => {
    const updatedConfig = {
      ...config,
      professionalTax: values
    };
    try {
      await saveConfiguration(updatedConfig, "Professional Tax rules updated successfully");
      setShowPTModal(false);
    } catch (error) {
      // Error handled in saveConfiguration
    }
  };

  const saveConfiguration = async (newConfig: IDeductionConfig, successMessage: string) => {
    setLoading(true);
    try {
      const payload = {
        module: DEDUCTIONS,
        configuration: newConfig
      };
      await updateConfigurationById(configurationId, payload);
      successConfirmation(successMessage);
      fetchPayrollConfiguration();
    } catch (err) {
      console.error(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getMonthName = (monthIndex?: number) => {
    if (monthIndex === undefined || monthIndex === null) return "";
    const date = new Date();
    date.setMonth(monthIndex);
    return date.toLocaleString('default', { month: 'long' });
  };

  // Get data with defaults
  const professionalTax = config.professionalTax || null;
  const providentFund = config.providentFund || null;

  const styles = {
    container: {
      backgroundColor: '#f8f9fa',
      borderRadius: '16px',
      padding: '28px',
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '24px',
    },
    headerTitle: {
      fontFamily: 'Barlow, sans-serif',
      fontWeight: 700,
      fontSize: '24px',
      color: '#181C32',
      marginBottom: '8px',
      letterSpacing: '-0.5px',
    },
    card: {
      backgroundColor: '#ffffff',
      border: '1px solid #E8EAF0',
      borderRadius: '16px',
      display: 'flex',
      flexDirection: 'column' as const,
      overflow: 'hidden',
      boxShadow: '0 2px 12px rgba(24,28,50,0.05)',
      transition: 'box-shadow 0.2s ease',
    },
    cardHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap' as const,
      gap: '10px',
      padding: '18px 22px',
      background: 'linear-gradient(135deg, #ffffff 0%, #fdf9f9 100%)',
      borderBottom: '1px solid #f0f2f7',
    },
    cardHeaderLeft: {
      display: 'flex',
      alignItems: 'center',
      gap: '14px',
    },
    cardIcon: {
      width: '44px',
      height: '44px',
      borderRadius: '12px',
      background: 'linear-gradient(135deg, #fdf3f4 0%, #fce8e8 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#9d4141',
      fontSize: '20px',
      boxShadow: '0 3px 10px rgba(157,65,65,0.12)',
      border: '1px solid rgba(157,65,65,0.08)',
      flexShrink: 0 as const,
    },
    cardIconBlue: {
      width: '44px',
      height: '44px',
      borderRadius: '12px',
      background: 'linear-gradient(135deg, #e1f0fa 0%, #cce4f6 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#0085db',
      fontSize: '20px',
      boxShadow: '0 3px 10px rgba(0,133,219,0.12)',
      border: '1px solid rgba(0,133,219,0.08)',
      flexShrink: 0 as const,
    },
    cardTitle: {
      fontFamily: 'Inter, sans-serif',
      fontWeight: 700,
      fontSize: '16px',
      color: '#181C32',
      margin: 0,
    },
    cardSubtitle: {
      fontFamily: 'Inter, sans-serif',
      fontWeight: 400,
      fontSize: '12px',
      color: '#A1A5B7',
      margin: '2px 0 0 0',
    },
    configureBtn: {
      backgroundColor: '#ffffff',
      border: '1px solid #E1E3EA',
      borderRadius: '9px',
      color: '#3F4254',
      padding: '8px 18px',
      fontFamily: 'Inter, sans-serif',
      fontWeight: 600,
      fontSize: '13px',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '7px',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      boxShadow: '0 1px 4px rgba(24,28,50,0.06)',
      whiteSpace: 'nowrap' as const,
    },
    cardBody: {
      padding: '20px 22px',
    },
    sectionLabel: {
      fontFamily: 'Inter, sans-serif',
      fontWeight: 700,
      fontSize: '10.5px',
      color: '#A1A5B7',
      letterSpacing: '1.2px',
      textTransform: 'uppercase' as const,
      marginBottom: '14px',
    },
    genderGroupHeader: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      marginBottom: '10px',
    },
    genderLine: {
      flex: 1,
      height: '1px',
      backgroundColor: '#eef0f5',
    },
    ruleRow: {
      display: 'flex',
      alignItems: 'center',
      flexWrap: 'nowrap' as const,
      gap: '12px',
    },
    ruleCondition: {
      fontFamily: 'Inter, sans-serif',
      fontWeight: 600,
      fontSize: '13.5px',
      color: '#3F4254',
      flex: 1,
      minWidth: 0,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap' as const,
    },
    noData: {
      fontFamily: 'Inter, sans-serif',
      fontWeight: 500,
      fontSize: '14px',
      color: '#A1A5B7',
      fontStyle: 'italic',
      textAlign: 'center' as const,
      padding: '32px 0',
      backgroundColor: '#f9f9f9',
      borderRadius: '12px',
      border: '1px dashed #E1E3EA',
    },
    epfRow: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '3px',
    },
    epfLabel: {
      fontFamily: 'Inter, sans-serif',
      fontWeight: 600,
      fontSize: '10.5px',
      color: '#A1A5B7',
      letterSpacing: '1px',
      textTransform: 'uppercase' as const,
    },
    epfValue: {
      fontFamily: 'Inter, sans-serif',
      fontWeight: 600,
      fontSize: '15px',
      color: '#181C32',
    },
    sectionHeader: {
      display: 'flex',
      alignItems: 'center',
      marginBottom: '16px',
      marginTop: '32px',
      gap: '12px'
    },
    sectionLine: {
      width: '26px',
      height: '1px',
      backgroundColor: '#9d4141'
    },
    sectionTitle: {
      fontFamily: 'Inter, sans-serif',
      fontWeight: 600,
      fontSize: '15px',
      color: '#9d4141',
      letterSpacing: '0.75px',
      textTransform: 'uppercase' as const,
    },
    sectionDivider: {
      flexGrow: 1,
      height: '1px',
      backgroundColor: '#e0e0e0'
    },
    labelCol: {
      fontFamily: 'Inter, sans-serif',
      fontSize: '14px',
      color: '#2f2f2f',
    }
  };

  return (
    <div className="sc-container" style={styles.container}>
      {/* ── Gradient section header (matches General Settings pattern) ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap' as const, gap: '10px',
        padding: '14px 16px',
        background: 'linear-gradient(135deg, #fdf3f4 0%, #fff8f8 100%)',
        borderRadius: '12px',
        border: '1px solid rgba(157,65,65,0.1)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '34px', height: '34px', borderRadius: '9px',
            background: 'linear-gradient(135deg, #9d4141 0%, #b85555 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 3px 10px rgba(157,65,65,0.25)', flexShrink: 0,
          }}>
            <i className="bi bi-dash-square-fill" style={{ fontSize: '15px', color: '#fff' }} />
          </div>
          <div>
            <h2 style={{ fontFamily: 'Barlow, sans-serif', fontWeight: 700, fontSize: '16px', color: '#181C32', margin: 0, letterSpacing: '-0.2px' }}>
              Deductions Rules
            </h2>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: '#A1A5B7', margin: 0, fontWeight: 400 }}>
              Professional tax slabs, provident fund &amp; deduction rules
            </p>
          </div>
        </div>
      </div>

      {/* ── Professional Tax Card ─────────────────────────────── */}
      <div
        style={styles.card}
        onMouseOver={(e) => (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 28px rgba(24,28,50,0.08)'}
        onMouseOut={(e)  => (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 12px rgba(24,28,50,0.05)'}
      >
        {/* Card header */}
        <div className="sc-card-header" style={styles.cardHeader}>
          <div style={styles.cardHeaderLeft}>
            <div style={styles.cardIcon}><i className="bi bi-bank"></i></div>
            <div>
              <h3 style={styles.cardTitle}>Professional Tax</h3>
              <p style={styles.cardSubtitle}>Monthly salary-based tax deductions per gender</p>
            </div>
          </div>
          {canEdit && (
            <button
              className="sc-configure-btn"
              style={styles.configureBtn}
              onClick={() => setShowPTModal(true)}
              onMouseOver={(e) => { e.currentTarget.style.borderColor = '#9d4141'; e.currentTarget.style.color = '#9d4141'; e.currentTarget.style.backgroundColor = '#fdf3f4'; e.currentTarget.style.boxShadow = '0 3px 10px rgba(157,65,65,0.12)'; }}
              onMouseOut={(e)  => { e.currentTarget.style.borderColor = '#E1E3EA'; e.currentTarget.style.color = '#3F4254'; e.currentTarget.style.backgroundColor = '#ffffff'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(24,28,50,0.06)'; }}
            >
              <i className="bi bi-pencil-square" style={{ fontSize: '13px' }}></i> Configure
            </button>
          )}
        </div>

        {/* Card body */}
        <div className="sc-card-body" style={styles.cardBody}>
          {professionalTax ? (
            <>
              <div style={styles.sectionLabel}>Configured Rules</div>

              {/* ── Male group ──────────────────────────────────── */}
              <div style={{ marginBottom: '18px' }}>
                <div style={styles.genderGroupHeader}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '5px',
                    backgroundColor: '#e1f0fa', color: '#0085db',
                    border: '1px solid rgba(0,133,219,0.18)',
                    borderRadius: '99px', padding: '4px 12px',
                    fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 700,
                    letterSpacing: '0.5px', textTransform: 'uppercase' as const, flexShrink: 0,
                  }}>
                    <i className="bi bi-gender-male" style={{ fontSize: '12px' }}></i> Male
                  </span>
                  <div style={styles.genderLine}></div>
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: '#A1A5B7', flexShrink: 0 }}>
                    {[professionalTax.male.till, professionalTax.male.range, professionalTax.male.moreThan].filter(r => r.isActive).length} rules
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  {professionalTax.male.till.isActive && (
                    <div className="sc-rule-row sc-rule-male" style={styles.ruleRow}>
                      <span className="sc-rule-condition" style={styles.ruleCondition}>
                        Till ₹{professionalTax.male.till.maxValue}
                      </span>
                      <span className={`sc-rule-value ${professionalTax.male.till.monthlyTax === 0 ? 'sc-val-nil' : 'sc-val-amount'}`}>
                        {professionalTax.male.till.monthlyTax === 0 ? 'NIL' : `₹${professionalTax.male.till.monthlyTax} / month`}
                      </span>
                    </div>
                  )}
                  {professionalTax.male.range.isActive && (
                    <div className="sc-rule-row sc-rule-male" style={styles.ruleRow}>
                      <span className="sc-rule-condition" style={styles.ruleCondition}>
                        ₹{professionalTax.male.range.minValue} – ₹{professionalTax.male.range.maxValue}
                      </span>
                      <span className="sc-rule-value sc-val-amount">
                        ₹{professionalTax.male.range.monthlyTax} / month
                      </span>
                    </div>
                  )}
                  {professionalTax.male.moreThan.isActive && (
                    <div className="sc-rule-row sc-rule-male" style={styles.ruleRow}>
                      <span className="sc-rule-condition" style={styles.ruleCondition}>
                        Above ₹{professionalTax.male.moreThan.minValue}
                      </span>
                      <span className="sc-val-group">
                        <span className="sc-rule-value sc-val-amount">
                          ₹{professionalTax.male.moreThan.monthlyTax} / month
                        </span>
                        <span className="sc-except-text">
                          Except {getMonthName(professionalTax.male.lastMonth.month)}: ₹{professionalTax.male.lastMonth.monthlyTax}
                        </span>
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Gender divider */}
              <div style={{ height: '1px', background: 'linear-gradient(to right, #f0f2f7, #e8eaf0, #f0f2f7)', margin: '4px 0 18px' }}></div>

              {/* ── Female group ─────────────────────────────────── */}
              <div>
                <div style={styles.genderGroupHeader}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '5px',
                    backgroundColor: '#fff0f6', color: '#e91e8c',
                    border: '1px solid rgba(233,30,140,0.18)',
                    borderRadius: '99px', padding: '4px 12px',
                    fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 700,
                    letterSpacing: '0.5px', textTransform: 'uppercase' as const, flexShrink: 0,
                  }}>
                    <i className="bi bi-gender-female" style={{ fontSize: '12px' }}></i> Female
                  </span>
                  <div style={styles.genderLine}></div>
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: '#A1A5B7', flexShrink: 0 }}>
                    {[professionalTax.female.till, professionalTax.female.range, professionalTax.female.moreThan].filter(r => r.isActive).length} rules
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  {professionalTax.female.till.isActive && (
                    <div className="sc-rule-row sc-rule-female" style={styles.ruleRow}>
                      <span className="sc-rule-condition" style={styles.ruleCondition}>
                        Till ₹{professionalTax.female.till.maxValue}
                      </span>
                      <span className={`sc-rule-value ${professionalTax.female.till.monthlyTax === 0 ? 'sc-val-nil' : 'sc-val-amount'}`}>
                        {professionalTax.female.till.monthlyTax === 0 ? 'NIL' : `₹${professionalTax.female.till.monthlyTax} / month`}
                      </span>
                    </div>
                  )}
                  {professionalTax.female.range.isActive && (
                    <div className="sc-rule-row sc-rule-female" style={styles.ruleRow}>
                      <span className="sc-rule-condition" style={styles.ruleCondition}>
                        ₹{professionalTax.female.range.minValue} – ₹{professionalTax.female.range.maxValue}
                      </span>
                      <span className={`sc-rule-value ${professionalTax.female.range.monthlyTax === 0 ? 'sc-val-nil' : 'sc-val-amount'}`}>
                        {professionalTax.female.range.monthlyTax === 0 ? 'NIL' : `₹${professionalTax.female.range.monthlyTax} / month`}
                      </span>
                    </div>
                  )}
                  {professionalTax.female.moreThan.isActive && (
                    <div className="sc-rule-row sc-rule-female" style={styles.ruleRow}>
                      <span className="sc-rule-condition" style={styles.ruleCondition}>
                        Above ₹{professionalTax.female.moreThan.minValue}
                      </span>
                      <span className="sc-val-group">
                        <span className="sc-rule-value sc-val-amount">
                          ₹{professionalTax.female.moreThan.monthlyTax} / month
                        </span>
                        <span className="sc-except-text">
                          Except {getMonthName(professionalTax.female.lastMonth.month)}: ₹{professionalTax.female.lastMonth.monthlyTax}
                        </span>
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div style={styles.noData}><i className="bi bi-info-circle me-2"></i>No Professional Tax rules configured</div>
          )}
        </div>
      </div>

      {/* ── Employee Provident Fund Card ──────────────────────── */}
      <div
        style={styles.card}
        onMouseOver={(e) => (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 28px rgba(24,28,50,0.08)'}
        onMouseOut={(e)  => (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 12px rgba(24,28,50,0.05)'}
      >
        {/* Card header */}
        <div className="sc-card-header" style={{ ...styles.cardHeader, background: 'linear-gradient(135deg, #ffffff 0%, #f7fbff 100%)' }}>
          <div style={styles.cardHeaderLeft}>
            <div style={styles.cardIconBlue}><i className="bi bi-shield-check"></i></div>
            <div>
              <h3 style={styles.cardTitle}>Employee Provident Fund (EPF)</h3>
              <p style={styles.cardSubtitle}>Percentage-based retirement savings deduction</p>
            </div>
          </div>
          {canEdit && (
            <button
              className="sc-configure-btn"
              style={styles.configureBtn}
              onClick={() => setShowPFModal(true)}
              onMouseOver={(e) => { e.currentTarget.style.borderColor = '#0085db'; e.currentTarget.style.color = '#0085db'; e.currentTarget.style.backgroundColor = '#e1f0fa'; e.currentTarget.style.boxShadow = '0 3px 10px rgba(0,133,219,0.12)'; }}
              onMouseOut={(e)  => { e.currentTarget.style.borderColor = '#E1E3EA'; e.currentTarget.style.color = '#3F4254'; e.currentTarget.style.backgroundColor = '#ffffff'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(24,28,50,0.06)'; }}
            >
              <i className="bi bi-pencil-square" style={{ fontSize: '13px' }}></i> Configure
            </button>
          )}
        </div>

        {/* Card body */}
        <div className="sc-card-body" style={styles.cardBody}>
          {providentFund ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap' as const,
              gap: '16px',
              padding: '14px 18px',
              background: 'linear-gradient(135deg, #f7fbff 0%, #eef6fd 100%)',
              borderRadius: '12px',
              border: '1px solid rgba(0,133,219,0.1)',
            }}>
              {/* Fund name */}
              <div style={{ flex: 1, minWidth: '180px' }}>
                <div className="sc-epf-label" style={styles.epfLabel}>Fund Name</div>
                <div className="sc-epf-name" style={styles.epfValue}>{providentFund.name}</div>
              </div>

              {/* Divider */}
              <div style={{ width: '1px', height: '36px', backgroundColor: 'rgba(0,133,219,0.15)', flexShrink: 0 }}
                className="d-none d-sm-block"
              ></div>

              {/* Deduction rate */}
              <div style={{ flexShrink: 0 }}>
                <div className="sc-epf-label" style={styles.epfLabel}>Deduction Rate</div>
                <div style={{ marginTop: '4px' }}>
                  <span className="sc-deduction-tag" style={{
                    display: 'inline-flex', alignItems: 'center', gap: '5px',
                    backgroundColor: '#e1f0fa', color: '#0085db',
                    border: '1px solid rgba(0,133,219,0.2)',
                    borderRadius: '9px', padding: '6px 14px',
                    fontFamily: 'Inter, sans-serif', fontSize: '14px', fontWeight: 700,
                  }}>
                    <i className="bi bi-percent" style={{ fontSize: '12px' }}></i>
                    {providentFund.deduction}% of Basic
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div style={styles.noData}><i className="bi bi-info-circle me-2"></i>No EPF configured</div>
          )}
        </div>
      </div>



      {/* Professional Tax Modal */}
      <Modal show={showPTModal} onHide={() => setShowPTModal(false)} size="lg" centered>
        <Modal.Body className="sc-modal-body-lg" style={{
          backgroundColor: '#f8f9fa',
          borderRadius: '16px',
          padding: '28px 32px',
          maxHeight: '85vh',
          overflowY: 'auto'
        }}>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div className="sc-modal-title" style={{
              fontFamily: 'Barlow, sans-serif',
              fontWeight: 700,
              fontSize: '22px',
              color: '#181C32',
              letterSpacing: '-0.5px',
            }}>
              Edit Professional tax rule
            </div>
            <button 
              onClick={() => setShowPTModal(false)}
              style={{
                background: 'transparent',
                border: 'none',
                fontSize: '24px',
                color: '#A1A5B7',
                cursor: 'pointer'
              }}
            >
              <i className="bi bi-x"></i>
            </button>
          </div>

          <Formik
            initialValues={professionalTax || defaultProfessionalTax}
            validationSchema={professionalTaxSchema}
            onSubmit={handleSavePT}
            enableReinitialize
          >
            {({ values, setFieldValue }) => {


              return (
              <Form >
                {/* Male Section */}
                <div style={{ ...styles.sectionHeader, marginTop: '10px' }}>
                  <div style={styles.sectionLine}></div>
                  <div style={styles.sectionTitle}>FOR MALE</div>
                  <div style={styles.sectionDivider}></div>
                </div>
                <div className="sc-section-panel" style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '16px',
                  padding: '24px 20px',
                  border: '1px solid #E1E3EA',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
                  marginBottom: '20px'
                }}>

                  {/* Header Row */}
                  <div className="pt-header-row row mb-4" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '12px', color: '#B5B5C3', textTransform: 'uppercase', letterSpacing: '0.8px'}}>
                    <div className="col-2"></div>
                    <div className="col-4">Monthly Gross Salary</div>
                    <div className="col-4">Monthly Tax</div>
                    <div className="col-2 text-end">Enable</div>
                  </div>

                  {/* Male Till */}
                  <div className="row mb-3 align-items-center">
                    <div className="col-2" style={styles.labelCol}>Till</div>
                    <div className="col-4">
                      <TextInput formikField="male.till.maxValue" type="number" placeholder="Max Value" isRequired={true} parser={numberParser} />
                    </div>
                    <div className="col-4">
                      <TextInput formikField="male.till.monthlyTax" type="number" placeholder="Tax" isRequired={true} parser={numberParser} />
                    </div>
                    <div className="col-2 text-end">
                      <div className="form-check form-switch" style={{ display: 'inline-block' }}>
                        <input
                          className="form-check-input"
                          type="checkbox"
                          checked={values.male.till.isActive}
                          onChange={(e) => setFieldValue("male.till.isActive", e.target.checked)}
                          style={{
                            backgroundColor: values.male.till.isActive ? '#9d4141' : '#ccc',
                            borderColor: values.male.till.isActive ? '#9d4141' : '#ccc'
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Male Range */}
                  <div className="row mb-3 align-items-center">
                    <div className="col-2" style={styles.labelCol}></div>
                    <div className="col-4">
                      <div className="d-flex align-items-center gap-2">
                        <div className="flex-grow-1">
                          <TextInput formikField="male.range.minValue" type="number" placeholder="Min" isRequired={true} parser={numberParser} />
                        </div>
                        <div className="text-muted">-</div>
                        <div className="flex-grow-1">
                          <TextInput formikField="male.range.maxValue" type="number" placeholder="Max" isRequired={true} parser={numberParser} />
                        </div>
                      </div>
                    </div>
                    <div className="col-4">
                      <TextInput formikField="male.range.monthlyTax" type="number" placeholder="Tax" isRequired={true} parser={numberParser} />
                    </div>
                    <div className="col-2 text-end">
                      <div className="form-check form-switch" style={{ display: 'inline-block' }}>
                        <input
                          className="form-check-input"
                          type="checkbox"
                          checked={values.male.range.isActive}
                          onChange={(e) => setFieldValue("male.range.isActive", e.target.checked)}
                          style={{
                            backgroundColor: values.male.range.isActive ? '#9d4141' : '#ccc',
                            borderColor: values.male.range.isActive ? '#9d4141' : '#ccc'
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Male More Than */}
                  <div className="row mb-3 align-items-center">
                    <div className="col-2" style={styles.labelCol}>More than</div>
                    <div className="col-4">
                      <TextInput formikField="male.moreThan.minValue" type="number" placeholder="Value" isRequired={true} parser={numberParser} />
                    </div>
                    <div className="col-4">
                      <TextInput formikField="male.moreThan.monthlyTax" type="number" placeholder="Tax" isRequired={true} parser={numberParser} />
                    </div>
                    <div className="col-2 text-end">
                      <div className="form-check form-switch" style={{ display: 'inline-block' }}>
                        <input
                          className="form-check-input"
                          type="checkbox"
                          checked={values.male.moreThan.isActive}
                          onChange={(e) => setFieldValue("male.moreThan.isActive", e.target.checked)}
                          style={{
                            backgroundColor: values.male.moreThan.isActive ? '#9d4141' : '#ccc',
                            borderColor: values.male.moreThan.isActive ? '#9d4141' : '#ccc'
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Male Last Month */}
                  <div className="row mb-4 align-items-center">
                    <div className="col-2" style={styles.labelCol}>Last Month</div>
                    <div className="col-4">
                      <DropdownInput
                        formikField="male.lastMonth.month"
                        inputLabel=""
                        options={monthOptions}
                        isRequired={true}
                        placeholder="Select Month"
                        value={monthOptions.find(opt => opt.value === values.male.lastMonth.month)}
                        onChange={(option) => setFieldValue("male.lastMonth.month", option.value)}
                      />
                    </div>
                    <div className="col-4">
                      <TextInput formikField="male.lastMonth.monthlyTax" type="number" placeholder="Tax" isRequired={true} parser={numberParser} />
                    </div>
                    <div className="col-2 text-end">
                      <div className="form-check form-switch" style={{ display: 'inline-block' }}>
                        <input
                          className="form-check-input"
                          type="checkbox"
                          checked={values.male.lastMonth.isActive}
                          onChange={(e) => setFieldValue("male.lastMonth.isActive", e.target.checked)}
                          style={{
                            backgroundColor: values.male.lastMonth.isActive ? '#9d4141' : '#ccc',
                            borderColor: values.male.lastMonth.isActive ? '#9d4141' : '#ccc'
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Female Section */}
                <div style={styles.sectionHeader}>
                  <div style={styles.sectionLine}></div>
                  <div style={styles.sectionTitle}>FOR FEMALE</div>
                  <div style={styles.sectionDivider}></div>
                </div>

                <div className="sc-section-panel" style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '16px',
                  padding: '24px 20px',
                  border: '1px solid #E1E3EA',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
                }}>
                  {/* Header Row */}
                  <div className="pt-header-row row mb-4" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '12px', color: '#B5B5C3', textTransform: 'uppercase', letterSpacing: '0.8px'}}>
                    <div className="col-2"></div>
                    <div className="col-4">Monthly Gross Salary</div>
                    <div className="col-4">Monthly Tax</div>
                    <div className="col-2 text-end">Enable</div>
                  </div>

                  {/* Female Till */}
                  <div className="row mb-3 align-items-center">
                    <div className="col-2" style={styles.labelCol}>Till</div>
                    <div className="col-4">
                      <TextInput formikField="female.till.maxValue" type="number" placeholder="Max Value" isRequired={true} parser={numberParser} />
                    </div>
                    <div className="col-4">
                      <TextInput formikField="female.till.monthlyTax" type="number" placeholder="Tax" isRequired={true} parser={numberParser} />
                    </div>
                    <div className="col-2 text-end">
                      <div className="form-check form-switch" style={{ display: 'inline-block' }}>
                        <input
                          className="form-check-input"
                          type="checkbox"
                          checked={values.female.till.isActive}
                          onChange={(e) => setFieldValue("female.till.isActive", e.target.checked)}
                          style={{
                            backgroundColor: values.female.till.isActive ? '#9d4141' : '#ccc',
                            borderColor: values.female.till.isActive ? '#9d4141' : '#ccc'
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Female Range */}
                  <div className="row mb-3 align-items-center">
                    <div className="col-2" style={styles.labelCol}></div>
                    <div className="col-4">
                      <div className="d-flex align-items-center gap-2">
                        <div className="flex-grow-1">
                          <TextInput formikField="female.range.minValue" type="number" placeholder="Min" isRequired={true} parser={numberParser} />
                        </div>
                        <div className="text-muted">-</div>
                        <div className="flex-grow-1">
                          <TextInput formikField="female.range.maxValue" type="number" placeholder="Max" isRequired={true} parser={numberParser} />
                        </div>
                      </div>
                    </div>
                    <div className="col-4">
                      <TextInput formikField="female.range.monthlyTax" type="number" placeholder="Tax" isRequired={true} parser={numberParser} />
                    </div>
                    <div className="col-2 text-end">
                      <div className="form-check form-switch" style={{ display: 'inline-block' }}>
                        <input
                          className="form-check-input"
                          type="checkbox"
                          checked={values.female.range.isActive}
                          onChange={(e) => setFieldValue("female.range.isActive", e.target.checked)}
                          style={{
                            backgroundColor: values.female.range.isActive ? '#9d4141' : '#ccc',
                            borderColor: values.female.range.isActive ? '#9d4141' : '#ccc'
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Female More Than */}
                  <div className="row mb-3 align-items-center">
                    <div className="col-2" style={styles.labelCol}>More than</div>
                    <div className="col-4">
                      <TextInput formikField="female.moreThan.minValue" type="number" placeholder="Value" isRequired={true} parser={numberParser} />
                    </div>
                    <div className="col-4">
                      <TextInput formikField="female.moreThan.monthlyTax" type="number" placeholder="Tax" isRequired={true} parser={numberParser} />
                    </div>
                    <div className="col-2 text-end">
                      <div className="form-check form-switch" style={{ display: 'inline-block' }}>
                        <input
                          className="form-check-input"
                          type="checkbox"
                          checked={values.female.moreThan.isActive}
                          onChange={(e) => setFieldValue("female.moreThan.isActive", e.target.checked)}
                          style={{
                            backgroundColor: values.female.moreThan.isActive ? '#9d4141' : '#ccc',
                            borderColor: values.female.moreThan.isActive ? '#9d4141' : '#ccc'
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Female Last Month */}
                  <div className="row mb-4 align-items-center">
                    <div className="col-2" style={styles.labelCol}>Last Month</div>
                    <div className="col-4">
                      <DropdownInput
                        formikField="female.lastMonth.month"
                        inputLabel=""
                        options={monthOptions}
                        isRequired={true}
                        placeholder="Select Month"
                        value={monthOptions.find(opt => opt.value === values.female.lastMonth.month)}
                        onChange={(option) => setFieldValue("female.lastMonth.month", option.value)}
                      />
                    </div>
                    <div className="col-4">
                      <TextInput formikField="female.lastMonth.monthlyTax" type="number" placeholder="Tax" isRequired={true} parser={numberParser} />
                    </div>
                    <div className="col-2 text-end">
                      <div className="form-check form-switch" style={{ display: 'inline-block' }}>
                        <input
                          className="form-check-input"
                          type="checkbox"
                          checked={values.female.lastMonth.isActive}
                          onChange={(e) => setFieldValue("female.lastMonth.isActive", e.target.checked)}
                          style={{
                            backgroundColor: values.female.lastMonth.isActive ? '#9d4141' : '#ccc',
                            borderColor: values.female.lastMonth.isActive ? '#9d4141' : '#ccc'
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <div className="d-flex justify-content-end sc-form-footer mt-4 pt-3" style={{ borderTop: '1px solid #E1E3EA' }}>
                  <button
                    type="button"
                    onClick={() => setShowPTModal(false)}
                    style={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #E1E3EA',
                      borderRadius: '8px',
                      color: '#3F4254',
                      height: '44px',
                      padding: '0 24px',
                      fontFamily: 'Inter, sans-serif',
                      fontWeight: 600,
                      fontSize: '15px',
                      cursor: 'pointer',
                      marginRight: '12px',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      backgroundColor: '#9d4141',
                      border: 'none',
                      borderRadius: '8px',
                      color: 'white',
                      height: '44px',
                      padding: '0 28px',
                      fontFamily: 'Inter, sans-serif',
                      fontWeight: 600,
                      fontSize: '15px',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      opacity: loading ? 0.7 : 1,
                      boxShadow: '0 4px 12px rgba(157, 65, 65, 0.2)',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseOver={(e) => { if (!loading) e.currentTarget.style.transform = 'translateY(-1px)'; }}
                    onMouseOut={(e) => { if (!loading) e.currentTarget.style.transform = 'translateY(0)'; }}
                  >
                    {loading ? "Saving..." : "Save Configuration"}
                  </button>
                </div>
              </Form>
            )
            }}
          </Formik>
        </Modal.Body>
      </Modal>

      {/* Provident Fund Modal */}
      <Modal show={showPFModal} onHide={() => setShowPFModal(false)} centered>
        <Modal.Body className="sc-pf-modal sc-modal-body" style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '32px 36px',
        }}>
          <div style={{
            fontFamily: 'Barlow, sans-serif',
            fontWeight: 600,
            fontSize: '24px',
            color: '#000000',
            marginBottom: '28px',
            letterSpacing: '0.24px',
          }}>
            Edit Provident Fund Rule
          </div>

          <Formik
            initialValues={providentFund || defaultProvidentFund}
            validationSchema={providentFundSchema}
            onSubmit={handleSavePF}
            enableReinitialize
          >
            {({ isValid }) => (
              <Form>
                <div style={{ marginBottom: '20px' }}>
                  <div style={{
                    fontFamily: 'Inter, sans-serif',
                    fontWeight: 500,
                    fontSize: '14px',
                    color: '#000000',
                    marginBottom: '12px',
                  }}>
                    Deduction (%)
                  </div>
                  <div style={{
                    backgroundColor: '#eef1f7',
                    borderRadius: '7px',
                    padding: '14px 16px',
                  }}>
                    <TextInput
                      formikField="deduction"
                      type="number"
                      isRequired={true}
                      parser={numberParser}
                      placeholder="Enter deduction percentage"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !isValid}
                  style={{
                    backgroundColor: '#9d4141',
                    border: 'none',
                    borderRadius: '6px',
                    color: 'white',
                    height: '40px',
                    padding: '0 20px',
                    fontFamily: 'Inter, sans-serif',
                    fontWeight: 500,
                    fontSize: '14px',
                    cursor: (loading || !isValid) ? 'not-allowed' : 'pointer',
                    opacity: (loading || !isValid) ? 0.7 : 1,
                  }}
                >
                  {loading ? "Saving..." : "Save"}
                </button>
              </Form>
            )}
          </Formik>
        </Modal.Body>
      </Modal>

    </div>
  );
}

export default DeductionRules;