import { Col, Row } from 'react-bootstrap';
import { SkeletonBlock, SkeletonKpiCard, SkeletonTable, SkeletonForm } from '@app/modules/common/components/Skeleton';

export const SalaryReportPageSkeleton = () => (
    <div className="my-4 px-0 w-100">
        {/* Summary KPI cards */}
        <Row className="g-4 mb-5">
            {Array.from({ length: 6 }).map((_, i) => (
                <Col key={i} xs={12} sm={6} lg={4} xl={2}>
                    <SkeletonKpiCard />
                </Col>
            ))}
        </Row>

        {/* Payroll table */}
        <SkeletonTable rows={4} cols={9} showTitle showHeader style={{ marginBottom: 32 }} />

        {/* Gross Pay / Deductions side by side */}
        <Row className="g-4">
            {[
                { border: 'rgba(41,93,142,0.18)', bg: 'linear-gradient(135deg, #F0F7FF 0%, #E6F0FB 100%)' },
                { border: 'rgba(30, 58, 138,0.18)', bg: 'linear-gradient(135deg, #FBF0F1 0%, #F5E2E4 100%)' },
            ].map((style, i) => (
                <Col key={i} md={6}>
                    <div style={{ background: style.bg, border: `1px solid ${style.border}`, borderRadius: 14, padding: '16px 20px', minHeight: 200 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <SkeletonBlock width={140} height={18} />
                            <SkeletonBlock width={80} height={18} />
                        </div>
                        <BreakdownCardSkeleton rows={5} />
                    </div>
                </Col>
            ))}
        </Row>
    </div>
);

export const BreakdownCardSkeleton = ({ rows = 5 }: { rows?: number }) => (
    <div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 8, marginBottom: 8, paddingBottom: 6, borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
            {[0, 1, 2].map((i) => <SkeletonBlock key={i} height={11} width="60%" />)}
        </div>
        {Array.from({ length: rows }).map((_, r) => (
            <div key={r} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 8, marginBottom: 10 }}>
                <SkeletonBlock height={13} width="75%" />
                <SkeletonBlock height={13} width="55%" />
                <SkeletonBlock height={13} width="65%" />
            </div>
        ))}
    </div>
);

export const GrossDistributionModalSkeleton = () => (
    <SkeletonForm fields={5} cols={2} showTitle showAction />
);
