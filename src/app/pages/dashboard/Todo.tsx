import { useState, useEffect, memo } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@redux/store";
import { getTodo, createTodo, updateTodo, deleteTodo } from "@services/employee";
import { Card, Button, Modal, Form, ListGroup, Spinner, Dropdown, Container } from "react-bootstrap";
import { deleteConfirmation, errorConfirmation, successConfirmation } from "@utils/modal";
import Swal from "sweetalert2";
import { KTIcon } from "@metronic/helpers";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";
import * as Yup from "yup";
import { Formik, Field, ErrorMessage } from "formik";

const validationSchema = Yup.object().shape({
  description: Yup.string().required("Description is required"),
});

const TodoList = memo(() => {
  const employeeId = useSelector((state: RootState) => state.employee.currentEmployee?.id);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [todoDescription, setTodoDescription] = useState("");
  const [selectedTab, setSelectedTab] = useState<"PENDING" | "COMPLETED" | "WONT_DO">("PENDING");
  const [editTodo, setEditTodo] = useState<{ id: string; description: string; status: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const todosPerPage = 6;

  interface Todo {
    id: string;
    description: string;
    status: "PENDING" | "COMPLETED" | "WONT_DO";
    createdAt: string;
  }

  const [todos, setTodos] = useState<Todo[]>([]);

  const handleShow = () => setShowModal(true);
  const handleClose = () => setShowModal(false);

  const handleSave = async () => {
    if (!todoDescription.trim()) return;
    try {
      await createTodo({ employeeId, description: todoDescription });
      setTodoDescription("");
      handleClose();
      fetchTodos();
      successConfirmation("Todo created successfully");
    } catch (error) {
      console.error("Error creating todo:", error);
      errorConfirmation("Failed to create the todo. Please try again.");
    }
  };

  const handleEditShow = (todo: Todo) => {
    setEditTodo(todo);
    setShowEditModal(true);
  };

  const handleEditClose = () => {
    setShowEditModal(false);
    setEditTodo(null);
  };

  const handleUpdateTodo = async () => {
    if (!editTodo || !employeeId) return;
    const existingTodo = todos.find((todo) => todo.id === editTodo.id);
    if (!existingTodo) return;
    if (editTodo.description === existingTodo.description && editTodo.status === existingTodo.status) {
      Swal.fire("No changes detected!", "You didn't modify anything.", "info");
      return;
    }
    try {
      // check description should not max than 200 (show error) count ans show total
      if (editTodo.description.length > 200) {
        Swal.fire("Description should not exceed 200 characters.", "Total characters: " + editTodo.description.length, "warning");
        return;
      }
      await updateTodo(employeeId, editTodo.id, {
        description: editTodo.description,
        status: editTodo.status,
      });
      handleEditClose();
      fetchTodos();
      successConfirmation("successfully updated!");
    } catch (error) {
      console.error("Error updating todo:", error);
      errorConfirmation("Failed to update the todo. Please try again.");
    }
  };

  const handleDeleteTodo = async (todoId: string) => {
    if (!employeeId) return;
    try {
      const confirmed = await deleteConfirmation("Todo deleted successfully!");
      if (!confirmed) return;
      await deleteTodo(employeeId, todoId);
      fetchTodos();
    } catch (error) {
      console.error("Error deleting todo:", error);
      errorConfirmation("Failed to delete the todo. Please try again.");
    }
  };

  const fetchTodos = async () => {
    if (!employeeId) return;
    setLoading(true);
    try {
      const response = await getTodo(employeeId);
      if (response?.data?.statusCode === 200 && Array.isArray(response.data.data)) {
        setTodos(response.data.data);
      } else {
        console.warn("Unexpected API response:", response);
        setTodos([]);
      }
    } catch (error) {
      console.error("Error fetching todos:", error);
      setTodos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodos();
  }, [employeeId]);

  const filteredTodos = todos.filter((todo) => todo.status === selectedTab);
  const totalPages =
    filteredTodos.length > 0
      ? Math.ceil(filteredTodos.length / todosPerPage)
      : 1;
  const paginatedTodos = filteredTodos.slice(
    currentPage * todosPerPage,
    (currentPage + 1) * todosPerPage
  );

  const handleToggleStatus = async (todoId: string) => {
    if (!employeeId) return;
    try {
      const existingTodo = todos.find((todo) => todo.id === todoId);
      if (!existingTodo) return;
      const newStatus =
        existingTodo.status === "PENDING" ? "COMPLETED" : "PENDING";
      setTodos((prevTodos) =>
        prevTodos.map((todo) =>
          todo.id === todoId ? { ...todo, status: newStatus } : todo
        )
      );
      setTimeout(async () => {
        await updateTodo(employeeId, todoId, { status: newStatus });
        fetchTodos();
      }, 300);
    } catch (error) {
      console.error("Error updating todo status:", error);
      errorConfirmation("Failed to update status. Please try again.");
    }
  };

  return (
    <>
      <Card
        // className="p-3"
        style={{
          borderRadius: "12px",
          height: "555px",
          width: "100%",
          overflow: "hidden",
        }}
      >
        <Card.Body>
          <Card.Title className="d-flex justify-content-between align-items-center fs-3">
            My To-Do’s
            <Button
              // size="lg"
              onClick={handleShow}
              style={{
                backgroundColor: "#a94442",
                borderColor: "#a94442",
                color: "white",
              }}
            >
              New To-Do
            </Button>
          </Card.Title>

          <div className="d-flex flex-wrap gap-2 mb-3 mt-lg-12 mt-6">
            <button
              onClick={() => setSelectedTab("PENDING")}
              style={{
                backgroundColor:
                  selectedTab === "PENDING" ? "#a94442" : "transparent",
                color: selectedTab === "PENDING" ? "white" : "black",
                border: "1px solid #a94442",
                borderRadius: "20px",
                // padding: "5px 15px",
              }}
              className="px-3 py-1 px-lg-6 py-lg-2"
            >
              Pending
            </button>

            <button
              onClick={() => setSelectedTab("COMPLETED")}
              style={{
                backgroundColor:
                  selectedTab === "COMPLETED" ? "green" : "transparent",
                color: selectedTab === "COMPLETED" ? "white" : "black",
                border: "1px solid grey",
                borderRadius: "20px",
                // padding: "5px 15px",
              }}
              className="px-3 py-1 px-lg-6 py-lg-2"
            >
              Completed
            </button>

            <button
              onClick={() => setSelectedTab("WONT_DO")}
              style={{
                backgroundColor:
                  selectedTab === "WONT_DO" ? "#a94442" : "transparent",
                color: selectedTab === "WONT_DO" ? "white" : "#000",
                border: "1px solid grey",
                borderRadius: "20px",
                // padding: "5px 15px",
              }}
              className="px-3 py-1 px-lg-6 py-lg-2"
            >
              Won't Do
            </button>
          </div>

          { loading ?
                <Container fluid className="my-4 w-100 px-0 d-flex justify-content-center align-items-center" style={{ minHeight: '300px' }}>
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </div>
                  </Container>
             : filteredTodos.length > 0 ? (
            <ListGroup variant="flush">
              {paginatedTodos.map((todo) => (
                <ListGroup.Item
                  key={todo.id}
                  className="d-flex justify-content-between align-items-center border-0"
                >
                  <OverlayTrigger
                    placement="top"
                    overlay={
                      <Tooltip id={`tooltip-${todo.id}`}>
                        {todo.description}
                      </Tooltip>
                    }
                  >
                    <div
                      style={{
                        maxWidth: "500px",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        cursor: "pointer",
                      }}
                    >
                      {selectedTab === "PENDING" && (
                        <input
                          type="checkbox"
                          className="form-check-input mt-2"
                          checked={todo.status === "COMPLETED"}
                          onChange={() => handleToggleStatus(todo.id)}
                          style={{
                            width: "24px",
                            height: "24px",
                            verticalAlign: "middle",
                            cursor: "pointer",
                            backgroundColor: "#E6EBF3",
                            border: "none",
                          }}
                        />
                      )}
                      {selectedTab === "COMPLETED" && (
                        <div
                          className="form-check-input mt-2"
                          style={{
                            width: "24px",
                            height: "24px",
                            borderRadius: "6px",
                            backgroundColor: "#E8F5E9",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "not-allowed",
                            position: "relative",
                            border: "none",
                          }}
                        >
                          <span
                            style={{
                              color: "#4CAF50",
                              fontSize: "18px",
                              fontWeight: "bold",
                            }}
                          >
                            ✔
                          </span>
                        </div>
                      )}
                      {selectedTab === "WONT_DO" && (
                        <div
                          className="form-check-input mt-2"
                          style={{
                            width: "24px",
                            height: "24px",
                            borderRadius: "6px",
                            backgroundColor: "#FFEBEE",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "not-allowed",
                            position: "relative",
                            border: "none",
                          }}
                        >
                          <span
                            style={{
                              color: "#FF5252",
                              fontSize: "18px",
                              fontWeight: "bold",
                            }}
                          >
                            ✖
                          </span>
                        </div>
                      )}
                      <span
                        className="ms-3 mb-1"
                        style={{ fontSize: "14px", fontWeight: "400" }}
                      >
                        {todo.status === "COMPLETED"
                          ? ""
                          : todo.status === "WONT_DO"
                          ? ""
                          : ""}{" "}
                        {todo.description}
                      </span>

                      <div
                        className="text-muted ms-12"
                        style={{ fontSize: "12px" }}
                      >
                        {(() => {
                          const createdAtDate = new Date(todo.createdAt);
                          const today = new Date();
                          const yesterday = new Date();
                          yesterday.setDate(today.getDate() - 1);

                          const createdAtStr = createdAtDate
                            .toISOString()
                            .split("T")[0];
                          const todayStr = today.toISOString().split("T")[0];
                          const yesterdayStr = yesterday
                            .toISOString()
                            .split("T")[0];

                          let displayDate;
                          if (createdAtStr === todayStr) {
                            displayDate = `Today, ${createdAtDate.toLocaleDateString(
                              "en-GB",
                              {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                              }
                            )}`;
                          } else if (createdAtStr === yesterdayStr) {
                            displayDate = `Yesterday, ${createdAtDate.toLocaleDateString(
                              "en-GB",
                              {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                              }
                            )}`;
                          } else {
                            displayDate = createdAtDate.toLocaleDateString(
                              "en-GB",
                              {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                              }
                            );
                          }

                          return `${displayDate} ${createdAtDate.toLocaleTimeString(
                            "en-GB",
                            { hour: "2-digit", minute: "2-digit", hour12: true }
                          )}`;
                        })()}
                      </div>
                    </div>
                  </OverlayTrigger>
                  <div className="d-flex align-items-center gap-2">
                    <Button
                      variant="text"
                      size="sm"
                      onClick={() => handleEditShow(todo)}
                    >
                      <KTIcon iconName="pencil" className="fs-2" />
                    </Button>
                    <Button
                      variant="text"
                      size="sm"
                      onClick={() => handleDeleteTodo(todo.id)}
                    >
                      <KTIcon iconName="trash" className="fs-2 text-danger" />
                    </Button>
                  </div>
                </ListGroup.Item>
              ))}
            </ListGroup>
          ) : (
            <p className="text-muted text-center m-2">No tasks available.</p>
          )}

          {filteredTodos.length > todosPerPage && (
            <div className="d-flex justify-content-end mt-3 gap-3">
              <div
                className={`fs-2 cursor-pointer ${
                  currentPage === 0 ? "text-muted" : ""
                }`}
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 0))}
                style={{
                  color: currentPage === 0 ? "gray" : "#000",
                  cursor: currentPage === 0 ? "not-allowed" : "pointer",
                }}
              >
                <KTIcon iconName="arrow-left" className="fs-2" />
              </div>
              <span className="fs-5">
                {currentPage + 1} / {totalPages}
              </span>
              <div
                className={`fs-2 cursor-pointer ${
                  currentPage >= totalPages - 1 ? "text-muted" : ""
                }`}
                onClick={() =>
                  setCurrentPage((prev) =>
                    prev < totalPages - 1 ? prev + 1 : prev
                  )
                }
                style={{
                  color: currentPage >= totalPages - 1 ? "gray" : "#000",
                  cursor:
                    currentPage >= totalPages - 1 ? "not-allowed" : "pointer",
                }}
              >
                <KTIcon iconName="arrow-right" className="fs-2" />
              </div>
            </div>
          )}
        </Card.Body>
      </Card>

      <Modal show={showModal} onHide={handleClose} centered>
        <Modal.Header closeButton>
          <Modal.Title>Add New Todo</Modal.Title>
        </Modal.Header>
        <Formik
          initialValues={{ description: '' }}
          validationSchema={validationSchema}
          onSubmit={async (values, { setSubmitting, resetForm }) => {
            try {
              if (values.description.length > 200) {
                Swal.fire("Description should not exceed 200 characters.", "Total characters: " + values.description.length, "warning");
                return;
              }
              await createTodo({ employeeId, description: values.description });
              resetForm();
              handleClose();
              fetchTodos();
              successConfirmation("Todo created successfully");
            } catch (error) {
              console.error("Error creating todo:", error);
              errorConfirmation("Failed to create the todo. Please try again.");
            } finally {
              setSubmitting(false);
            }
          }}
        >
          {({ handleSubmit, isSubmitting }) => (
            <Form noValidate onSubmit={handleSubmit}>
              <Modal.Body>
                <Form.Group controlId="formDescription">
                  <Form.Label>Description</Form.Label>
                  <Field
                    as="textarea"
                    name="description"
                    rows={3}
                    className="form-control"
                    placeholder="Enter your to-do..."
                  />
                  <ErrorMessage
                    name="description"
                    render={(errorMessage) => (
                      <div style={{ color: "#9A4141", marginTop: "5px" }}>{errorMessage}</div>
                    )}
                  />
                  <Form.Text className="text-muted">
                    Must be between 1 - 200 characters
                  </Form.Text>
                </Form.Group>
              </Modal.Body>
              <Modal.Footer>
                <Button
                  type="submit"
                  size="lg"
                  disabled={isSubmitting}
                  style={{
                    backgroundColor: "#a94442",
                    borderColor: "#a94442",
                    color: "white",
                  }}
                >
                  {isSubmitting ? "Saving..." : "Save"}
                </Button>
              </Modal.Footer>
            </Form>
          )}
        </Formik>
      </Modal>

      <Modal show={showEditModal} onHide={handleEditClose} centered>
        <Modal.Header closeButton>
          <Modal.Title>Edit Todo</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group>
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={editTodo?.description || ""}
                onChange={(e) =>
                  setEditTodo((prev) =>
                    prev ? { ...prev, description: e.target.value } : null
                  )
                }
              />
            </Form.Group>

            <Form.Group className="mt-3">
              <Form.Label>Status</Form.Label>
              <Dropdown>
                <Dropdown.Toggle
                  variant="light"
                  style={{
                    width: "100%",
                    textAlign: "left",
                    border: "1px solid #ced4da",
                    padding: "10px",
                    backgroundColor: "white",
                  }}
                >
                  {editTodo?.status === "PENDING"
                    ? "Pending"
                    : editTodo?.status === "COMPLETED"
                    ? "Completed"
                    : "Won't Do"}
                </Dropdown.Toggle>
                <Dropdown.Menu style={{ width: "100%" }}>
                  <Dropdown.Item
                    onClick={() =>
                      setEditTodo((prev) =>
                        prev ? { ...prev, status: "PENDING" } : null
                      )
                    }
                  >
                    Pending
                  </Dropdown.Item>
                  <Dropdown.Item
                    onClick={() =>
                      setEditTodo((prev) =>
                        prev ? { ...prev, status: "COMPLETED" } : null
                      )
                    }
                  >
                    Completed
                  </Dropdown.Item>
                  <Dropdown.Item
                    onClick={() =>
                      setEditTodo((prev) =>
                        prev ? { ...prev, status: "WONT_DO" } : null
                      )
                    }
                  >
                    Won't Do
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            </Form.Group>
          </Form>
        </Modal.Body>

        <Modal.Footer>
          <Button
            size="lg"
            onClick={handleUpdateTodo}
            style={{
              backgroundColor: "#a94442",
              borderColor: "#a94442",
              color: "white",
            }}
          >
            Save
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
});

TodoList.displayName = 'TodoList';

export default TodoList;
