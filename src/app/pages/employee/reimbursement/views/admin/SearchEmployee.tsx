import React from "react";
import { KTCard, KTCardBody } from "@metronic/helpers";
import { PageLink, PageTitle } from "@metronic/layout/core";
import { Route, Routes, Outlet, Navigate } from "react-router-dom";
import MaterialTable from "@app/modules/common/components/MaterialTable";
import { errorConfirmation, successConfirmation } from "@utils/modal";
import { useFormik } from "formik";
import { useEffect, useState } from "react";
import * as Yup from "yup";
import dayjs, { Dayjs } from "dayjs";
import { useMemo } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@redux/store";
import { MRT_ColumnDef } from "material-react-table";
import MaterialToggleReimbursement, {
  ToggleItemsCallBackFunctions,
} from "../../MaterialToggleReimbursement";

import { UsersListWrapper } from "@app/modules/apps/user-management/users-list/UsersList";
import {
  fetchAllReimbursementTypesFromDb,
  fetchEmpAlltimeReimbursements,
  fetchEmpMonthlyReimbursements,
  fetchEmpYearlyReimbursements,
} from "@utils/statistics";
import {
  IReimbursementsCreate,
  IReimbursementsFetch,
  IReimbursementsUpdate,
} from "@models/employee";
import { Modal } from "react-bootstrap";
import { Form, Formik, FormikValues, useField } from "formik";
import { Option } from "@models/dropdown";
import TextInput from "app/modules/common/inputs/TextInput";
import DropDownInput from "app/modules/common/inputs/DropdownInput";
import DateInput from "@app/modules/common/inputs/DateInput";
import { fetchAllReimbursementTypes } from "@services/options";
import ReimbursementDropdown from "@app/modules/common/inputs/ReimbursementDropdown";
import { uploadUserAsset } from "@services/uploader";
import {
  createEmployeeReimbursement,
  updateReimbursementById,
} from "@services/employee";
import Overview from "../common/Overview";
import AllEmployeesSearchDropdown from "@app/modules/common/components/AllEmployeesSearchDropdown";
import { resourceNameMapWithCamelCase } from "@constants/statistics";


function SearchEmployee() {
  const [totalRequestedAmount, setTotalRequestedAmount] = useState(0);
  const [totalRequests, setTotalRequests] = useState(0);
  const [approvedRequests, setApprovedRequests] = useState(0);
  const [rejectedRequests, setRejectedRequests] = useState(0);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [reimbursementData, setReimbursementData] = useState<
    IReimbursementsFetch[]
  >([]);
  const [showEditDeleteOption, setShowEditDeleteOption] = useState(false);

  const [show, setShow] = useState(false);
  const [reimbursementOptions, setReimbursementOptions] = useState<any>([]);
  const employeeId = useSelector(
    (state: RootState) => state.employee.currentEmployee.id
  );
  const selectedEmployeeId = useSelector(
    (state: RootState) => state.employee.selectedEmployee?.id
  );
  const selectedEmployee = useSelector(
    (state: RootState) => state.employee.selectedEmployee
  );

  const toggleItemsActions: ToggleItemsCallBackFunctions = {
    monthly: function (month: Dayjs): void {
      fetchEmpMonthlyReimbursements(month, selectedEmployeeId); // create custom
    },
    yearly: function (year: Dayjs): void {
      fetchEmpYearlyReimbursements(year, selectedEmployeeId); // create custom
    },
    allTime: function (year: Dayjs): void {
      fetchEmpAlltimeReimbursements(selectedEmployeeId); // create custom and pass empId if required
    },
  };
  
  useEffect(() => {
    const currentYear = dayjs().startOf("year");
    // console.log("selected employee: ", selectedEmployee);
    fetchEmpYearlyReimbursements(currentYear, selectedEmployeeId).then((data) => {
      let totalAmount = 0,
        totalRequest = 0,
        approvedCount = 0,
        rejectedCount = 0,
        pendingCount = 0;
      data.forEach((ele) => {
        if (ele.id && ele.employeeId == selectedEmployeeId) {
          totalAmount += parseInt(ele.amount ? ele.amount : "0");
          totalRequest += 1;
          if (ele.status == "Pending") {
            pendingCount += 1;
          } else if (ele.status == "Rejected") {
            rejectedCount += 1;
          } else {
            approvedCount += 1;
          }
        }
      });
      setApprovedRequests(approvedCount);
      setPendingRequests(pendingCount);
      setRejectedRequests(rejectedCount);
      setTotalRequests(totalRequest);
      setTotalRequestedAmount(totalAmount);
      setReimbursementData(data);
    });
  }, [show, selectedEmployeeId]);

  const fetchAllReimbursementsTypesData = async () => {
    const reimbursementResponse = await fetchAllReimbursementTypesFromDb();
    const reimbursementOptions = reimbursementResponse.map((country: any) => ({
      value: country.id,
      label: country.type,
    }));

    setReimbursementOptions(reimbursementOptions);
  };

  return (
    <>
      <div className="mb-6">
        <AllEmployeesSearchDropdown />
      </div>
      <Overview
        totalRequestedAmount={totalRequestedAmount}
        totalRequests={totalRequests}
        approvedRequests={approvedRequests}
        rejectedRequests={rejectedRequests}
        pendingRequests={pendingRequests}
      />

      <div className="my-6">
        <h2>Reimbursement Records</h2>
      </div>
      <MaterialToggleReimbursement
        toggleItemsActions={toggleItemsActions}
        showEditDeleteOption={showEditDeleteOption}
        selectedEmployeeId={selectedEmployeeId}
        resource={resourceNameMapWithCamelCase.reimbursement}
        viewOthers={true}
        viewOwn={true}
        checkOwnWithOthers={true}
      />
    </>
  );
}

export default SearchEmployee;
