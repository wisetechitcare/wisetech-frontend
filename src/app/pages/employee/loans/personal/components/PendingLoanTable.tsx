import MaterialTable from '@app/modules/common/components/MaterialTable';
import { KTIcon } from '@metronic/helpers';
import { deleteLoanById } from '@services/employee';
import dayjs from 'dayjs';
import { MRT_ColumnDef } from 'material-react-table';
import React, { useEffect, useMemo, useState } from 'react';
import { Modal } from 'react-bootstrap';
import LoanApplicationForm from './LoanApplicationForm';
import { deleteConfirmation } from '@utils/modal';
import { formatNumber } from '@utils/statistics';
import { permissionConstToUseWithHasPermission, resourceNameMapWithCamelCase } from '@constants/statistics';
import { hasPermission } from '@utils/authAbac';
import { useSelector } from 'react-redux';
import { RootState } from '@redux/store';

function PendingLoanTable({ completeLoanData, onLoanSubmited }: { completeLoanData: any[], onLoanSubmited?: (updatedLoan: any) => Promise<void> }) {
  const [loanData, setLoanData] = useState<any[]>([]);
  const [loanToEdit, setLoanToEdit] = useState<any>();
  const [modalVisible, setModalVisible] = useState(false);
  const employeeId = useSelector(
    (state: RootState) => state.employee.currentEmployee.id
  );

  useEffect(() => {
    processLoanData(completeLoanData);
  }, [completeLoanData]);

  const processLoanData = (rawData: any[]) => {
    const finalData = rawData?.map((ele: any) => ({
      id: ele.id,
      loanAmount: ele.loanAmount,
      status: ele.status === 1 ? 'Approved' : 'Pending',
      loanDuration: ele.numberOfMonths || (dayjs(ele?.deductionMonth).month() - dayjs().month() + 1),
      loanType: ele?.loanType === 'EMI' ? 'EMI' : 'One Time',
      reason: ele.loanReason,
      deductionMonth: ele.deductionMonth,
    }));
    setLoanData(finalData);
  };

  const handleDelete = async (row: any) => {
    const confirmed = await deleteConfirmation('Loan Deleted Successfully!');
    if (confirmed) {
      await deleteLoanById(row.id);
      setLoanData((prev) => prev.filter((loan) => loan.id !== row.id));
    }
  };

  const handleEdit = (row: any) => {
    setLoanToEdit(row);
    setModalVisible(true);
  };

  const columns = useMemo<MRT_ColumnDef<any>[]>(
    () => [
      {
        accessorKey: 'loanAmount',
        header: 'Loan Amount',
        enableSorting: false,
        enableColumnActions: false,
        Cell: ({ renderedCellValue }: any) => formatNumber(renderedCellValue),
      },
      {
        accessorKey: 'loanType',
        header: 'Loan Type',
        enableSorting: false,
        enableColumnActions: false,
        Cell: ({ renderedCellValue }: any) => renderedCellValue,
      },
       // {
            //     accessorKey: "status",
            //     header: "Status",
            //     enableSorting: false,
            //     enableColumnActions: false,
            //     Cell: ({ renderedCellValue }: any) => renderedCellValue,
            // },
      {
        accessorKey: 'loanDuration',
        header: 'Loan Duration',
        enableSorting: false,
        enableColumnActions: false,
        Cell: ({ cell }) => {
          const duration = cell.getValue<number>();
          return duration ? `${duration} Months` : 'N/A';
        },
      },
      {
        accessorKey: 'reason',
        header: 'Reason',
        enableSorting: false,
        enableColumnActions: false,
        Cell: ({ renderedCellValue }: any) => renderedCellValue,
      },
      {
        accessorKey: 'actions',
        header: 'Actions',
        enableSorting: false,
        enableColumnActions: false,
        Cell: ({ row }: any) => {
          const resEdit = hasPermission(resourceNameMapWithCamelCase.loan, permissionConstToUseWithHasPermission.editOwn, employeeId)
          const resDelete = hasPermission(resourceNameMapWithCamelCase.loan, permissionConstToUseWithHasPermission.deleteOwn, employeeId)
          return (
            <div className="flex items-center justify-center space-x-4">
              {resEdit && <button
                className="btn btn-icon btn-active-color-primary btn-sm w-[20px]"
                onClick={() => handleEdit(row.original)}
              >
                {<KTIcon iconName="pencil" className="inline fs-4 text-red-500" />}
              </button>}
              {resDelete && <button
                className="btn btn-icon btn-active-color-primary btn-sm w-4"
                onClick={() => handleDelete(row.original)}
              >
                <KTIcon iconName="trash" className="inline fs-4 text-red-500" />
              </button>}
              {
                !resDelete && !resEdit && <button
                  className="btn btn-icon btn-active-color-primary btn-sm w-4"
                >
                  -NA-
                </button>
              }
            </div>
          )
        },
      },
    ],
    []
  );

  return (
    <>
      <MaterialTable
        columns={columns}
        data={loanData}
        muiTableProps={{
          sx: {
            '& .MuiTableBody-root .MuiTableCell-root': {
              borderBottom: 'none',
              paddingY: '5px',
            },
          },
        }}
        tableName="Pending Loan Data"
        resource={resourceNameMapWithCamelCase.loan}
        viewOwn={true}
        viewOthers={true}
        employeeId={employeeId}
      />
      <Modal show={modalVisible} onHide={() => setModalVisible(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Loan Application Form</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <LoanApplicationForm
            setShowModalFunc={setModalVisible}
            defaultData={loanToEdit}
            isUpdate={true}
            onLoanSubmited={onLoanSubmited}
          />
        </Modal.Body>
      </Modal>
    </>
  );
}

export default PendingLoanTable;
