import React, { useState } from 'react';
import dayjs from 'dayjs';

interface TestScenario {
  id: string;
  name: string;
  description: string;
  checkinTime: string;
  checkoutTime?: string;
  expectedCheckinTime: string;
  gracePeriod: string;
  workingHours: number;
  expectedResults: {
    late?: boolean;
    lateHours?: number;
    onTime?: boolean;
    workingDays?: boolean;
    overtime?: number;
    absentYesterday?: boolean;
  };
}

const TEST_SCENARIOS: TestScenario[] = [
  {
    id: 'test-1',
    name: 'Test 1: On-Time Check-In',
    description: 'User checks in before grace period ends',
    checkinTime: '09:25',
    expectedCheckinTime: '09:30',
    gracePeriod: '00:30:00',
    workingHours: 8,
    expectedResults: {
      late: false,
      onTime: true,
      lateHours: 0,
    }
  },
  {
    id: 'test-2',
    name: 'Test 2: Late Within Grace',
    description: 'User checks in late but within grace period',
    checkinTime: '09:50',
    expectedCheckinTime: '09:30',
    gracePeriod: '00:30:00',
    workingHours: 8,
    expectedResults: {
      late: false,
      onTime: true,
      lateHours: 0,
    }
  },
  {
    id: 'test-3',
    name: 'Test 3: Late After Grace',
    description: 'User checks in after grace period',
    checkinTime: '10:15',
    expectedCheckinTime: '09:30',
    gracePeriod: '00:30:00',
    workingHours: 8,
    expectedResults: {
      late: true,
      onTime: false,
      lateHours: 0.25, // 15 minutes = 0.25 hours
    }
  },
  {
    id: 'test-9',
    name: 'Test 9: Normal Full Day',
    description: 'Check-in on time, check-out after 8 hours',
    checkinTime: '09:30',
    checkoutTime: '17:30',
    expectedCheckinTime: '09:30',
    gracePeriod: '00:30:00',
    workingHours: 8,
    expectedResults: {
      late: false,
      onTime: true,
      workingDays: true,
      overtime: 0,
    }
  },
  {
    id: 'test-10',
    name: 'Test 10: Overtime',
    description: 'Check-in on time, work 10 hours',
    checkinTime: '09:00',
    checkoutTime: '19:00',
    expectedCheckinTime: '09:30',
    gracePeriod: '00:30:00',
    workingHours: 8,
    expectedResults: {
      late: false,
      onTime: true,
      workingDays: true,
      overtime: 2,
    }
  },
  {
    id: 'test-11',
    name: 'Test 11: Checkout Without Checkin',
    description: 'Try to checkout without checking in',
    checkinTime: 'NA',
    checkoutTime: '18:00',
    expectedCheckinTime: '09:30',
    gracePeriod: '00:30:00',
    workingHours: 8,
    expectedResults: {
      workingDays: false,
      onTime: false,
    }
  },
  {
    id: 'test-18',
    name: 'Test 18: Late Checkin + Ontime Checkout',
    description: 'Check-in late, but checkout on time',
    checkinTime: '10:30',
    checkoutTime: '18:00',
    expectedCheckinTime: '09:30',
    gracePeriod: '00:30:00',
    workingHours: 8,
    expectedResults: {
      late: true,
      onTime: false,
      workingDays: true,
      overtime: 0,
    }
  },
];

interface KPITestPanelProps {
  onRunTest: (testData: {
    checkinTime: Date;
    checkoutTime?: Date;
    testDate: string;
    scenario: string;
  }) => void;
  onStopTest: () => void;
  onClose: () => void;
}

