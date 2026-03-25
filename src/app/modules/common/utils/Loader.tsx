import { Container } from "react-bootstrap";

const Loader = () => {
    return (
        <Container
            fluid
            className="my-4 w-100 px-0 d-flex justify-content-center align-items-center"
            style={{ minHeight: "600px" }}
        >
            <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
            </div>
        </Container>
    );
};

export default Loader;
