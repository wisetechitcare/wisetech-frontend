import React, { useEffect, useState } from "react";
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
      const configurationComplete = JSON.parse(configuration.configuration || '{}');
      console.log("configurationComplete:: ", configurationComplete);
      console.log("typeofconfigurationComplete:: ", typeof(configurationComplete));

      setConfig(configurationComplete);
      setConfigurationId(configuration.id);
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

  // Styles matching premium modern UI
  const styles = {
    container: {
      backgroundColor: '#f8f9fa',
      borderRadius: '16px',
      padding: '32px',
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '32px',
    },
    headerTitle: {
      fontFamily: 'Barlow, sans-serif',
      fontWeight: 700,
      fontSize: '28px',
      color: '#181C32',
      marginBottom: '8px',
      letterSpacing: '-0.5px',
    },
    headerDesc: {
      fontFamily: 'Inter, sans-serif',
      fontWeight: 500,
      fontSize: '14px',
      color: '#A1A5B7',
    },
    card: {
      backgroundColor: '#ffffff',
      border: '1px solid #E1E3EA',
      borderRadius: '16px',
      display: 'flex',
      flexDirection: 'column' as const,
      overflow: 'hidden',
      boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
      transition: 'box-shadow 0.2s ease',
    },
    cardHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '24px 32px',
      backgroundColor: '#ffffff',
      borderBottom: '1px solid #f0f0f0',
    },
    cardTitle: {
      fontFamily: 'Inter, sans-serif',
      fontWeight: 700,
      fontSize: '18px',
      color: '#181C32',
      margin: 0,
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
    },
    iconWrapper: {
      width: '40px',
      height: '40px',
      borderRadius: '10px',
      backgroundColor: '#fdf3f4',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#9d4141',
      fontSize: '20px',
    },
    configureBtn: {
      backgroundColor: '#ffffff',
      border: '1px solid #E1E3EA',
      borderRadius: '8px',
      color: '#3F4254',
      padding: '0 20px',
      height: '40px',
      fontFamily: 'Inter, sans-serif',
      fontWeight: 600,
      fontSize: '14px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    },
    cardBody: {
      padding: '32px',
    },
    columnHeader: {
      fontFamily: 'Inter, sans-serif',
      fontWeight: 600,
      fontSize: '13px',
      color: '#B5B5C3',
      textTransform: 'uppercase' as const,
      letterSpacing: '1px',
      marginBottom: '20px',
    },
    ruleRow: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px 20px',
      backgroundColor: '#fafafa',
      border: '1px dashed #E1E3EA',
      borderRadius: '12px',
      marginBottom: '12px',
      transition: 'background-color 0.2s ease',
    },
    badgeMale: {
      backgroundColor: '#e1f0fa',
      color: '#0085db',
      padding: '4px 10px',
      borderRadius: '6px',
      fontSize: '12px',
      fontWeight: 700,
      marginRight: '12px',
      textTransform: 'uppercase' as const,
    },
    badgeFemale: {
      backgroundColor: '#fcecf2',
      color: '#d61a5e',
      padding: '4px 10px',
      borderRadius: '6px',
      fontSize: '12px',
      fontWeight: 700,
      marginRight: '12px',
      textTransform: 'uppercase' as const,
    },
    ruleCondition: {
      fontFamily: 'Inter, sans-serif',
      fontWeight: 600,
      fontSize: '15px',
      color: '#3F4254',
    },
    ruleValue: {
      fontFamily: 'Inter, sans-serif',
      fontWeight: 700,
      fontSize: '15px',
      color: '#181C32',
    },
    tagValue: {
      backgroundColor: '#f1f1f4',
      padding: '6px 12px',
      borderRadius: '8px',
      color: '#3F4254',
      fontWeight: 600,
      fontSize: '14px',
    },
    noData: {
      fontFamily: 'Inter, sans-serif',
      fontWeight: 500,
      fontSize: '14px',
      color: '#A1A5B7',
      fontStyle: 'italic',
      textAlign: 'center' as const,
      padding: '40px 0',
      backgroundColor: '#f9f9f9',
      borderRadius: '12px',
      border: '1px dashed #E1E3EA',
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
    <div style={styles.container}>
      <div>
        <h1 style={styles.headerTitle}>Deductions Rules</h1>
        {/* <p style={styles.headerDesc}>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p> */}
      </div>

      {/* Professional Tax Card */}
      <div style={styles.card} onMouseOver={(e) => e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.06)'} onMouseOut={(e) => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.03)'}>
        <div style={styles.cardHeader}>
          <h3 style={styles.cardTitle}>
            <div style={styles.iconWrapper}>
              <i className="bi bi-bank"></i>
            </div>
            Professional Tax
          </h3>
          {canEdit && (
            <button
              style={styles.configureBtn}
              onClick={() => setShowPTModal(true)}
              onMouseOver={(e) => { e.currentTarget.style.borderColor = '#9d4141'; e.currentTarget.style.color = '#9d4141'; e.currentTarget.style.backgroundColor = '#fdf3f4'; }}
              onMouseOut={(e) => { e.currentTarget.style.borderColor = '#E1E3EA'; e.currentTarget.style.color = '#3F4254'; e.currentTarget.style.backgroundColor = '#ffffff'; }}
            >
              <i className="bi bi-pencil-square"></i> Configure
            </button>
          )}
        </div>

        <div style={styles.cardBody}>
          <div className="row">
            <div className="col-12">
              <div style={styles.columnHeader}>Configured Rules</div>
              {professionalTax ? (
                <div className="d-flex flex-column gap-2">
                  {professionalTax.male.till.isActive && (
                    <div style={styles.ruleRow}>
                      <div className="d-flex align-items-center">
                        <span style={styles.badgeMale}>Male</span>
                        <span style={styles.ruleCondition}>Till ₹{professionalTax.male.till.maxValue}</span>
                      </div>
                      <span style={styles.ruleValue}>{professionalTax.male.till.monthlyTax === 0 ? "NIL" : `₹${professionalTax.male.till.monthlyTax} / month`}</span>
                    </div>
                  )}
                  {professionalTax.male.range.isActive && (
                    <div style={styles.ruleRow}>
                      <div className="d-flex align-items-center">
                        <span style={styles.badgeMale}>Male</span>
                        <span style={styles.ruleCondition}>₹{professionalTax.male.range.minValue} - ₹{professionalTax.male.range.maxValue}</span>
                      </div>
                      <span style={styles.ruleValue}>₹{professionalTax.male.range.monthlyTax} / month</span>
                    </div>
                  )}
                  {professionalTax.male.moreThan.isActive && (
                    <div style={styles.ruleRow}>
                      <div className="d-flex align-items-center">
                        <span style={styles.badgeMale}>Male</span>
                        <span style={styles.ruleCondition}>Above ₹{professionalTax.male.moreThan.minValue}</span>
                      </div>
                      <span style={styles.ruleValue}>₹{professionalTax.male.moreThan.monthlyTax} / month <span style={{fontSize: '12px', color: '#A1A5B7', fontWeight: 500}}>(Except {getMonthName(professionalTax.male.lastMonth.month)}: ₹{professionalTax.male.lastMonth.monthlyTax})</span></span>
                    </div>
                  )}
                  {professionalTax.female.till.isActive && (
                    <div style={styles.ruleRow}>
                      <div className="d-flex align-items-center">
                        <span style={styles.badgeFemale}>Female</span>
                        <span style={styles.ruleCondition}>Till ₹{professionalTax.female.till.maxValue}</span>
                      </div>
                      <span style={styles.ruleValue}>{professionalTax.female.till.monthlyTax === 0 ? "NIL" : `₹${professionalTax.female.till.monthlyTax} / month`}</span>
                    </div>
                  )}
                  {professionalTax.female.range.isActive && (
                    <div style={styles.ruleRow}>
                      <div className="d-flex align-items-center">
                        <span style={styles.badgeFemale}>Female</span>
                        <span style={styles.ruleCondition}>₹{professionalTax.female.range.minValue} - ₹{professionalTax.female.range.maxValue}</span>
                      </div>
                      <span style={styles.ruleValue}>₹{professionalTax.female.range.monthlyTax} / month</span>
                    </div>
                  )}
                  {professionalTax.female.moreThan.isActive && (
                    <div style={styles.ruleRow}>
                      <div className="d-flex align-items-center">
                        <span style={styles.badgeFemale}>Female</span>
                        <span style={styles.ruleCondition}>Above ₹{professionalTax.female.moreThan.minValue}</span>
                      </div>
                      <span style={styles.ruleValue}>₹{professionalTax.female.moreThan.monthlyTax} / month <span style={{fontSize: '12px', color: '#A1A5B7', fontWeight: 500}}>(Except {getMonthName(professionalTax.female.lastMonth.month)}: ₹{professionalTax.female.lastMonth.monthlyTax})</span></span>
                    </div>
                  )}
                </div>
              ) : (
                <div style={styles.noData}><i className="bi bi-info-circle me-2"></i>No Professional Tax rules configured</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Provident Fund Card */}
      <div style={styles.card} onMouseOver={(e) => e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.06)'} onMouseOut={(e) => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.03)'}>
        <div style={styles.cardHeader}>
          <h3 style={styles.cardTitle}>
            <div style={styles.iconWrapper}>
              <i className="bi bi-shield-check"></i>
            </div>
            Employee Provident Fund (EPF)
          </h3>
          {canEdit && (
            <button
              style={styles.configureBtn}
              onClick={() => setShowPFModal(true)}
              onMouseOver={(e) => { e.currentTarget.style.borderColor = '#9d4141'; e.currentTarget.style.color = '#9d4141'; e.currentTarget.style.backgroundColor = '#fdf3f4'; }}
              onMouseOut={(e) => { e.currentTarget.style.borderColor = '#E1E3EA'; e.currentTarget.style.color = '#3F4254'; e.currentTarget.style.backgroundColor = '#ffffff'; }}
            >
              <i className="bi bi-pencil-square"></i> Configure
            </button>
          )}
        </div>

        <div style={styles.cardBody}>
          <div className="row">
            <div className="col-md-6">
              <div style={styles.columnHeader}>Fund Name</div>
              {providentFund ? (
                <div style={styles.ruleCondition}>{providentFund.name}</div>
              ) : (
                <div style={styles.noData}>No EPF configured</div>
              )}
            </div>
            <div className="col-md-6">
              <div style={styles.columnHeader}>Deduction Rate</div>
              {providentFund && (
                <div><span style={styles.tagValue}>{providentFund.deduction}% of Basic</span></div>
              )}
            </div>
          </div>
        </div>
      </div>



      {/* Professional Tax Modal */}
      <Modal show={showPTModal} onHide={() => setShowPTModal(false)} size="lg" centered>
        <Modal.Body style={{
          backgroundColor: '#f8f9fa',
          borderRadius: '16px',
          padding: '32px 40px',
          maxHeight: '85vh',
          overflowY: 'auto'
        }}>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div style={{
              fontFamily: 'Barlow, sans-serif',
              fontWeight: 700,
              fontSize: '26px',
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
                <div style={{
                  backgroundColor: '#FFFFFF', 
                  borderRadius: '16px', 
                  padding: '28px 24px',
                  border: '1px solid #E1E3EA',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
                  marginBottom: '24px'
                }}>

                  {/* Header Row */}
                  <div className="row mb-4" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '13px', color: '#B5B5C3', textTransform: 'uppercase', letterSpacing: '1px'}}>
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

                <div style={{
                  backgroundColor: '#FFFFFF', 
                  borderRadius: '16px', 
                  padding: '28px 24px',
                  border: '1px solid #E1E3EA',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
                }}>
                  {/* Header Row */}
                  <div className="row mb-4" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '13px', color: '#B5B5C3', textTransform: 'uppercase', letterSpacing: '1px'}}>
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
                <div className="d-flex justify-content-end mt-4 pt-3" style={{ borderTop: '1px solid #E1E3EA' }}>
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
        <Modal.Body style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '40px 44px',
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