export const KPITestPanel: React.FC<KPITestPanelProps> = ({ onRunTest, onStopTest, onClose }) => {
  const [selectedScenario, setSelectedScenario] = useState<TestScenario | null>(null);
  const [testDate, setTestDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [customCheckin, setCustomCheckin] = useState('09:30');
  const [customCheckout, setCustomCheckout] = useState('17:30');
  const [testResults, setTestResults] = useState<any>(null);

  const applyScenario = (scenario: TestScenario) => {
    setSelectedScenario(scenario);
    setCustomCheckin(scenario.checkinTime !== 'NA' ? scenario.checkinTime : '');
    setCustomCheckout(scenario.checkoutTime || '17:30');
  };

  const runCheckinTest = () => {
    if (!selectedScenario) {
      alert('Please select a test scenario first');
      return;
    }

    if (selectedScenario.checkinTime === 'NA') {
      alert('This scenario has no check-in. Use "Run Checkout Test" instead.');
      return;
    }

    // Parse test time
    const checkinDateTime = new Date(`${testDate}T${customCheckin}:00`);

    // Generate test data
    const testData = {
      scenario: selectedScenario.name,
      testDate: testDate,
      checkinTime: customCheckin || 'NA',
      checkoutTime: customCheckout || 'NA',
      expectedResults: selectedScenario.expectedResults,
      instructions: generateTestInstructions(selectedScenario),
    };

    setTestResults(testData);

    // Log to console for debugging
    console.log('='.repeat(80));
    console.log('🧪 KPI TEST SCENARIO ACTIVATED - CHECK-IN');
    console.log('='.repeat(80));
    console.log('Test:', selectedScenario.name);
    console.log('Description:', selectedScenario.description);
    console.log('Test Date:', testDate);
    console.log('Check-in Time:', checkinDateTime);
    console.log('Expected Check-in:', selectedScenario.expectedCheckinTime);
    console.log('Grace Period:', selectedScenario.gracePeriod);
    console.log('Expected Results:', selectedScenario.expectedResults);
    console.log('='.repeat(80));

    // Call the test function
    onRunTest({
      checkinTime: checkinDateTime,
      testDate: testDate,
      scenario: selectedScenario.name,
    });

    alert('✅ Test activated! Now click the CHECK-IN button to run the test.');
  };

  const runCheckoutTest = () => {
    if (!selectedScenario) {
      alert('Please select a test scenario first');
      return;
    }

    if (!selectedScenario.checkoutTime) {
      alert('This scenario has no check-out. Use "Run Checkin Test" instead.');
      return;
    }

    // Parse test times
    const checkinDateTime = new Date(`${testDate}T${customCheckin}:00`);
    const checkoutDateTime = new Date(`${testDate}T${customCheckout}:00`);

    console.log('='.repeat(80));
    console.log('🧪 KPI TEST SCENARIO ACTIVATED - CHECK-OUT');
    console.log('='.repeat(80));
    console.log('Test:', selectedScenario.name);
    console.log('Checkout Time:', checkoutDateTime);
    console.log('='.repeat(80));

    // Call the test function
    onRunTest({
      checkinTime: checkinDateTime,
      checkoutTime: checkoutDateTime,
      testDate: testDate,
      scenario: selectedScenario.name,
    });

    alert('✅ Test activated! Now click the CHECK-OUT button to run the test.');
  };

  const stopTest = () => {
    onStopTest();
    setTestResults(null);
    console.log('🛑 Test mode deactivated');
    alert('Test mode stopped. Back to normal mode.');
  };

  const generateTestInstructions = (scenario: TestScenario): string => {
    let instructions = '';

    if (scenario.checkinTime !== 'NA') {
      instructions += `1. Set system time to ${testDate} ${scenario.checkinTime}\n`;
      instructions += `2. Click CHECK-IN button\n`;
      instructions += `3. Open browser console (F12) and check logs\n`;
    }

    if (scenario.checkoutTime) {
      instructions += `4. Set system time to ${testDate} ${scenario.checkoutTime}\n`;
      instructions += `5. Click CHECK-OUT button\n`;
      instructions += `6. Check console logs for KPI calculations\n`;
    }

    instructions += `\n✅ Expected Results:\n`;
    Object.entries(scenario.expectedResults).forEach(([key, value]) => {
      instructions += `   - ${key}: ${JSON.stringify(value)}\n`;
    });

    return instructions;
  };

  const copyTestCode = () => {
    if (!selectedScenario) return;

    const code = `
// TEST SCENARIO: ${selectedScenario.name}
// Date: ${testDate}

// Step 1: Modify handleCheckIn to use test time (TEMPORARY - for testing only)
const todayCheckin = new Date('${testDate}T${customCheckin}:00');

// Step 2: Modify handleCheckOut to use test time
const checkOutTime = new Date('${testDate}T${customCheckout}:00');

// Expected Results:
${JSON.stringify(selectedScenario.expectedResults, null, 2)}
`;

    navigator.clipboard.writeText(code);
    alert('Test code copied to clipboard!');
  };

  const generateSQLQuery = () => {
    return `
-- Check KPI scores for test date: ${testDate}
SELECT
    e.firstName,
    e.lastName,
    kf.name as factor_name,
    kf.type as factor_type,
    kf.weightage,
    ks.value,
    ks.score,
    ks.scoredAt
FROM kpi_score ks
JOIN kpi_factor kf ON ks.factor_id = kf.id
JOIN employees e ON ks.employee_id = e.id
WHERE DATE(ks.scoredAt) = '${testDate}'
AND e.id = 'YOUR_EMPLOYEE_ID'
ORDER BY ks.scoredAt DESC, kf.name;
`;
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: '80px', // Moved up to not block buttons
      right: '20px',
      width: '550px',
      maxHeight: '70vh',
      overflow: 'auto',
      backgroundColor: '#1e1e2e',
      color: '#cdd6f4',
      border: '2px solid #89b4fa',
      borderRadius: '8px',
      padding: '20px',
      zIndex: 9999,
      fontFamily: 'monospace',
      fontSize: '12px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '15px'
      }}>
        <h3 style={{ margin: 0, color: '#89b4fa' }}>
          🧪 KPI Testing Panel
        </h3>
        <button
          onClick={onClose}
          style={{
            backgroundColor: '#f38ba8',
            color: '#1e1e2e',
            border: 'none',
            borderRadius: '4px',
            padding: '5px 10px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '14px',
          }}
          title="Close Test Panel"
        >
          ✕
        </button>
      </div>

      {/* Test Scenario Selection */}
      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
          Select Test Scenario:
        </label>
        <select
          style={{
            width: '100%',
            padding: '8px',
            backgroundColor: '#313244',
            color: '#cdd6f4',
            border: '1px solid #45475a',
            borderRadius: '4px',
          }}
          onChange={(e) => {
            const scenario = TEST_SCENARIOS.find(s => s.id === e.target.value);
            if (scenario) applyScenario(scenario);
          }}
        >
          <option value="">-- Select a test --</option>
          {TEST_SCENARIOS.map(scenario => (
            <option key={scenario.id} value={scenario.id}>
              {scenario.name}
            </option>
          ))}
        </select>
      </div>

      {selectedScenario && (
        <>
          {/* Scenario Description */}
          <div style={{
            backgroundColor: '#313244',
            padding: '10px',
            borderRadius: '4px',
            marginBottom: '15px',
          }}>
            <strong>📝 Description:</strong>
            <p style={{ margin: '5px 0' }}>{selectedScenario.description}</p>
          </div>

          {/* Test Date */}
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>
              Test Date:
            </label>
            <input
              type="date"
              value={testDate}
              onChange={(e) => setTestDate(e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                backgroundColor: '#313244',
                color: '#cdd6f4',
                border: '1px solid #45475a',
                borderRadius: '4px',
              }}
            />
          </div>

          {/* Check-in Time */}
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>
              Check-in Time:
            </label>
            <input
              type="time"
              value={customCheckin}
              onChange={(e) => setCustomCheckin(e.target.value)}
              disabled={selectedScenario.checkinTime === 'NA'}
              style={{
                width: '100%',
                padding: '8px',
                backgroundColor: selectedScenario.checkinTime === 'NA' ? '#45475a' : '#313244',
                color: '#cdd6f4',
                border: '1px solid #45475a',
                borderRadius: '4px',
              }}
            />
            {selectedScenario.checkinTime === 'NA' && (
              <small style={{ color: '#f38ba8' }}>No check-in for this test</small>
            )}
          </div>

          {/* Check-out Time */}
          {selectedScenario.checkoutTime && (
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>
                Check-out Time:
              </label>
              <input
                type="time"
                value={customCheckout}
                onChange={(e) => setCustomCheckout(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  backgroundColor: '#313244',
                  color: '#cdd6f4',
                  border: '1px solid #45475a',
                  borderRadius: '4px',
                }}
              />
            </div>
          )}

          {/* Expected Results */}
          <div style={{
            backgroundColor: '#313244',
            padding: '10px',
            borderRadius: '4px',
            marginBottom: '15px',
          }}>
            <strong>✅ Expected Results:</strong>
            <pre style={{
              margin: '10px 0 0 0',
              fontSize: '11px',
              color: '#a6e3a1',
            }}>
              {JSON.stringify(selectedScenario.expectedResults, null, 2)}
            </pre>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '15px' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={runCheckinTest}
                disabled={selectedScenario?.checkinTime === 'NA'}
                style={{
                  flex: 1,
                  padding: '10px',
                  backgroundColor: selectedScenario?.checkinTime === 'NA' ? '#45475a' : '#a6e3a1',
                  color: '#1e1e2e',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: selectedScenario?.checkinTime === 'NA' ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                }}
              >
                ▶️ Run Check-In Test
              </button>
              <button
                onClick={runCheckoutTest}
                disabled={!selectedScenario?.checkoutTime}
                style={{
                  flex: 1,
                  padding: '10px',
                  backgroundColor: !selectedScenario?.checkoutTime ? '#45475a' : '#89b4fa',
                  color: '#1e1e2e',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: !selectedScenario?.checkoutTime ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                }}
              >
                ▶️ Run Check-Out Test
              </button>
            </div>
            <button
              onClick={stopTest}
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: '#f38ba8',
                color: '#1e1e2e',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              🛑 Stop Test Mode
            </button>
          </div>

          {/* SQL Query */}
          <div style={{ marginBottom: '15px' }}>
            <button
              onClick={() => {
                navigator.clipboard.writeText(generateSQLQuery());
                alert('SQL query copied to clipboard!');
              }}
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: '#a6e3a1',
                color: '#1e1e2e',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              🗄️ Copy Verification SQL
            </button>
          </div>

          {/* Test Instructions */}
          {testResults && (
            <div style={{
              backgroundColor: '#313244',
              padding: '15px',
              borderRadius: '4px',
              maxHeight: '200px',
              overflow: 'auto',
            }}>
              <strong>📋 Test Instructions:</strong>
              <pre style={{
                margin: '10px 0 0 0',
                fontSize: '11px',
                whiteSpace: 'pre-wrap',
                color: '#cdd6f4',
              }}>
                {testResults.instructions}
              </pre>
            </div>
          )}
        </>
      )}

      <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #45475a' }}>
        <small style={{ color: '#6c7086' }}>
          💡 Tip: Open browser console (F12) to see detailed KPI calculation logs
        </small>
      </div>
    </div>
  );
};
