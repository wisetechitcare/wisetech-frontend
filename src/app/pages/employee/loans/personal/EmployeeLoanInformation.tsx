import { Row, Col } from "react-bootstrap";
import Rules from "./views/Rules";
import Faqs from "./views/Faqs";

const EmployeeLoanInformation = () => {
    const fromAdmin = false;
    return (
        <div>
            <Row>
                <Col md={7} className="mb-3">
                    <Rules fromAdmin={fromAdmin} />
                </Col>

                <Col md={5} className="mb-3">
                    <Faqs fromAdmin={fromAdmin} />
                </Col>
            </Row>
        </div>
    );
}

export default EmployeeLoanInformation;
