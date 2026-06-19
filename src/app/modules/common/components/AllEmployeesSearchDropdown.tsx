import { Autocomplete, MenuItem, TextField } from "@mui/material";
import { Employee, saveSelectedEmployee } from "@redux/slices/employee";
import { RootState } from "@redux/store";
import { fetchAllEmployees } from "@services/employee";
import { useEffect, useRef, useState } from "react";
import { Container, Row, Col, Form } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import { maleIcons } from "@metronic/assets/sidepanelicons";
import { useTeamFilter } from '@/contexts/TeamFilterContext';

type EmployeeStatus = 'all' | 'active' | 'inactive';

const AllEmployeesSearchDropdown = () => {
  const autoCompleteRef = useRef<HTMLDivElement>(null);
  const [scrollY, setScrollY] = useState(0);
  const [statusFilter, setStatusFilter] = useState<EmployeeStatus>('active');

  useEffect(() => {
    const handleScroll = () => {
      if (Math.abs(window.scrollY - scrollY) > 70) {
        if (autoCompleteRef.current) {
          const input = autoCompleteRef.current.querySelector("input");
          if (input) {
            (input as HTMLInputElement).blur(); 
          }
        }
        setScrollY(window.scrollY);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [scrollY]);
  const dispatch = useDispatch();
  const loggedInEmployee = useSelector(
    (state: RootState) => state.employee.currentEmployee
  );

  const { filterIds } = useTeamFilter();
  const [selectedDropdownEmployee, setSelectedDropdownEmployee] =
    useState<Employee>(loggedInEmployee);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [sortedEmployees, setSortedEmployees] = useState<Employee[]>([]);

  const handleSearch = (e: any, employee: Employee | null, reason: string) => {
    if (employee) {
      setSelectedDropdownEmployee(employee);
      dispatch(saveSelectedEmployee(employee));
    } else if (reason === "clear") {
      setSelectedDropdownEmployee(loggedInEmployee);
      dispatch(saveSelectedEmployee(loggedInEmployee));
    }
  };

  const handleSelect = (e: any) => {
    const selectedId = e.target.value;
    const employee = allEmployees.find((emp) => emp.id === selectedId);
    setSelectedDropdownEmployee(employee!);
    dispatch(saveSelectedEmployee(employee));
  };

  // Fetch employees based on status filter
  useEffect(() => {
    async function fetchData() {
      let isActive: boolean | undefined;

      if (statusFilter === 'active') {
        isActive = true;
      } else if (statusFilter === 'inactive') {
        isActive = false;
      } else {
        isActive = undefined; // 'all' - fetch all employees
      }

      const { data } = await fetchAllEmployees(isActive);
      const employees: Employee[] = data.employees;
      setAllEmployees(filterIds ? employees.filter((e) => filterIds.includes(e.id)) : employees);

      // Only set logged-in employee on initial load (when statusFilter is 'all')
      // For other filters or filter changes, show placeholder
      if (statusFilter === 'all' && selectedDropdownEmployee.id === "") {
        setSelectedDropdownEmployee(loggedInEmployee);
        dispatch(saveSelectedEmployee(loggedInEmployee));
      }
    }
    fetchData();
  }, [statusFilter]);

  // Sort employees by name (alphabetically) - no need to filter as API already returns filtered data
  useEffect(() => {
    if (allEmployees.length === 0) return;

    const sorted = [...allEmployees].sort((a, b) =>
      a.users.firstName.localeCompare(b.users.firstName)
    );

    setSortedEmployees(sorted);
  }, [allEmployees]);

  const handleStatusFilterChange = (e: any) => {
    const newStatus = e.target.value as EmployeeStatus;
    setStatusFilter(newStatus);

    // Clear selection to show placeholder - user needs to manually select an employee
    const emptyEmployee = {
      id: "",
      users: { firstName: "", lastName: "" },
      isActive: false
    } as Employee;
    setSelectedDropdownEmployee(emptyEmployee);
  };

  // Dispatch logged-in employee to Redux on initial mount
  useEffect(() => {
    if (loggedInEmployee && loggedInEmployee.id) {
      dispatch(saveSelectedEmployee(loggedInEmployee));
    }
  }, []); // Run only once on mount

  return (
    <>
      <Container
        fluid
        className="p-4"
        style={{ 
          backgroundColor: "#ffffff", 
          borderRadius: "12px",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.04)",
          border: "1px solid #f1f5f9"
        }}
      >
        {/* Desktop Layout */}
        <Row className="align-items-center d-none d-md-flex g-3">
          <Col md={6} className="d-flex flex-column">
            <Form.Label style={{ fontSize: "0.85rem", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600 }} className="mb-2">Filter</Form.Label>
            <TextField
              select
              value={statusFilter}
              onChange={handleStatusFilterChange}
              variant="outlined"
              size="small"
              fullWidth
              InputProps={{
                style: {
                  borderRadius: "8px",
                  height: "45px",
                  backgroundColor: "white",
                },
              }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  "& fieldset": {
                    borderColor: "#9D4141",
                  },
                  "&:hover fieldset": {
                    borderColor: "#9D4141",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: "#9D4141",
                  },
                },
              }}
              SelectProps={{
                renderValue: (selected) => {
                  if (selected === 'all') {
                    return <span>All</span>;
                  }
                  return (
                    <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
                      <span style={{ flex: 1 }}>
                        {selected === 'active' ? 'Active' : 'Inactive'}
                      </span>
                      <span
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          backgroundColor: selected === 'active' ? "#3ECD45" : "#8A8A8A",
                          marginLeft: 8,
                        }}
                      />
                    </div>
                  );
                }
              }}
            >
              <MenuItem value="all">
                <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
                  <span>All</span>
                </div>
              </MenuItem>
              <MenuItem value="active">
                <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
                  <span style={{ flex: 1 }}>Active</span>
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      backgroundColor: "#3ECD45",
                      marginLeft: 8,
                    }}
                  />
                </div>
              </MenuItem>
              <MenuItem value="inactive">
                <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
                  <span style={{ flex: 1 }}>Inactive</span>
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      backgroundColor: "#8A8A8A",
                      marginLeft: 8,
                    }}
                  />
                </div>
              </MenuItem>
            </TextField>
          </Col>
          <Col md={6} className="d-flex flex-column" ref={autoCompleteRef}>
            <Form.Label style={{ fontSize: "0.85rem", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600 }} className="mb-2">
              Search by Name or ID
            </Form.Label>
            <Autocomplete
              disablePortal
              options={sortedEmployees}
              getOptionLabel={(option) =>
                option.users.firstName +
                " " +
                option.users.lastName +
                " - " +
                option.employeeCode
              }
              onChange={handleSearch}
              style={{ width: "100%" }}
              renderOption={(props, option) => (
                <li
                  {...props}
                  key={option.id}
                  style={{ display: "flex", alignItems: "center" }}
                >
                  <img
                    src={
                      option.avatar ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(
                        option.users.firstName + " " + option.users.lastName
                      )}`
                    }
                    alt={option.users.firstName + " avatar"}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      objectFit: "cover",
                      marginRight: 8,
                    }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        "https://ui-avatars.com/api/?name=" +
                        encodeURIComponent(
                          option.users.firstName + " " + option.users.lastName
                        );
                    }}
                  />
                  <span style={{
                    color: option.isActive ? "inherit" : "#999",
                    flex: 1
                  }}>
                    {option.users.firstName +
                      " " +
                      option.users.lastName +
                      " - " +
                      option.employeeCode}
                  </span>
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      backgroundColor: option.isActive ? "#3ECD45" : "#8A8A8A",
                      marginLeft: 8,
                    }}
                  />
                </li>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Search Employee Name or ID"
                  variant="outlined"
                  fullWidth
                  InputProps={{
                    ...params.InputProps,
                    style: {
                      borderRadius: "8px",
                      padding: "2px 2px",
                      height: "45px",
                      backgroundColor: "white",
                    },
                  }}
                  inputProps={{
                    ...params.inputProps,
                    style: { textAlign: "left" },
                  }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      transition: "all 0.2s ease-in-out",
                      "& fieldset": {
                        borderColor: "#e2e8f0",
                        borderWidth: "1.5px",
                      },
                      "&:hover fieldset": {
                        borderColor: "#cbd5e1",
                      },
                      "&.Mui-focused fieldset": {
                        borderColor: "#9D4141",
                        borderWidth: "1.5px",
                        boxShadow: "0 0 0 4px rgba(157, 65, 65, 0.1)"
                      },
                    },
                  }}
                />
              )}
            />
          </Col>
        </Row>

        {/* Mobile Layout */}
        <Row className="d-md-none">
          <Col xs={12} className="mb-3">
            <Form.Label style={{ fontSize: "0.85rem", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600 }} className="mb-2 d-block">Filter</Form.Label>
            <TextField
              select
              value={statusFilter}
              onChange={handleStatusFilterChange}
              variant="outlined"
              fullWidth
              InputProps={{
                style: {
                  borderRadius: "8px",
                  padding: "2px 2px",
                  height: "45px",
                  backgroundColor: "white",
                },
              }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  transition: "all 0.2s ease-in-out",
                  "& fieldset": {
                    borderColor: "#e2e8f0",
                    borderWidth: "1.5px",
                  },
                  "&:hover fieldset": {
                    borderColor: "#cbd5e1",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: "#9D4141",
                    borderWidth: "1.5px",
                    boxShadow: "0 0 0 4px rgba(157, 65, 65, 0.1)"
                  },
                },
              }}
              SelectProps={{
                renderValue: (selected) => {
                  if (selected === 'all') {
                    return <span>All</span>;
                  }
                  return (
                    <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
                      <span style={{ flex: 1 }}>
                        {selected === 'active' ? 'Active' : 'Inactive'}
                      </span>
                      <span
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          backgroundColor: selected === 'active' ? "#3ECD45" : "#8A8A8A",
                          marginLeft: 8,
                        }}
                      />
                    </div>
                  );
                }
              }}
            >
              <MenuItem value="all">
                <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
                  <span>All</span>
                </div>
              </MenuItem>
              <MenuItem value="active">
                <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
                  <span style={{ flex: 1 }}>Active</span>
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      backgroundColor: "#3ECD45",
                      marginLeft: 8,
                    }}
                  />
                </div>
              </MenuItem>
              <MenuItem value="inactive">
                <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
                  <span style={{ flex: 1 }}>Inactive</span>
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      backgroundColor: "#8A8A8A",
                      marginLeft: 8,
                    }}
                  />
                </div>
              </MenuItem>
            </TextField>
          </Col>



          <Col xs={12}>
            <Form.Label style={{ fontSize: "0.85rem", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600 }} className="mb-2 d-block">
              Search by Name or ID
            </Form.Label>
            <Autocomplete
              disablePortal
              options={sortedEmployees}
              getOptionLabel={(option) =>
                option.users.firstName +
                " " +
                option.users.lastName +
                " - " +
                option.employeeCode
              }
              onChange={handleSearch}
              style={{ width: "100%" }}
              renderOption={(props, option) => (
                <li
                  {...props}
                  key={option.id}
                  style={{ display: "flex", alignItems: "center" }}
                >
                  <img
                    src={
                      option.avatar ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(
                        option.users.firstName + " " + option.users.lastName
                      )}`
                    }
                    alt={option.users.firstName + " avatar"}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      objectFit: "cover",
                      marginRight: 8,
                    }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        "https://ui-avatars.com/api/?name=" +
                        encodeURIComponent(
                          option.users.firstName + " " + option.users.lastName
                        );
                    }}
                  />
                  <span style={{
                    color: option.isActive ? "inherit" : "#999",
                    flex: 1
                  }}>
                    {option.users.firstName +
                      " " +
                      option.users.lastName +
                      " - " +
                      option.employeeCode}
                  </span>
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      backgroundColor: option.isActive ? "#3ECD45" : "#8A8A8A",
                      marginLeft: 8,
                    }}
                  />
                </li>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Search Employee Name or ID"
                  variant="outlined"
                  fullWidth
                  InputProps={{
                    ...params.InputProps,
                    style: {
                      borderRadius: "8px",
                      padding: "2px 2px",
                      height: "45px",
                      backgroundColor: "white",
                    },
                  }}
                  inputProps={{
                    ...params.inputProps,
                    style: { textAlign: "left" },
                  }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      transition: "all 0.2s ease-in-out",
                      "& fieldset": {
                        borderColor: "#e2e8f0",
                        borderWidth: "1.5px",
                      },
                      "&:hover fieldset": {
                        borderColor: "#cbd5e1",
                      },
                      "&.Mui-focused fieldset": {
                        borderColor: "#9D4141",
                        borderWidth: "1.5px",
                        boxShadow: "0 0 0 4px rgba(157, 65, 65, 0.1)"
                      },
                    },
                  }}
                />
              )}
            />
          </Col>
        </Row>
      </Container>
    </>
  );
};

export default AllEmployeesSearchDropdown; 