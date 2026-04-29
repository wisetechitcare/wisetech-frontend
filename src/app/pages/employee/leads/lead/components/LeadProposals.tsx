const LeadProposals = ({ leadId }: { leadId: string }) => (
    <div className="card card-custom">
        <div className="card-header">
            <div className="card-title">
                <h3 className="card-label">Notes</h3>
            </div>
        </div>
        <div className="card-body">
            <p className="text-muted">Notes will be displayed here</p>
        </div>
    </div>
);
export default LeadProposals;