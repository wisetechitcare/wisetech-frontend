import React, { useState } from 'react';
import GrossPayDistribution from "./views/salary-configuration/GrossPayDistribution";
import DeductionRules from "./views/salary-configuration/DeductionRules";
import CustomRules from "./views/salary-configuration/CustomRules";
import GeneralSettings from "./views/salary-configuration/GeneralSettings";

const SalaryConfiguration = () => {
  const [activeTab, setActiveTab] = useState<'general' | 'gross' | 'deduction' | 'custom'>('general');

  const tabs = [
    { id: 'general', label: 'General Settings', icon: 'bi-gear' },
    { id: 'gross', label: 'Gross Pay Distribution', icon: 'bi-cash-stack' },
    { id: 'deduction', label: 'Deduction Rules', icon: 'bi-dash-square' },
    { id: 'custom', label: 'Custom Rules', icon: 'bi-sliders' },
  ];

  return (
    <div className="container-fluid py-6 px-0" style={{ maxWidth: '100%' }}>
      {/* Page Header and Tab Navigation */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        padding: '32px 32px 0 32px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
        marginBottom: '24px',
        border: '1px solid #E1E3EA'
      }}>
        <h1 style={{
          fontFamily: 'Barlow, sans-serif',
          fontWeight: 700,
          fontSize: '28px',
          color: '#181C32',
          letterSpacing: '-0.5px',
          marginBottom: '24px'
        }}>
          Salary Configuration
        </h1>

        {/* Tab Navigation */}
        <div className="d-flex" style={{ gap: '32px', borderBottom: '1px solid #E1E3EA' }}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: '0 0 16px 0',
                  margin: '0',
                  color: isActive ? '#9d4141' : '#7E8299',
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: isActive ? 600 : 500,
                  fontSize: '15px',
                  position: 'relative',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'color 0.2s ease'
                }}
              >
                <i className={`bi ${tab.icon} fs-5`}></i>
                {tab.label}
                {/* Active Underline */}
                {isActive && (
                  <div style={{
                    position: 'absolute',
                    bottom: '-1px',
                    left: 0,
                    right: 0,
                    height: '3px',
                    backgroundColor: '#9d4141',
                    borderRadius: '3px 3px 0 0'
                  }}></div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content Area */}
      <div className="tab-content" style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
        {activeTab === 'general' && <GeneralSettings />}
        {activeTab === 'gross' && <GrossPayDistribution />}
        {activeTab === 'deduction' && <DeductionRules />}
        {activeTab === 'custom' && <CustomRules />}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

export default SalaryConfiguration;