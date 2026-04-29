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

interface IDeductionConfig {
  professionalTax?: IProfessionalTax;
  providentFund?: IProvidentFund;
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

  // Styles matching Figma exactly
  const styles = {
    container: {
      backgroundColor: '#ffffff',
      borderRadius: '12px',
      padding: '24px',
      boxShadow: '8px 8px 16px 0px rgba(0,0,0,0.04)',
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '24px',
    },
    headerTitle: {
      fontFamily: 'Barlow, sans-serif',
      fontWeight: 600,
      fontSize: '24px',
      color: '#000000',
      marginBottom: '4px',
      letterSpacing: '0.24px',
    },
    headerDesc: {
      fontFamily: 'Inter, sans-serif',
      fontWeight: 500,
      fontSize: '12px',
      color: '#8998ab',
    },
    card: {
      backgroundColor: '#ffffff',
      border: '1px solid #c1c9d6',
      borderRadius: '12px',
      padding: '20px 16px',
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '12px',
    },
    cardHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '12px',
    },
    cardTitle: {
      fontFamily: 'Inter, sans-serif',
      fontWeight: 600,
      fontSize: '16px',
      color: '#000000',
      margin: 0,
    },
    configureBtn: {
      border: '1px solid #9d4141',
      borderRadius: '6px',
      backgroundColor: 'transparent',
      color: '#9d4141',
      padding: '0 20px',
      height: '40px',
      fontFamily: 'Inter, sans-serif',
      fontWeight: 500,
      fontSize: '14px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    },
    columnHeader: {
      fontFamily: 'Inter, sans-serif',
      fontWeight: 500,
      fontSize: '14px',
      color: '#8998ab',
      marginBottom: '12px',
    },
    rowText: {
      fontFamily: 'Inter, sans-serif',
      fontWeight: 500,
      fontSize: '14px',
      color: '#000000',
      marginBottom: '8px',
    },
    rowValue: {
      fontFamily: 'Inter, sans-serif',
      fontWeight: 400,
      fontSize: '14px',
      color: '#000000',
      marginBottom: '8px',
    },
    noData: {
      fontFamily: 'Inter, sans-serif',
      fontWeight: 400,
      fontSize: '14px',
      color: '#8998ab',
      fontStyle: 'italic',
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
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h3 style={styles.cardTitle}>Professional tax</h3>
          {canEdit && (
            <button
              style={styles.configureBtn}
              onClick={() => setShowPTModal(true)}
              onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#9d4141'; e.currentTarget.style.color = 'white'; }}
              onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#9d4141'; }}
            >
              Configure
            </button>
          )}
        </div>

        <div className="row">
          <div className="col-md-6">
            <div style={styles.columnHeader}>Monthly Gross Salary</div>
            {professionalTax ? (
              <>
                {professionalTax.male.till.isActive && (
                  <div style={styles.rowText}>Male - Till ₹{professionalTax.male.till.maxValue}</div>
                )}
                {professionalTax.male.range.isActive && (
                  <div style={styles.rowText}>Male - ₹{professionalTax.male.range.minValue}-₹{professionalTax.male.range.maxValue}</div>
                )}
                {professionalTax.male.moreThan.isActive && (
                  <div style={styles.rowText}>Male - More than ₹{professionalTax.male.moreThan.minValue}</div>
                )}
                {professionalTax.female.till.isActive && (
                  <div style={styles.rowText}>Female - Till ₹{professionalTax.female.till.maxValue}</div>
                )}
                {professionalTax.female.range.isActive && (
                  <div style={styles.rowText}>Female - ₹{professionalTax.female.range.minValue}-₹{professionalTax.female.range.maxValue}</div>
                )}
                {professionalTax.female.moreThan.isActive && (
                  <div style={styles.rowText}>Female - Above ₹{professionalTax.female.moreThan.minValue}</div>
                )}
              </>
            ) : (
              <div style={styles.noData}>No rules configured</div>
            )}
          </div>
          <div className="col-md-6">
            <div style={styles.columnHeader}>Monthly Tax</div>
            {professionalTax ? (
              <>
                {professionalTax.male.till.isActive && (
                  <div style={styles.rowValue}>
                    {professionalTax.male.till.monthlyTax === 0 ? "NIL" : `₹${professionalTax.male.till.monthlyTax}`}
                  </div>
                )}
                {professionalTax.male.range.isActive && (
                  <div style={styles.rowValue}>₹{professionalTax.male.range.monthlyTax} per month</div>
                )}
                {professionalTax.male.moreThan.isActive && (
                  <div style={styles.rowValue}>
                    ₹{professionalTax.male.moreThan.monthlyTax} per month except {getMonthName(professionalTax.male.lastMonth.month)}, ₹{professionalTax.male.lastMonth.monthlyTax} in {getMonthName(professionalTax.male.lastMonth.month)}
                  </div>
                )}
                {professionalTax.female.till.isActive && (
                  <div style={styles.rowValue}>
                    {professionalTax.female.till.monthlyTax === 0 ? "NIL" : `₹${professionalTax.female.till.monthlyTax}`}
                  </div>
                )}
                {professionalTax.female.range.isActive && (
                  <div style={styles.rowValue}>₹{professionalTax.female.range.monthlyTax} per month</div>
                )}
                {professionalTax.female.moreThan.isActive && (
                  <div style={styles.rowValue}>
                    ₹{professionalTax.female.moreThan.monthlyTax} per month except {getMonthName(professionalTax.female.lastMonth.month)}, ₹{professionalTax.female.lastMonth.monthlyTax} in {getMonthName(professionalTax.female.lastMonth.month)}
                  </div>
                )}
              </>
            ) : null}
          </div>
        </div>
      </div>

      {/* Provident Fund Card */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h3 style={styles.cardTitle}>Employee Provident Fund (EPF)</h3>
          {canEdit && (
            <button
              style={styles.configureBtn}
              onClick={() => setShowPFModal(true)}
              onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#9d4141'; e.currentTarget.style.color = 'white'; }}
              onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#9d4141'; }}
            >
              Configure
            </button>
          )}
        </div>

        <div className="row">
          <div className="col-md-6">
            <div style={styles.columnHeader}>Name</div>
            {providentFund ? (
              <div style={styles.rowText}>{providentFund.name}</div>
            ) : (
              <div style={styles.noData}>No rules configured</div>
            )}
          </div>
          <div className="col-md-6">
            <div style={styles.columnHeader}>Deduction</div>
            {providentFund && (
              <div style={styles.rowValue}>{providentFund.deduction}%</div>
            )}
          </div>
        </div>
      </div>

      {/* Professional Tax Modal */}
      <Modal show={showPTModal} onHide={() => setShowPTModal(false)} size="lg" centered>
        <Modal.Body style={{
          backgroundColor: '#f7f9fc',
          borderRadius: '12px',
          padding: '24px 20px',
          maxHeight: '85vh',
          overflowY: 'auto'
        }}>
          <div style={{
            fontFamily: 'Barlow, sans-serif',
            fontWeight: 600,
            fontSize: '24px',
            color: '#000000',
            marginBottom: '24px',
            letterSpacing: '0.24px',
          }}>
            Edit Professional tax rule
          </div>

          <Formik
            initialValues={professionalTax || defaultProfessionalTax}
            validationSchema={professionalTaxSchema}
            onSubmit={handleSavePT}
            enableReinitialize
          >
            {({ values, setFieldValue }) => {


              return (
              <Form placeholder={undefined} >
                {/* Male Section */}
                <div style={{ ...styles.sectionHeader, marginTop: '0' }}>
                  <div style={styles.sectionLine}></div>
                  <div style={styles.sectionTitle}>FOR MALE</div>
                  <div style={styles.sectionDivider}></div>
                </div>
                <div style={{backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '24px 20px'}}>

                  {/* Header Row */}
                  <div className="row mb-3" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 500, fontSize: '14px', color: '#8998ab'}}>
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

                <div style={{backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '24px 20px'}}>
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
                <button
                  type="submit"
                  disabled={loading}
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
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.7 : 1,
                    marginTop: '20px'
                  }}
                >
                  {loading ? "Saving..." : "Save"}
                </button>
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
              <Form placeholder={undefined}>
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