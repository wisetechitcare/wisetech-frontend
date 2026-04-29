import { useEffect, useState } from "react";
import { Formik, Form } from "formik";
import {
  createNewConfiguration,
  fetchConfiguration,
  updateConfigurationById,
} from "@services/company";
import { successConfirmation, errorConfirmation } from "@utils/modal";
import { SANDWICH_LEAVE_KEY, DATE_SETTINGS_KEY } from "@constants/configurations-key";
import { Container, Spinner } from "react-bootstrap";

interface SandwichConfig {
  isSandwichLeaveFirstEnabled: boolean;
  isSandwichLeaveSecondEnabled: boolean;
  isSandwichLeaveThirdEnabled: boolean;
  isSandwichLeaveFourthEnabled: boolean;
  isSandwichLeaveFifthEnabled: boolean;
  isSandwichLeaveSixthEnabled: boolean;
  isSandwichLeaveSeventhEnabled: boolean;
  isSandwichLeaveEighthEnabled: boolean
}

interface DateConfig {
  useDateSettings: boolean;
}

interface FormValues extends SandwichConfig {
  isDateEnabled: boolean;
}
interface SandwichLeaveProps {
  showSandWhichLeaveModal: (visible: boolean) => void;
  readOnly?: boolean;  // When true, disables all inputs and hides save button
}

