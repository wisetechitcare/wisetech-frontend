export const DUMMY_CHART_DATA = {
  summaryStats: [
    { title: "Total Inbound Leads", value: "1,240", growth: "+12.5%", isPositive: true },
    { title: "Qualified Leads", value: "842", growth: "+5.2%", isPositive: true },
    { title: "Customer Wins", value: "189", growth: "-2.1%", isPositive: false },
    { title: "Revenue Pipeline", value: "$4.2M", growth: "+1.8%", isPositive: true },
    { title: "Lead Velocity", value: "4.2d", growth: "-12%", isPositive: true },
    { title: "Engagement Rate", value: "68%", growth: "+4%", isPositive: true },
    { title: "Acquisition Cost", value: "$120/L", growth: "+2%", isPositive: false },
    { title: "Referral Growth", value: "15%", growth: "+8%", isPositive: true },
  ],
  inquiryVsReceivedData: [
    { name: "Mon", inquiry: 400, received: 240, target: 450, avg: 320 },
    { name: "Tue", inquiry: 300, received: 139, target: 450, avg: 220 },
    { name: "Wed", inquiry: 200, received: 980, target: 450, avg: 590 },
    { name: "Thu", inquiry: 278, received: 390, target: 450, avg: 334 },
    { name: "Fri", inquiry: 189, received: 480, target: 450, avg: 334 },
  ],
  kpiGauges: [
    { name: 'Response speed', value: 92, fill: '#10b981' },
    { name: 'Lead matching', value: 78, fill: '#6366f1' },
    { name: 'Engagement Hub', value: 85, fill: '#f59e0b' },
    { name: 'Win Probability', value: 65, fill: '#ec4899' },
  ],
  locationPoints: [
    { lat: 19.0760, lng: 72.8777, name: "Mumbai", count: 120 },
    { lat: 40.7128, lng: -74.0060, name: "NY", count: 85 },
    { lat: 51.5074, lng: -0.1278, name: "London", count: 70 },
  ],
  statusMixTrends: [
    { name: 'W1', New: 40, Qual: 20, Pros: 10, Won: 6 },
    { name: 'W2', New: 35, Qual: 22, Pros: 12, Won: 8 },
    { name: 'W3', New: 30, Qual: 25, Pros: 15, Won: 10 },
  ],
  sentimentData: [
    { name: 'Hot', value: 45, fill: '#10b981' }, { name: 'Warm', value: 30, fill: '#6366f1' }, { name: 'Cold', value: 25, fill: '#ef4444' }
  ],
  bubbleMatrix: [
    { x: 100, y: 200, z: 200, name: 'PPC' }, { x: 120, y: 100, z: 260, name: 'SEO' }, { x: 170, y: 300, z: 400, name: 'Ref' }
  ],
  statusData: [
    { label: "New", value: 400, fill: "#6366f1" }, { label: "Screening", value: 300, fill: "#8b5cf6" }, { label: "Won", value: 189, fill: "#10b981" }
  ],
  cancellationReasons: [
    { name: "Price", value: 120, fill: "#ef4444" }, { name: "Time", value: 85, fill: "#f59e0b" }, { name: "Comp", value: 70, fill: "#3b82f6" }
  ],
  leadQualityRadar: [
    { subject: 'Int', A: 120, B: 110 }, { subject: 'Bud', A: 98, B: 130 }, { subject: 'Time', A: 86, B: 130 }
  ],
  serviceData: [
    { name: "Ent", value: 450, fill: "#6366f1" }, { name: "Gov", value: 300, fill: "#8b5cf6" }, { name: "SMB", value: 200, fill: "#ec4899" }
  ],
  categoryData: [
    { name: 'SaaS', size: 130 }, { name: 'AI/ML', size: 200 }, { name: 'Fin', size: 100 }
  ],
  histogramData: [
    { range: '0-2h', count: 450 }, { range: '2-6h', count: 320 }, { range: '6d+', count: 150 }
  ],
  individualSourceTrends: [
    { name: "W1", Direct: 100, Ext: 60, Int: 30 }, { name: "W2", Direct: 120, Ext: 80, Int: 45 }
  ],
  countryLeads: [
    { name: "IND", leads: 450, won: 120 }, { name: "USA", leads: 380, won: 100 }
  ],
  sourceComparison: [
    { name: "Jan", Direct: 120, Ext: 80, Int: 40 }, { name: "Feb", Direct: 100, Ext: 90, Int: 50 }
  ],
  leadResponseHeat: [
    { day: "M", heat: 40 }, { day: "T", heat: 60 }, { day: "W", heat: 45 }, { day: "T", heat: 70 }
  ],
  funnelPath: [
    { step: 'Aware', count: 1200 }, { step: 'Consid', count: 800 }, { step: 'Decis', count: 400 }, { step: 'Loyal', count: 200 }
  ],
  performanceRank: [
    { name: 'PPC', score: 95 }, { name: 'SEO', score: 88 }, { name: 'Ref', score: 82 }
  ],
  leadAging: [
    { range: '0-1d', count: 400 }, { range: '2-3d', count: 250 }, { range: '8d+', count: 110 }
  ],
  leadConversionBySource: [
    { name: 'Direct', value: 18, fill: '#6366f1' }, { name: 'Ads', value: 12, fill: '#10b981' }
  ],
  avgLeadValue: [
    { name: 'W1', value: 4500 }, { name: 'W2', value: 5200 }, { name: 'W3', value: 4800 }
  ],
  engagementDepth: [
    { name: 'Emails', value: 40 }, { name: 'Calls', value: 30 }, { name: 'Demos', value: 20 }
  ],
  revenueForecast: [
    { month: 'Apr', value: 1.2 }, { month: 'May', value: 1.5 }, { month: 'Jun', value: 1.8 }
  ],
  leadOwnership: [
    { name: 'Team A', value: 45 }, { name: 'Team B', value: 30 }, { name: 'Team C', value: 25 }
  ],
  leadQualityOverTime: [
    { week: 'W1', qual: 72 }, { week: 'W2', qual: 78 }, { week: 'W3', qual: 75 }
  ],
  acquisitionCost: [
    { month: 'Jan', cost: 120 }, { month: 'Feb', cost: 115 }, { month: 'Mar', cost: 130 }
  ],
  referralGrowth: [
    { week: 'W1', growth: 5 }, { week: 'W2', growth: 8 }, { week: 'W3', growth: 12 }
  ],
  winProbabilityClusters: [
    { x: 10, y: 20, z: 30, name: 'SME' }, { x: 40, y: 50, z: 60, name: 'Enterprise' }
  ],
  contactabilityRate: [
    { name: 'Contacted', value: 75, fill: '#10b981' }, { name: 'No Ans', value: 25, fill: '#ef4444' }
  ],
  industryGrowth: [
    { name: 'Tech', value: 25 }, { name: 'Fin', value: 18 }, { name: 'Health', value: 12 }
  ],
  nurturingStages: [
    { name: 'Email 1', value: 900 }, { name: 'Email 2', value: 600 }, { name: 'Call 1', value: 300 }
  ],
  retentionVsChurn: [
    { name: 'Retained', value: 85, fill: '#6366f1' }, { name: 'Churn', value: 15, fill: '#f43f5e' }
  ],
  followUpIntensity: [
    { day: 'Mon', value: 45 }, { day: 'Tue', value: 55 }, { day: 'Wed', value: 65 }
  ],
  scoringAccuracy: [
    { week: 'W1', value: 82 }, { week: 'W2', value: 85 }, { week: 'W3', value: 88 }
  ],
  sourceAttributionDrift: [
    { month: 'Jan', Direct: 40, Ads: 30, SEO: 30 }, { month: 'Feb', Direct: 35, Ads: 35, SEO: 30 }
  ],
  leadOutcomeProportion: [
    { name: 'Won', value: 40 }, { name: 'Lost', value: 35 }, { name: 'Ongoing', value: 25 }
  ],
  discoveryEngagement: [
    { name: 'V1', value: 200 }, { name: 'V2', value: 350 }, { name: 'V3', value: 500 }
  ],
  leadVelocityBySource: [
    { name: 'Direct', value: 3.2 }, { name: 'External', value: 5.4 }, { name: 'Internal', value: 2.1 }
  ],
  quotaPulse: [
    { name: 'Achieved', value: 75, fill: '#10b981' }, { name: 'Remaining', value: 25, fill: '#f1f5f9' }
  ]
};
