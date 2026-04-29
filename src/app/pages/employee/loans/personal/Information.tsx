import { Row, Col } from "react-bootstrap";
import Rules from "./views/Rules";
import Faqs from "./views/Faqs";
import { hasPermission } from "@utils/authAbac";
import { permissionConstToUseWithHasPermission, resourceNameMapWithCamelCase } from "@constants/statistics";

const Information = () => {
    const fromAdmin = true;
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

export default Information;