function SandwichLeave({ showSandWhichLeaveModal, readOnly = false }: SandwichLeaveProps) {
  const [sandwichConfigId, setSandwichConfigId] = useState<string | null>(null);
  const [dateConfigId, setDateConfigId] = useState<string | null>(null);
  const [initialValues, setInitialValues] = useState<FormValues>({
    isDateEnabled: false,
    isSandwichLeaveFirstEnabled: false,
    isSandwichLeaveSecondEnabled: false,
    isSandwichLeaveThirdEnabled: false,
    isSandwichLeaveFourthEnabled: false,
    isSandwichLeaveFifthEnabled: false,
    isSandwichLeaveSixthEnabled: false,
    isSandwichLeaveSeventhEnabled: false,
    isSandwichLeaveEighthEnabled: false,
  });
  const [isLoading, setIsLoading] = useState(true);

  async function fetchConfigurations() {
    try {
      const [
        { data: { configuration: sandwichConfigData } },
        { data: { configuration: dateConfigData } },
      ] = await Promise.all([
        fetchConfiguration(SANDWICH_LEAVE_KEY),
        fetchConfiguration(DATE_SETTINGS_KEY),
      ]);

      const sandwichConfig: SandwichConfig = sandwichConfigData?.configuration
        ? JSON.parse(sandwichConfigData.configuration)
        : {};

      const dateConfig: DateConfig = dateConfigData?.configuration
        ? JSON.parse(dateConfigData.configuration)
        : {};

      setSandwichConfigId(sandwichConfigData.id);
      setDateConfigId(dateConfigData.id);

      setInitialValues({
        isDateEnabled: dateConfig.useDateSettings ?? false,
        isSandwichLeaveFirstEnabled: sandwichConfig.isSandwichLeaveFirstEnabled ?? false,
        isSandwichLeaveSecondEnabled: sandwichConfig.isSandwichLeaveSecondEnabled ?? false,
        isSandwichLeaveThirdEnabled: sandwichConfig.isSandwichLeaveThirdEnabled ?? false,
        isSandwichLeaveFourthEnabled: sandwichConfig.isSandwichLeaveFourthEnabled ?? false,
        isSandwichLeaveFifthEnabled: sandwichConfig.isSandwichLeaveFifthEnabled ?? false,
        isSandwichLeaveSixthEnabled: sandwichConfig.isSandwichLeaveSixthEnabled ?? false,
        isSandwichLeaveSeventhEnabled: sandwichConfig.isSandwichLeaveSeventhEnabled ?? false,
        isSandwichLeaveEighthEnabled: sandwichConfig.isSandwichLeaveEighthEnabled ?? false
      });
    } catch (err) {
      console.error("Error fetching configurations", err);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchConfigurations();
  }, []);

  const handleSubmit = async (values: FormValues) => {
    try {
      await Promise.all([
        sandwichConfigId
          ? updateConfigurationById(sandwichConfigId, {
            module: SANDWICH_LEAVE_KEY,
            configuration: {
              isSandwichLeaveFirstEnabled: values.isSandwichLeaveFirstEnabled,
              isSandwichLeaveSecondEnabled: values.isSandwichLeaveSecondEnabled,
              isSandwichLeaveThirdEnabled: values.isSandwichLeaveThirdEnabled,
              isSandwichLeaveFourthEnabled: values.isSandwichLeaveFourthEnabled,
              isSandwichLeaveFifthEnabled: values.isSandwichLeaveFifthEnabled,
              isSandwichLeaveSixthEnabled: values.isSandwichLeaveSixthEnabled,
              isSandwichLeaveSeventhEnabled: values.isSandwichLeaveSeventhEnabled,
              isSandwichLeaveEighthEnabled: values.isSandwichLeaveEighthEnabled,
            },
          })
          : createNewConfiguration({
            module: SANDWICH_LEAVE_KEY,
            configuration: {
              isSandwichLeaveFirstEnabled: values.isSandwichLeaveFirstEnabled,
              isSandwichLeaveSecondEnabled: values.isSandwichLeaveSecondEnabled,
              isSandwichLeaveThirdEnabled: values.isSandwichLeaveThirdEnabled,
              isSandwichLeaveFourthEnabled: values.isSandwichLeaveFourthEnabled,
              isSandwichLeaveFifthEnabled: values.isSandwichLeaveFifthEnabled,
              isSandwichLeaveSixthEnabled: values.isSandwichLeaveSixthEnabled,
            },
          }),
        dateConfigId
          ? updateConfigurationById(dateConfigId, {
            module: DATE_SETTINGS_KEY,
            configuration: {
              useDateSettings: values.isDateEnabled,
            },
          })
          : createNewConfiguration({
            module: DATE_SETTINGS_KEY,
            configuration: {
              useDateSettings: values.isDateEnabled,
            },
          }),
      ]);

      await successConfirmation("Configurations saved successfully");
      showSandWhichLeaveModal(false)
    } catch (err) {
      console.error("Error saving configurations:", err);
      errorConfirmation("Error saving configurations");
    }
  };

  const standardRules = [
    {
      scenario: "Scenario 1",
      statusKey: "isSandwichLeaveFirstEnabled",
      days: ["Paid Leave", "Holiday", "Holiday", "Paid Leave"],
      counts: ["Count in salary", "Count in salary", "Count in salary", "Count in salary"],
    },
    {
      scenario: "Scenario 2",
      statusKey: "isSandwichLeaveSecondEnabled",
      days: ["Unpaid Leave", "Holiday", "Holiday", "Unpaid Leave"],
      counts: ["Don't count in salary", "Don't count in salary", "Don't count in salary", "Don't count in salary"],
    },
    {
      scenario: "Scenario 3",
      statusKey: "isSandwichLeaveThirdEnabled",
      days: ["Paid Leave", "Holiday", "Holiday", "Unpaid Leave"],
      counts: ["Count in salary", "Count in salary", "Count in salary", "Don't count in salary"],
    },
    {
      scenario: "Scenario 4",
      statusKey: "isSandwichLeaveFourthEnabled",
      days: ["Unpaid Leave", "Holiday", "Holiday", "Paid Leave"],
      counts: ["Don't count in salary", "Don't count in salary", "Don't count in salary", "Count in salary"],
    },
  ];

  const weekendRules = [
    {
      scenario: "Scenario 5",
      statusKey: "isSandwichLeaveFifthEnabled",
      days: ["NA", "Paid Leave", "Holiday", "Paid/Unpaid Leave"],
      counts: ["-", "Count in salary", "Don't count in salary", "Don't count in salary"],
    },
    {
      scenario: "Scenario 6",
      statusKey: "isSandwichLeaveSixthEnabled",
      days: ["Paid Leave", "Holiday", "Holiday", "Paid/Unpaid Leave"],
      counts: ["Count in salary", "Don't count in salary", "Don't count in salary", "Don't count in salary"],
    },
    {
      scenario: "Scenario 7",
      statusKey: "isSandwichLeaveSeventhEnabled",
      days: ["Unpaid Leave", "Holiday", "Holiday", "Paid/Unpaid Leave"],
      counts: ["Don't in salary", "Don't count in salary", "Don't count in salary", "Don't count in salary"],
    },
    {
      scenario: "Scenario 8",
      statusKey: "isSandwichLeaveEighthEnabled",
      days: ["NA", "Unpaid Leave", "Holiday", "Paid/Unpaid Leave"],
      counts: ["-", "Don't count in salary", "Don't count in salary", "Don't count in salary"],
    },
  ];

  if (isLoading) {
    return <Container fluid className="my-4 w-100 px-0 d-flex justify-content-center align-items-center" style={{ minHeight: '300px' }}>
      <div className="spinner-border text-primary" role="status">
        <span className="visually-hidden">Loading...</span>
      </div>
    </Container>
  }

  return (
    <div className="container mt-4 mb-7" style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', fontFamily: 'Inter' }}>
      <Formik enableReinitialize initialValues={initialValues} onSubmit={handleSubmit}>
        {({ values, handleChange, isSubmitting }) => (
          <Form placeholder={''}>
            {/* Date Settings - Commented out as it's now in OtherSettings component */}
            {/* <div className="d-flex justify-content-between align-items-md-center align-items-start mb-8 pt-3 flex-column flex-sm-row gap-5">
              <h5 className="mb-0" style={{ fontWeight: '600', fontSize:'18px' }}>Date Settings <br />
                <span style={{ fontSize: '12px'}} className="text-muted">When ON, shows data only up to today. When OFF, shows the full period (weekly, monthly, yearly).</span>
              </h5>
              <div className="d-flex align-items-center">
                <span className="me-8" style={{ fontSize: '14px' }}>Show Data Up to Today</span>
                <div className="form-check form-switch me-5">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    name="isDateEnabled"
                    checked={values.isDateEnabled}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div> */}

            {/* Standard Scenarios */}
            <div className="mb-4 table-responsive">
              <h6 className="mb-3 mt-6" style={{ fontWeight: '500', fontStyle: 'italic', }}>Standard Scenarios</h6>
              <span className="text-muted" style={{ fontStyle: 'italic' }}>Holiday status should be active</span>
              <table className="table table-bordered align-middle text-center">
                <thead style={{ backgroundColor: '#f8f9fa' }}>
                  <tr>
                    <th style={{ color: '#6c757d', fontStyle: 'italic', fontWeight: '400' }}>Days</th>
                    <th style={{ color: '#6c757d', fontStyle: 'italic', fontWeight: '400' }}>1</th>
                    <th style={{ color: '#6c757d', fontStyle: 'italic', fontWeight: '400' }}>2</th>
                    <th style={{ color: '#6c757d', fontStyle: 'italic', fontWeight: '400' }}>3</th>
                    <th style={{ color: '#6c757d', fontStyle: 'italic', fontWeight: '400' }}>4</th>
                    <th style={{ color: '#6c757d', fontStyle: 'italic', fontWeight: '400' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {standardRules.map((rule, index) => (
                    <tr key={rule.scenario + index}>
                      <td>
                        <div className="fw-bold">{rule.scenario}</div>
                        <div className="text-muted" style={{ fontSize: "12px", fontStyle: 'italic' }}>Payroll Rule</div>
                      </td>
                      {rule.days.map((day, i) => (
                        <td key={i}>
                          <div>{day}</div>
                          <div
                            style={{
                              fontSize: "12px",
                              color: rule.counts[i].includes("Don't") ? "#dc3545" : "#28a745",
                              fontWeight: '500'
                            }}
                          >
                            {rule.counts[i]}
                          </div>
                        </td>
                      ))}
                      <td>
                        <div className="form-check form-switch d-flex justify-content-center">
                          <input
                            type="checkbox"
                            className="form-check-input"
                            name={rule.statusKey}
                            checked={(values as any)[rule.statusKey]}
                            onChange={handleChange}
                            disabled={readOnly}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Weekend Sandwich Scenarios */}
            <div className="mb-4 table-responsive">
              <h6 className="mb-3" style={{ fontWeight: '500', fontStyle: 'italic' }}>Weekend Sandwich Scenarios</h6>
              <table className="table table-bordered align-middle text-center">
                <thead style={{ backgroundColor: '#f8f9fa' }}>
                  <tr>
                    <th style={{ color: '#6c757d', fontStyle: 'italic', fontWeight: '400' }}>Scenarios</th>
                    <th style={{ color: '#6c757d', fontStyle: 'italic', fontWeight: '400' }}>Friday</th>
                    <th style={{ color: '#6c757d', fontStyle: 'italic', fontWeight: '400' }}>Saturday</th>
                    <th style={{ color: '#6c757d', fontStyle: 'italic', fontWeight: '400' }}>Sunday</th>
                    <th style={{ color: '#6c757d', fontStyle: 'italic', fontWeight: '400' }}>Monday</th>
                    <th style={{ color: '#6c757d', fontStyle: 'italic', fontWeight: '400' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {weekendRules.map((rule, index) => (
                    <tr key={rule.scenario + index}>
                      <td>
                        <div className="fw-bold">{rule.scenario}</div>
                        <div className="text-muted" style={{ fontSize: "12px", fontStyle: 'italic' }}>Payroll Rule</div>
                      </td>
                      {rule.days.map((day, i) => (
                        <td key={i}>
                          <div>{day}</div>
                          <div
                            style={{
                              fontSize: "12px",
                              color: rule.counts[i].includes("Don't") ? "#dc3545" : "#28a745",
                              fontWeight: '500'
                            }}
                          >
                            {rule.counts[i]}
                          </div>
                        </td>
                      ))}
                      <td>
                        <div className="form-check form-switch d-flex justify-content-center">
                          <input
                            type="checkbox"
                            className="form-check-input"
                            name={rule.statusKey}
                            checked={(values as any)[rule.statusKey]}
                            onChange={handleChange}
                            disabled={readOnly}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {!readOnly && (
              <div className="text-start">
                <button className="btn btn-primary" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? <span>Please wait..  <Spinner animation="border" size="sm" /></span> : "Save"}
                </button>
              </div>
            )}
          </Form>
        )}
      </Formik>
    </div>
  );
}

export default SandwichLeave;