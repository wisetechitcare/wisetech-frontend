import { useEffect, useState, useCallback, useMemo } from "react";
import { useSelector } from "react-redux";
import { createLeaveOption, updateLeaveOptionById } from "@services/employee";
import { Form, Button, Row, Col } from "react-bootstrap";
import { LeaveTypes } from "@constants/attendance";
import { RootState } from "@redux/store";
import { fetchLeaveOptions } from "@services/company";

function LeavesAndBalance() {
  const employeeId = useSelector((state: RootState) => state?.employee.currentEmployee?.id);
  const branchId = useSelector((state: RootState) => state?.employee.currentEmployee?.branchId);
  const canApprove = ["HR", "Manager", "Director"];

  const [leavesOptions, setLeaveOptions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const filteredLeaveOptions = useMemo(() => {
    return leavesOptions.filter((leave) => leave.leaveType !== LeaveTypes.UNPAID_LEAVE);
  }, [leavesOptions]);

  const fetchOptions = useCallback(async () => {
    if (!employeeId || !branchId) return;
    
    setIsLoading(true);
    try {
      const { data: { leaveOptions } } = await fetchLeaveOptions();
      const enriched = leaveOptions.map((item: any) => ({
        ...item,
        isEditing: false,
        isNew: false,
      }));
      setLeaveOptions(enriched);
    } catch (error) {
      console.error("Error fetching leave options:", error);
    } finally {
      setIsLoading(false);
    }
  }, [employeeId, branchId]);

  useEffect(() => {
    fetchOptions();
  }, [fetchOptions]);

  const handleEditToggle = useCallback((index: number) => {
    setLeaveOptions((prevOptions) => {
      const updated = [...prevOptions];
      updated[index].isEditing = !updated[index].isEditing;
      return updated;
    });
  }, []);

  const handleChange = useCallback((index: number, field: string, value: string) => {
    setLeaveOptions((prevOptions) => {
      const updated = [...prevOptions];
      updated[index][field] = field === "numberOfDays" ? parseInt(value) : value;
      return updated;
    });
  }, []);

  const handleAdd = useCallback(() => {
    const tempId = `temp-${Date.now()}`;
    setLeaveOptions((prevOptions) => [
      ...prevOptions,
      {
        id: tempId,
        leaveType: "",
        numberOfDays: 0,
        isEditing: true,
        isNew: true,
      },
    ]);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!branchId) return;
    
    setIsSubmitting(true);
    
    try {
      const updatePromises = leavesOptions.map(async (leave) => {
        if (!leave.leaveType || leave.numberOfDays <= 0) {
          console.warn("Invalid leave entry skipped:", leave);
          return null;
        }

        try {
          if (leave.isNew) {
            return await createLeaveOption({
              leaveType: leave.leaveType,
              numberOfDays: leave.numberOfDays,
              branchId,
              canApprove,
            });
          } else {
            return await updateLeaveOptionById(leave.id, {
              branchId,
              leaveType: leave.leaveType,
              numberOfDays: leave.numberOfDays,
            });
          }
        } catch (error) {
          console.error("Error saving leave:", error);
          return null;
        }
      });

      // Wait for all promises to resolve
      await Promise.all(updatePromises);
      
      // Fetch fresh data only once after all updates
      await fetchOptions();
    } catch (error) {
      console.error("Error during submit:", error);
    } finally {
      setIsSubmitting(false);
    }
  }, [leavesOptions, branchId, canApprove, fetchOptions]);


  return (
    <div className="p-8 mt-3 bg-white rounded shadow-sm">
      {/* <h5>Leaves and balance</h5> */}
      <small className="text-muted d-block text-center">Max. days per year</small>

      {isLoading ? (
        <div className="text-center my-3">Loading...</div>
      ) : (
        <div className="mt-3">
          {filteredLeaveOptions.map((leave) => {
            const index = leavesOptions.findIndex((l) => l.id === leave.id);

            return (
              <Row key={leave.id || index} className="align-items-center mb-2">
                {leave.isEditing ? (
                  <>
                    <Col md={6}>
                      <Form.Control
                        type="text"
                        placeholder="Leave Type"
                        value={leave.leaveType}
                        disabled
                        // onChange={(e) => handleChange(index, "leaveType", e.target.value)}
                      />
                    </Col>
                    <Col md={3}>
                      <Form.Control
                        type="number"
                        placeholder="Days"
                        value={leave.numberOfDays}
                        onChange={(e) => handleChange(index, "numberOfDays", e.target.value)}
                      />
                    </Col>
                  </>
                ) : (   
                  <>
                    <Col md={6}>
                      <strong>{leave.leaveType}</strong>
                    </Col>
                    <Col md={3}>{leave.numberOfDays}</Col>
                  </>
                )}
                <Col md={3}>
                  <i
                    className="bi bi-pencil-square text-primary cursor-pointer me-3"
                    onClick={() => handleEditToggle(index)}
                  />
                </Col>
              </Row>
            );
          })}
        </div>
      )}

      {/* <div 
        className="mt-2 mb-3" 
        role="button" 
        onClick={handleAdd} 
        style={{ color: '#7A2124' }}
      >
        + Add Another
      </div> */}

      <Button className="mt-3"
        onClick={handleSubmit} 
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Submitting...' : 'Submit'}
      </Button>
    </div>
  );
}

export default LeavesAndBalance;