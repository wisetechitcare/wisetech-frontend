import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Modal } from 'react-bootstrap';
import { fetchConfiguration } from '@services/company';
import { fetchAllAddonLeavesAllowances, IAddonLeavesAllowance } from '@services/addonLeavesAllowance';
import { LEAVE_MANAGEMENT } from '@constants/configurations-key';
import Loader from '@app/modules/common/utils/Loader';
import LeavesAllowanceSection from './LeavesAllowanceSection';
import { KTIcon } from '@metronic/helpers';
import SandwichLeave from '@pages/company/settings/SandwhichLeave';

interface LeavesSectionProps {
  sectionRef?: (el: HTMLDivElement | null) => void;
}

const LeavesSection: React.FC<LeavesSectionProps> = ({ sectionRef }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [monthlyAnnualLeaveLimit, setMonthlyAnnualLeaveLimit] = useState<string>('');
  const [addonAllowances, setAddonAllowances] = useState<IAddonLeavesAllowance[]>([]);
  const [showSandwichLeaveModal, setShowSandwichLeaveModal] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        console.log('[LeavesSection] Starting to load leaves data...');

        // Load LEAVE_MANAGEMENT configuration for monthly annual leave limit
        const leaveConfigResponse = await fetchConfiguration(LEAVE_MANAGEMENT);
        console.log('[LeavesSection] Raw LEAVE_MANAGEMENT response:', leaveConfigResponse);

        const leaveConfig = JSON.parse(leaveConfigResponse?.data?.configuration?.configuration || '{}');
        console.log('[LeavesSection] Parsed LEAVE_MANAGEMENT config:', leaveConfig);

        // Get monthly annual leaves limit
        const monthlyLimit = leaveConfig?.['Number of Annual Leaves allowed per month'] || '2';
        console.log('[LeavesSection] Monthly Annual Leave Limit:', monthlyLimit);
        setMonthlyAnnualLeaveLimit(monthlyLimit);

        // Load addon leaves allowances
        const allowancesResponse = await fetchAllAddonLeavesAllowances();
        console.log('[LeavesSection] Addon leaves response:', allowancesResponse);

        if (!allowancesResponse?.hasError && allowancesResponse.data?.addonLeavesAllowances) {
          console.log('[LeavesSection] Addon allowances data:', allowancesResponse.data.addonLeavesAllowances);
          setAddonAllowances(allowancesResponse.data.addonLeavesAllowances);
        } else {
          console.log('[LeavesSection] No addon allowances found or error occurred');
        }

      } catch (error) {
        console.error('[LeavesSection] Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

    const handleOpenSandwichLeaveModal = () => {
      setShowSandwichLeaveModal(true);
    };
  
    const handleCloseSandwichLeaveModal = (visible: boolean) => {
      setShowSandwichLeaveModal(visible);
    };

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
            <i className="ki-duotone ki-calendar-tick fs-2">
              <span className="path1"></span>
              <span className="path2"></span>
              <span className="path3"></span>
              <span className="path4"></span>
              <span className="path5"></span>
              <span className="path6"></span>
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
            Leaves
          </p>
        </div>

        {/* Number of Annual Leaves allowed per month */}
        <Row className="g-2 align-items-center">
          <Col xs={6} sm={8} md={8}>
            <p style={{
              fontFamily: 'Inter, sans-serif',
              fontWeight: 500,
              fontSize: '14px',
              color: '#000',
              margin: 0
            }}>
              Number of Annual Leaves allowed per month
            </p>
          </Col>
          <Col xs={6} sm={4} md={4}>
            <p style={{
              fontFamily: 'Inter, sans-serif',
              fontWeight: 400,
              fontSize: '14px',
              color: '#000',
              margin: 0,
              textAlign: 'center'
            }}>
              {monthlyAnnualLeaveLimit}
            </p>
          </Col>
        </Row>

        {/* Divider */}
        <div style={{
          backgroundColor: '#ced3da',
          height: '1px',
          width: '100%',
          margin: '0'
        }} />

        {/* Leaves Allowance Section */}
        <LeavesAllowanceSection addonAllowances={addonAllowances} />


        {/* Divider */}
        <div style={{
          backgroundColor: '#ced3da',
          height: '1px',
          width: '100%',
          margin: '0'
        }} />

        {/* addsandwichhereconfigurehere */}

        {/* Sandwich Leave Settings - Read Only */}
               
        <Card
          onClick={handleOpenSandwichLeaveModal}
          style={{
            borderRadius: '12px',
            border: 'none',
            boxShadow: '8px 8px 16px 0px rgba(0, 0, 0, 0.09)',
            cursor: 'pointer'
          }}>
          <Card.Body className="d-flex justify-content-between align-items-center" style={{ padding: '20px 16px' }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 500, fontFamily: 'Inter, sans-serif', marginBottom: '4px' }}>
                Sandwich Rules
              </div>
              <div style={{ fontSize: '12px', color: '#8696ad', fontFamily: 'Inter, sans-serif' }}>
                View sandwich leave scenarios for payroll
              </div>
            </div>
            <KTIcon iconName="right" className="fs-3 text-danger" />
          </Card.Body>
        </Card>

        {/* Sandwich Leave Modal - Read Only */}
      <Modal
        show={showSandwichLeaveModal}
        onHide={() => handleCloseSandwichLeaveModal(false)}
        size="xl"
        centered
      >
        <Modal.Header style={{ padding: '20px', backgroundColor: '#f7f9fc', border: 'none' }} closeButton>
          <Modal.Title style={{ fontSize: '24px', fontWeight: 600, fontFamily: 'Barlow, sans-serif', letterSpacing: '0.24px' }}>
            Sandwich Leave Settings
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ padding: '0', backgroundColor: '#f7f9fc' }}>
          <SandwichLeave showSandWhichLeaveModal={handleCloseSandwichLeaveModal} readOnly={true} />
        </Modal.Body>
      </Modal>
       
      </Card.Body>
    </Card>
  );
};

export default LeavesSection;
