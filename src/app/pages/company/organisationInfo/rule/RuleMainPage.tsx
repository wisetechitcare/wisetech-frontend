import React, { useState, useEffect, useCallback } from 'react';
import RuleSectionHeader from './components/RuleSectionHeader';
import RuleSectionTitle from './components/RuleSectionTitle';
import RuleItem from './components/RuleItem';
import RuleDivider from './components/RuleDivider';
import ShiftTimeList from './components/ShiftTimeList';
import LeaveAllowanceTable from './components/LeaveAllowanceTable';
import SalaryDistributionTable from './components/SalaryDistributionTable';
import DeductionRulesTable from './components/DeductionRulesTable';
import ProfessionalTaxTable from './components/ProfessionalTaxTable';
import { mockRuleData } from './mockData';
import { RuleCategory } from './types';
import { faqsIcons } from '@metronic/assets/sidepanelicons';
import { IFaqs } from '@models/company';
import { fetchAllFaqs, fetchCompanyOverview } from '@services/company';
import { useEventBus } from '@hooks/useEventBus';

const RuleMainPage = () => {
  const [selectedCategory, setSelectedCategory] = useState<RuleCategory>('Attendance');
  const [faqs, setFaqs] = useState<IFaqs[]>([]);

  const categories: RuleCategory[] = ['Attendance', 'Leaves', 'Reimbursement', 'Salary'];

  // Fetch all FAQs
  const fetchFaqs = useCallback(async () => {
    try {
      const { data: { companyOverview } } = await fetchCompanyOverview();
      const companyId = companyOverview[0].id;
      const response = await fetchAllFaqs(companyId);

      // Extract FAQs from all sections and ensure type is set
      const sections = response?.data?.sections || [];
      const allFaqs = sections.reduce((acc: IFaqs[], section: any) => {
        const sectionFaqs = (section.faqs || []).map((faq: IFaqs) => ({
          ...faq,
          type: faq.type || section.id
        }));
        return [...acc, ...sectionFaqs];
      }, []);

      setFaqs(allFaqs);
    } catch (error) {
      console.log('Error fetching FAQs:', error);
      setFaqs([]);
    }
  }, []);

  // Listen to FAQ events for real-time updates
  useEventBus('faqCreated', fetchFaqs);
  useEventBus('faqUpdated', fetchFaqs);
  useEventBus('faqDeleted', fetchFaqs);

  useEffect(() => {
    fetchFaqs();
  }, [fetchFaqs]);

  // Filter FAQs by type
  const getFaqsByType = (type: string) => {
    return faqs.filter(faq => faq.type?.toLowerCase() === type.toLowerCase());
  };

  // FAQ Display Component
  const FaqSection = ({ type }: { type: string }) => {
    const categoryFaqs = getFaqsByType(type);

    if (categoryFaqs.length === 0) return null;

    return (
      <>
        <RuleDivider />
        <div className="d-flex flex-column gap-4">
          <RuleSectionTitle title="Frequently Asked Questions" />
          <div className="d-flex flex-column gap-3">
            {categoryFaqs.map((faq, index) => (
              <div key={faq.id} className="d-flex flex-column gap-2">
                <div
                  style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#000',
                  }}
                >
                  {faq.question}
                </div>
                <div
                  style={{
                    fontSize: '14px',
                    fontWeight: 400,
                    color: '#5e6278',
                    lineHeight: '1.6',
                  }}
                >
                  {faq.answer}
                </div>
              </div>
            ))}
          </div>
        </div>
      </>
    );
  };

  return (
    <div
      // style={{
      //   backgroundColor: '#f7f9fc',
      //   minHeight: '100vh',
      //   padding: '20px',
      // }}
       style={{
        backgroundColor: '#f5f8fa',
        // backgroundColor:"red",
        maxHeight: '73vh',
        // padding: '0px',
        overflow: 'scroll',
      }}
    >
      {/* Header */}
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div className="d-flex align-items-center gap-3">
          <h1
            style={{
              fontSize: '24px',
              fontWeight: 600,
              color: '#000',
              letterSpacing: '0.24px',
              margin: 0,
            }}
          >
            Rules
          </h1>
        </div>
        {/* <button
          style={{
            backgroundColor: '#9d4141',
            border: 'none',
            borderRadius: '6px',
            color: '#fff',
            fontSize: '14px',
            fontWeight: 500,
            padding: '10px 32px',
            cursor: 'pointer',
            height: '40px',
          }}
        >
          Edit
        </button> */}
      </div>

      {/* Main Content */}
     <div className="d-flex gap-3 align-items-start flex-md-row flex-column">
        {/* Sidebar */}
        <div
          className="d-flex gap-3 flex-md-column flex-row"
          style={{
            minWidth: '170px',
            overflow: 'scroll',
          }}
        >
          {categories.map((category) => (
            <div
              key={category}
              onClick={() => setSelectedCategory(category)}
              style={{
                padding: '7px 8px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <span
                style={{
                  fontSize: '14px',
                  fontWeight: 500,
                  color: selectedCategory === category ? '#9d4141' : '#000',
                }}
              >
                {category}
              </span>
            </div>
          ))}
        </div>

        {/* Content Area */}
        <div className="d-flex flex-column gap-4" style={{
          flex: 1,
            overflowY: 'auto',
            height: '59vh',
            paddingRight: '10px',
          }}>
          {/* Attendance Section */}
          {selectedCategory === 'Attendance' && (
            <div
              style={{
                backgroundColor: '#fff',
                borderRadius: '12px',
                padding: '20px 24px 44px',
                boxShadow: '8px 8px 16px 0px rgba(0, 0, 0, 0.04)',
              }}
            >
              <div className="d-flex flex-column gap-4">
                <RuleSectionHeader  icon={faqsIcons?.attendanceFaqsIcon?.default} title="Attendance" />

                {/* Shift Time */}
                <div className="d-flex flex-column gap-4">
                  <RuleSectionTitle
                    title={mockRuleData.attendance.shiftType}
                    description={mockRuleData.attendance.description}
                  />
                  <ShiftTimeList shifts={mockRuleData.attendance.shiftTimes} />
                </div>

                <RuleDivider />

                {/* Other Durations */}
                <div className="d-flex flex-column gap-4">
                  <RuleSectionTitle
                    title="Other Durations"
                    description="lorem ispum shs aj dks dk"
                  />
                  <div className="d-flex flex-column gap-3" style={{ maxWidth: '820px' }}>
                    {mockRuleData.attendance.otherDurations.map((duration, index) => (
                      <RuleItem
                        key={index}
                        label={duration.label}
                        value={duration.value}
                        description={duration.description}
                      />
                    ))}
                  </div>
                </div>

                {/* FAQs */}
                <FaqSection type="attendance" />
              </div>
            </div>
          )}

          {/* Leaves Section */}
          {selectedCategory === 'Leaves' && (
            <div
              style={{
                backgroundColor: '#fff',
                borderRadius: '12px',
                padding: '20px 24px 44px',
                boxShadow: '8px 8px 16px 0px rgba(0, 0, 0, 0.04)',
              }}
            >
              <div className="d-flex flex-column gap-4">
                <RuleSectionHeader icon={faqsIcons?.leaveFaqsIcon?.default} title="Leaves" />

                {/* General */}
                <div className="d-flex flex-column gap-4">
                  <RuleSectionTitle title="General" />
                  <div className="d-flex flex-column gap-3" style={{ maxWidth: '820px' }}>
                    {mockRuleData.leaves.general.map((item, index) => (
                      <RuleItem
                        key={index}
                        label={item.label}
                        value={item.value}
                        description={item.description}
                      />
                    ))}
                  </div>
                </div>

                <RuleDivider />

                {/* Leaves Allowance */}
                <div className="d-flex flex-column gap-4">
                  <RuleSectionTitle
                    title="Leaves allowance"
                    description="lorem ispum shs aj dks dk"
                  />
                  <LeaveAllowanceTable allowances={mockRuleData.leaves.allowances} />
                </div>

                {/* FAQs */}
                <FaqSection type="leaves" />
              </div>
            </div>
          )}

          {/* Salary Section */}
          {selectedCategory === 'Salary' && (
            <div
              style={{
                backgroundColor: '#fff',
                borderRadius: '12px',
                padding: '20px 24px 44px',
                boxShadow: '8px 8px 16px 0px rgba(0, 0, 0, 0.04)',
              }}
            >
              <div className="d-flex flex-column gap-5">
                <RuleSectionHeader title="Salary" />

                {/* Deduction Rules */}
                <div className="d-flex flex-column gap-4">
                  <RuleSectionTitle
                    title="Deductions Rules"
                    description="lorem ispum shs aj dks dk"
                  />
                  <DeductionRulesTable rules={mockRuleData.salary.deductionRules} />
                </div>

                <RuleDivider />

                {/* Gross Pay Distribution */}
                <div className="d-flex flex-column gap-4">
                  <RuleSectionTitle
                    title="Gross Pay Distribution"
                    description="lorem ispum shs aj dks dk"
                  />
                  <SalaryDistributionTable items={mockRuleData.salary.grossPayDistribution} />
                </div>

                <RuleDivider />

                {/* Professional Tax */}
                <div className="d-flex flex-column gap-4">
                  <RuleSectionTitle
                    title="professional tax"
                    description="lorem ispum shs aj dks dk"
                  />
                  <ProfessionalTaxTable rules={mockRuleData.salary.professionalTax} />
                </div>

                <RuleDivider />

                {/* Provident Fund */}
                <div className="d-flex flex-column gap-4">
                  <RuleSectionTitle
                    title="Provident Fund"
                    description="lorem ispum shs aj dks dk"
                  />
                  <div className="d-flex flex-column gap-1" style={{ width: '100%' }}>
                    <div className="d-flex align-items-center gap-3 w-100">
                      <span
                        style={{
                          fontSize: '14px',
                          fontWeight: 500,
                          color: '#8998ab',
                          width: '330px',
                        }}
                      >
                        Salary per month
                      </span>
                      <span
                        style={{
                          fontSize: '14px',
                          fontWeight: 500,
                          color: '#8998ab',
                          flex: 1,
                        }}
                      >
                        Deduction
                      </span>
                    </div>
                    <div className="d-flex flex-column gap-3">
                      {mockRuleData.salary.providentFund.map((item, index) => (
                        <div key={index} className="d-flex align-items-start gap-3 w-100">
                          <span
                            style={{
                              fontSize: '14px',
                              fontWeight: 500,
                              color: '#000',
                              width: '330px',
                            }}
                          >
                            {item.name}
                          </span>
                          <span
                            style={{
                              fontSize: '14px',
                              fontWeight: 400,
                              color: '#000',
                              flex: 1,
                            }}
                          >
                            {item.deduction}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* FAQs */}
                <FaqSection type="salary" />
              </div>
            </div>
          )}

          {/* Reimbursement Section */}
          {selectedCategory === 'Reimbursement' && (
            <div
              style={{
                backgroundColor: '#fff',
                borderRadius: '12px',
                padding: '20px 24px 44px',
                boxShadow: '8px 8px 16px 0px rgba(0, 0, 0, 0.04)',
              }}
            >
              <div className="d-flex flex-column gap-4">
                <RuleSectionHeader title="Reimbursement" />
                <div style={{ minHeight: '88px' }} />

                {/* FAQs */}
                <FaqSection type="reimbursement" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RuleMainPage;
