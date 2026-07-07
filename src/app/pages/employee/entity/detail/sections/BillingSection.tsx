import React from 'react';

/**
 * Billing — the project's financial workspace (invoices, payments, ledger, taxes…).
 * Currently an "In Development" placeholder; full spec at webapp/docs/BILLING_MODULE_PLAN.md.
 */
const BillingSection: React.FC<{ lead?: any }> = () => (
  <div
    style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      textAlign: 'center', minHeight: 420, padding: '48px 24px', fontFamily: 'Inter',
    }}
  >
    <div
      style={{
        width: 72, height: 72, borderRadius: 20, marginBottom: 22,
        background: '#9d414114', color: '#9d4141',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <i className="bi bi-receipt-cutoff" style={{ fontSize: 34 }} />
    </div>

    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 7,
        fontSize: 11.5, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase',
        padding: '5px 12px', borderRadius: 999, marginBottom: 14,
        background: '#fff7ed', color: '#b45309', border: '1px solid #fed7aa',
      }}
    >
      <span style={{ width: 7, height: 7, borderRadius: 999, background: '#f59e0b', display: 'inline-block' }} />
      In Development
    </span>

    <h2 style={{ fontFamily: 'Barlow', fontWeight: 800, fontSize: 22, color: '#1E293B', margin: '0 0 8px' }}>
      Billing &amp; Financial Management
    </h2>
    <p style={{ fontSize: 14, color: '#94A3B8', margin: 0, maxWidth: 440, lineHeight: 1.55 }}>
      This financial workspace is under development and will be available soon.
    </p>
  </div>
);

export default BillingSection;
