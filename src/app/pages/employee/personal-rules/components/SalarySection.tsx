import React, { useState, useEffect } from 'react';
import { Card, Row, Col } from 'react-bootstrap';
import { fetchConfiguration } from '@services/company';
import { GROSS_PAY, DEDUCTIONS } from '@constants/configurations-key';
import Loader from '@app/modules/common/utils/Loader';

interface SalarySectionProps {
  sectionRef?: (el: HTMLDivElement | null) => void;
}

const SalarySection: React.FC<SalarySectionProps> = ({ sectionRef }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [grossPayItems, setGrossPayItems] = useState<any[]>([]);
  const [deductionRules, setDeductionRules] = useState<any[]>([]);
  const [professionalTax, setProfessionalTax] = useState<any[]>([]);
  const [providentFund, setProvidentFund] = useState<string>('');

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);

        // Load GROSS_PAY configuration
        const grossPayResponse = await fetchConfiguration(GROSS_PAY);
        const grossPayConfig = JSON.parse(grossPayResponse?.data?.configuration?.configuration || '{}');

        // Convert grossPay object to array
        const grossPayArray = Object.entries(grossPayConfig || {}).map(([key, value]) => ({
          name: key,
          value: value
        }));
        setGrossPayItems(grossPayArray);

        // Load DEDUCTIONS configuration
        const deductionsResponse = await fetchConfiguration(DEDUCTIONS);
        const deductionsConfig = JSON.parse(deductionsResponse?.data?.configuration?.configuration || '{}');

        // Parse deduction rules (assuming it's stored in a specific format)
        if (deductionsConfig['Late Check-in']) {
          setDeductionRules([{
            name: 'Late Check-in',
            period: deductionsConfig['Late Check-in']?.period || '4 Days',
            value: deductionsConfig['Late Check-in']?.value || '50% of 1 day'
          }]);
        }

        // Parse professional tax (assuming Maharashtra rates)
        if (deductionsConfig['Professional Tax']) {
          setProfessionalTax(deductionsConfig['Professional Tax'] || [
            { range: 'Male - Till ₹7500', deduction: 'NIL' },
            { range: 'Male  - ₹7501-₹10000', deduction: '₹175 per month' },
            { range: 'Male - More than ₹10000', deduction: '₹200 per month except February, ₹300 in February' },
            { range: 'Female - Till ₹25000', deduction: 'NIL' },
            { range: 'Female - Above ₹25000', deduction: '₹200 per month except Febraury, ₹300 in February' }
          ]);
        } else {
          // Default professional tax rates
          setProfessionalTax([
            { range: 'Male - Till ₹7500', deduction: 'NIL' },
            { range: 'Male  - ₹7501-₹10000', deduction: '₹175 per month' },
            { range: 'Male - More than ₹10000', deduction: '₹200 per month except February, ₹300 in February' },
            { range: 'Female - Till ₹25000', deduction: 'NIL' },
            { range: 'Female - Above ₹25000', deduction: '₹200 per month except Febraury, ₹300 in February' }
          ]);
        }

        // Parse provident fund
        setProvidentFund(deductionsConfig['EPF'] || '12%');

      } catch (error) {
        console.error('[SalarySection] Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const Divider: React.FC = () => (
    <div style={{
      backgroundColor: '#ced3da',
      height: '1px',
      width: '100%',
      margin: '20px 0'
    }} />
  );

  if (isLoading) {
    return <Loader />;
  }

  return (
    <Card
      ref={sectionRef}
      style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '8px 8px 16px 0px rgba(0,0,0,0.04)',
        border: 'none',
        width: '100%'
      }}
    >
      <Card.Body style={{
        padding: '20px 24px 44px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}>
        {/* Section Header */}
        <div style={{
          display: 'flex',
          gap: '16px',
          alignItems: 'center'
        }}>
          <div style={{
            backgroundColor: '#e9f1fd',
            borderRadius: '434334px',
            width: '44px',
            height: '44px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <i className="ki-duotone ki-wallet fs-2">
              <span className="path1"></span>
              <span className="path2"></span>
              <span className="path3"></span>
              <span className="path4"></span>
            </i>
          </div>
          <p style={{
            fontFamily: 'Barlow, sans-serif',
            fontWeight: 600,
            fontSize: '19px',
            letterSpacing: '0.19px',
            color: '#000',
            margin: 0
          }}>
            Salary
          </p>
        </div>

        {/* Deduction Rules */}
        {deductionRules.length > 0 && (
          <>
            <div>
              <div style={{ marginBottom: '16px' }}>
                <p style={{
                  fontFamily: 'Barlow, sans-serif',
                  fontWeight: 600,
                  fontSize: '16px',
                  letterSpacing: '0.16px',
                  textTransform: 'uppercase',
                  color: '#000',
                  margin: 0
                }}>
                  Deductions Rules
                </p>
                <p style={{
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 500,
                  fontSize: '14px',
                  color: '#8998ab',
                  margin: 0
                }}>
                  Salary deduction policies
                </p>
              </div>

              <div style={{ paddingLeft: '24px' }}>
                {/* Header */}
                <Row className="g-2 w-100 mb-3">
                  <Col xs={12} sm={4} md={4}>
                    <p style={{
                      fontFamily: 'Inter, sans-serif',
                      fontWeight: 500,
                      fontSize: '14px',
                      color: '#8998ab',
                      margin: 0
                    }}>
                      Name
                    </p>
                  </Col>
                  <Col xs={12} sm={4} md={4}>
                    <p style={{
                      fontFamily: 'Inter, sans-serif',
                      fontWeight: 500,
                      fontSize: '14px',
                      color: '#8998ab',
                      margin: 0
                    }}>
                      Period
                    </p>
                  </Col>
                  <Col xs={12} sm={4} md={4}>
                    <p style={{
                      fontFamily: 'Inter, sans-serif',
                      fontWeight: 500,
                      fontSize: '14px',
                      color: '#8998ab',
                      margin: 0
                    }}>
                      Deduction/Value
                    </p>
                  </Col>
                </Row>

                {/* Data */}
                {deductionRules.map((rule, index) => (
                  <Row key={index} className="g-2 w-100 mb-2">
                    <Col xs={12} sm={4} md={4}>
                      <p style={{
                        fontFamily: 'Inter, sans-serif',
                        fontWeight: 500,
                        fontSize: '14px',
                        color: '#000',
                        margin: 0
                      }}>
                        {rule.name}
                      </p>
                    </Col>
                    <Col xs={12} sm={4} md={4}>
                      <p style={{
                        fontFamily: 'Inter, sans-serif',
                        fontWeight: 400,
                        fontSize: '14px',
                        color: '#000',
                        margin: 0
                      }}>
                        {rule.period}
                      </p>
                    </Col>
                    <Col xs={12} sm={4} md={4}>
                      <p style={{
                        fontFamily: 'Inter, sans-serif',
                        fontWeight: 400,
                        fontSize: '14px',
                        color: '#000',
                        margin: 0
                      }}>
                        {rule.value}
                      </p>
                    </Col>
                  </Row>
                ))}
              </div>
            </div>

            <Divider />
          </>
        )}

        {/* Gross Pay Distribution */}
        {grossPayItems.length > 0 && (
          <>
            <div>
              <div style={{ marginBottom: '16px' }}>
                <p style={{
                  fontFamily: 'Barlow, sans-serif',
                  fontWeight: 600,
                  fontSize: '16px',
                  letterSpacing: '0.16px',
                  textTransform: 'uppercase',
                  color: '#000',
                  margin: 0
                }}>
                  Gross Pay Distribution
                </p>
                <p style={{
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 500,
                  fontSize: '14px',
                  color: '#8998ab',
                  margin: 0
                }}>
                  Salary components breakdown
                </p>
              </div>

              <div style={{ paddingLeft: '24px' }}>
                {/* Header */}
                <Row className="g-2 w-100 mb-3">
                  <Col xs={12} sm={8} md={8}>
                    <p style={{
                      fontFamily: 'Inter, sans-serif',
                      fontWeight: 500,
                      fontSize: '14px',
                      color: '#8998ab',
                      margin: 0
                    }}>
                      Name
                    </p>
                  </Col>
                  <Col xs={12} sm={4} md={4}>
                    <p style={{
                      fontFamily: 'Inter, sans-serif',
                      fontWeight: 500,
                      fontSize: '14px',
                      color: '#8998ab',
                      margin: 0,
                      textAlign: 'right'
                    }}>
                      Value
                    </p>
                  </Col>
                </Row>

                {/* Data */}
                {grossPayItems.map((item, index) => (
                  <Row key={index} className="g-2 w-100 mb-2">
                    <Col xs={12} sm={8} md={8}>
                      <p style={{
                        fontFamily: 'Inter, sans-serif',
                        fontWeight: 500,
                        fontSize: '14px',
                        color: '#000',
                        margin: 0
                      }}>
                        {item.name}
                      </p>
                    </Col>
                    <Col xs={12} sm={4} md={4}>
                      <p style={{
                        fontFamily: 'Inter, sans-serif',
                        fontWeight: 400,
                        fontSize: '14px',
                        color: '#000',
                        margin: 0,
                        textAlign: 'right'
                      }}>
                        {item.value}
                      </p>
                    </Col>
                  </Row>
                ))}
              </div>
            </div>

            <Divider />
          </>
        )}

        {/* Professional Tax */}
        <div>
          <div style={{ marginBottom: '16px' }}>
            <p style={{
              fontFamily: 'Barlow, sans-serif',
              fontWeight: 600,
              fontSize: '16px',
              letterSpacing: '0.16px',
              textTransform: 'uppercase',
              color: '#000',
              margin: 0
            }}>
              professional tax
            </p>
            <p style={{
              fontFamily: 'Inter, sans-serif',
              fontWeight: 500,
              fontSize: '14px',
              color: '#8998ab',
              margin: 0
            }}>
              State professional tax deduction rates
            </p>
          </div>

          <div style={{ paddingLeft: '24px' }}>
            {/* Header */}
            <Row className="g-2 w-100 mb-3">
              <Col xs={12} sm={6} md={6}>
                <p style={{
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 500,
                  fontSize: '14px',
                  color: '#8998ab',
                  margin: 0
                }}>
                  Salary per month
                </p>
              </Col>
              <Col xs={12} sm={6} md={6}>
                <p style={{
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 500,
                  fontSize: '14px',
                  color: '#8998ab',
                  margin: 0
                }}>
                  Deduction
                </p>
              </Col>
            </Row>

            {/* Data */}
            {professionalTax.map((tax, index) => (
              <Row key={index} className="g-2 w-100 mb-2">
                <Col xs={12} sm={6} md={6}>
                  <p style={{
                    fontFamily: 'Inter, sans-serif',
                    fontWeight: 500,
                    fontSize: '14px',
                    color: '#000',
                    margin: 0
                  }}>
                    {tax.range}
                  </p>
                </Col>
                <Col xs={12} sm={6} md={6}>
                  <p style={{
                    fontFamily: 'Inter, sans-serif',
                    fontWeight: 400,
                    fontSize: '14px',
                    color: '#000',
                    margin: 0
                  }}>
                    {tax.deduction}
                  </p>
                </Col>
              </Row>
            ))}
          </div>
        </div>

        <Divider />

        {/* Provident Fund */}
        <div>
          <div style={{ marginBottom: '16px' }}>
            <p style={{
              fontFamily: 'Barlow, sans-serif',
              fontWeight: 600,
              fontSize: '16px',
              letterSpacing: '0.16px',
              textTransform: 'uppercase',
              color: '#000',
              margin: 0
            }}>
              Provident Fund
            </p>
            <p style={{
              fontFamily: 'Inter, sans-serif',
              fontWeight: 500,
              fontSize: '14px',
              color: '#8998ab',
              margin: 0
            }}>
              Employee provident fund contribution
            </p>
          </div>

          <div style={{ paddingLeft: '24px' }}>
            {/* Header */}
            <Row className="g-2 w-100 mb-3">
              <Col xs={12} sm={8} md={8}>
                <p style={{
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 500,
                  fontSize: '14px',
                  color: '#8998ab',
                  margin: 0
                }}>
                  Salary per month
                </p>
              </Col>
              <Col xs={12} sm={4} md={4}>
                <p style={{
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 500,
                  fontSize: '14px',
                  color: '#8998ab',
                  margin: 0
                }}>
                  Deduction
                </p>
              </Col>
            </Row>

            {/* Data */}
            <Row className="g-2 w-100">
              <Col xs={12} sm={8} md={8}>
                <p style={{
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 500,
                  fontSize: '14px',
                  color: '#000',
                  margin: 0
                }}>
                  Employee Provident Fund (EPF)
                </p>
              </Col>
              <Col xs={12} sm={4} md={4}>
                <p style={{
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 400,
                  fontSize: '14px',
                  color: '#000',
                  margin: 0
                }}>
                  {providentFund}
                </p>
              </Col>
            </Row>
          </div>
        </div>
      </Card.Body>
    </Card>
  );
};

export default SalarySection;
