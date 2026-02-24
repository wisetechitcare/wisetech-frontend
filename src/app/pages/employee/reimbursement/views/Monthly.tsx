import MaterialTable from "@app/modules/common/components/MaterialTable";
import { KTIcon } from "@metronic/helpers";
import { useMemo, useState, useEffect } from "react";
import { MRT_ColumnDef } from "material-react-table";
import { IReimbursements, IReimbursementsFetch, IReimbursementsUpdate } from "@models/employee";
import { useSelector } from "react-redux";
import { RootState } from "@redux/store";
import { Dayjs } from "dayjs";
import { fetchEmpMonthlyReimbursements, fetchMonthlyReimbursementsOfAllEmp } from "@utils/statistics";
import { deleteEmployeeReimbursement } from "@services/employee";
import { deleteConfirmation } from "@utils/modal";
import { hasPermission } from "@utils/authAbac";
import { permissionConstToUseWithHasPermission, resourceNameMapWithCamelCase } from "@constants/statistics";
import eventBus from "@utils/EventBus";
import { useEventBus } from "@hooks/useEventBus";

function Monthly({ month, showEditDeleteOption=false, showIdCol=false, showName=false,onEdit, selectedEmployeeId, resource="", viewOwn=false, viewOthers=false, checkOwnWithOthers=false }: { month: Dayjs, showEditDeleteOption:boolean, showIdCol:boolean, showName:boolean,  onEdit: (row: IReimbursementsUpdate) => void, selectedEmployeeId?:string, resource:string, viewOwn?:boolean, viewOthers?:boolean, checkOwnWithOthers?:boolean}) {
  const leaves = useSelector((state: RootState) => state.leaves.personalLeaves);
  const [fetchAgain, setFetchAgain] = useState(true);

  const [reimbursementData, setReimbursementData] = useState<
    IReimbursementsFetch[]
  >([]);

  const isAdmin = useSelector(
    (state: RootState) => state.auth.currentUser.isAdmin
  );
  const employeeId = useSelector((state: RootState) => state.employee.currentEmployee.id);

  const handleEdit = async (row: IReimbursementsUpdate) => {
    const finalRow =Object.fromEntries( Object.entries(row).filter(
      ([key, value]) =>value!=null,
    ));
    onEdit(finalRow)
  };

  const handleDelete = async (row: IReimbursements) => {
    const val = await deleteConfirmation("Reimbursement Deleted Successfully!");
    if(val){
      const res = await deleteEmployeeReimbursement(row.id.toString());
      setFetchAgain(prev=>!prev);
    }
  };

  const handleViewDocument = (document: string) => {
    window.open(document, "_blank");
  };

  const columns = useMemo<MRT_ColumnDef<IReimbursements>[]>(
    () => [
      {
        accessorKey: "expenseDate",
        header: "Date",
        enableSorting: false,
        enableColumnActions: false,
        Cell: ({ renderedCellValue }: any) => renderedCellValue,
      },
      {
        accessorKey: "day",
        header: "Day",
        enableSorting: false,
        enableColumnActions: false,
        Cell: ({ renderedCellValue }: any) => renderedCellValue,
      },
      ...(showIdCol ? [{
        accessorKey: "ID",
        header: "ID",
        enableSorting: false,
        enableColumnActions: false,
        Cell: ({ renderedCellValue }: any) => renderedCellValue,
      }]:[]),
      ...(showName ? [{
        accessorKey: "name",
        header: "Name",
        enableSorting: false,
        enableColumnActions: false,
        Cell: ({ renderedCellValue }: any) => renderedCellValue,
      }]:[]),
      {
        accessorKey: "description",
        header: "Note",
        enableSorting: false,
        enableColumnActions: false,
        Cell: ({ renderedCellValue }: any) => renderedCellValue,
      },
      {
        accessorKey: "type",
        header: "Type",
        enableSorting: false,
        enableColumnActions: false,
        Cell: ({ renderedCellValue }: any) => renderedCellValue,
      },
      {
        accessorKey: "amount",
        header: "Amount",
        enableSorting: false,
        enableColumnActions: false,
        Cell: ({ renderedCellValue }: any) => renderedCellValue,
      },
      {
        accessorKey: "status",
        header: "Status",
        enableSorting: false,
        enableColumnActions: false,
        Cell: ({ renderedCellValue }: any) => renderedCellValue,
      },
      {
        accessorKey: "document",
        header: "Document",
        enableSorting: false,
        enableColumnActions: false,
        Cell: ({ renderedCellValue }: any) => 
          <button className="btn btn-icon btn-active-color-primary btn-sm w-[20px]" onClick={() => handleViewDocument(renderedCellValue)} disabled={!renderedCellValue}>          
              {renderedCellValue ? <KTIcon iconName='eye' className='fs-3' /> : <i className="bi bi-file-earmark-x fs-3 text-danger"></i>}
          </button>,
      },
      ...(showEditDeleteOption ? [{
        accessorKey: "actions",
        header: "Actions",
        enableSorting: false,
        enableColumnActions: false,
        Cell: ({ row }: any) => {
          const isApproved = row.original.status === 'Approved';
          const resEdit = !isApproved && hasPermission(resourceNameMapWithCamelCase.reimbursement, permissionConstToUseWithHasPermission.editOwn, row?.original);
          const resDelete = !isApproved && hasPermission(resourceNameMapWithCamelCase.reimbursement, permissionConstToUseWithHasPermission.deleteOwn, row?.original);
          
          if (isApproved) {
            return <span className="text-muted">No actions available</span>;
          }
          
          return(
            <div className="flex items-center justify-center space-x-4">
              {resEdit && <button
                className="btn btn-icon btn-active-color-primary btn-sm w-[20px]"
                onClick={() => handleEdit(row.original)}
              >
                <KTIcon iconName="pencil" className="inline fs-4 text-red-500" />
              </button>}
              {resDelete && <button
                className="btn btn-icon btn-active-color-primary btn-sm w-4"
                onClick={() => handleDelete(row.original)}
              >
                <KTIcon iconName="trash" className="inline fs-4 text-red-500" />
              </button>}
              {(!resEdit && !resDelete) && "Not Allowed"}
            </div>
          )
        }
      }]:[]),
      //   ...(isAdmin
      //     ? [
      //         {
      //           accessorKey: "actions",
      //           header: "Actions",
      //           enableSorting: false,
      //           enableColumnActions: false,
      //           Cell: ({ row }: any) => (
      //             <button
      //               className="btn btn-icon btn-bg-light btn-active-color-primary btn-sm"
      //             >
      //               <KTIcon iconName="pencil" className="fs-3" />
      //             </button>
      //           ),
      //         },
      //       ]
      //     : []),
    ],
    []
  );

  useEffect(() => {
    if(showIdCol){
      fetchMonthlyReimbursementsOfAllEmp(month).then(data=>{        
        setReimbursementData(data);
      })
    }
    else{
      if(selectedEmployeeId){
        fetchEmpMonthlyReimbursements(month, selectedEmployeeId).then((data) => {          
          setReimbursementData(data);
        });
      }
      else{
        fetchEmpMonthlyReimbursements(month).then((data) => {
          
          setReimbursementData(data);
        });
      }
    }
  }, [month, fetchAgain, showIdCol, selectedEmployeeId ]);

  useEventBus("reimbursementRecords", (data) => {
    setFetchAgain(prev=>!prev);
  });


  return (
    <>
      <MaterialTable
        columns={columns}
        data={reimbursementData}
        muiTableProps={{
          sx: {
            "& .MuiTableBody-root .MuiTableCell-root": {
              borderBottom: "none",
              paddingY: "5px",
            },
            "& .MuiTableBody-root .MuiTableRow-root": {
              // padding: '0px',
            },
          },
        }}
        tableName="Monthly Reimbursements"
        resource={resource}
        viewOwn={viewOwn}
        viewOthers={viewOthers}
        checkOwnWithOthers={checkOwnWithOthers}
        employeeId={employeeId}
      />
    </>
  );
}

export default Monthly;
