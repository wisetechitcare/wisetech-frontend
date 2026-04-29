import { Row, Col } from "react-bootstrap";
import Rules from "./views/information/Rules";
import Faqs from "./views/information/Faqs";
import { LEAVE_ATTENDANCE_KEY } from "@constants/configurations-key";

const Information = () => {
    return (
        <div>
            <Row>
                <Col md={7} className="mb-3">
                    <Rules />
                </Col>

                <Col md={5} className="mb-3">
                <Faqs typeKey={LEAVE_ATTENDANCE_KEY} />
                </Col>
            </Row>
        </div>
    );
}

export default Information;
