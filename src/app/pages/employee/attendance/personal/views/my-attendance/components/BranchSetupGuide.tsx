import React from 'react';
import { Container } from 'react-bootstrap';

const BranchSetupGuide = () => {
    return (
        <Container className="my-4 w-100 px-0 d-flex justify-content-center align-items-center" style={{ minHeight: '300px' }}>
            <div className="text-center" role="alert">
                <h4 className="alert-heading">Branch Setup Required</h4>
                <p className="mb-2">To view attendance and statistics, please complete branch and working days setup.</p>

                <hr className="my-3" />

                <div className="text-start px-3" style={{ maxWidth: '600px', margin: '0 auto' }}>
                    <p className="fw-semibold text-decoration-underline">Steps to Create Branch:</p>
                    <ol className="mb-3">
                        <li>Go to <strong>Company</strong> → <strong>Branches</strong></li>
                        <li>Click on <strong>“New Branch”</strong></li>
                        <li>Fill out details and click <strong>“Submit”</strong></li>
                    </ol>

                    <p className="fw-semibold text-decoration-underline">Steps to Set Working/Off Days:</p>
                    <ol>
                        <li>Go to <strong>Calendar</strong> → <strong>Holidays</strong></li>
                        <li>Scroll to the <strong>Weekends Table</strong> section</li>
                        <li>Click on <strong>Edit (Pencil Icon)</strong> next to your branch</li>
                        <li>Choose your weekend days, such as <strong>Saturday</strong> and <strong>Sunday</strong>, or any others you like.</li>
                        <li>Click <strong>Submit</strong> to save</li>
                    </ol>
                </div>

                <hr />
                <small className="text-muted">Once configured, this section will automatically display attendance and statistics.</small>
            </div>
        </Container>
    );
};

export default BranchSetupGuide;
