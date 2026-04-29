import { useEffect, useState } from "react";
import MaterialTable from "app/modules/common/components/MaterialTable";
import { PageLink, PageTitle } from "@metronic/layout/core";
import { PageHeadingTitle } from "@metronic/layout/components/header/page-title/PageHeadingTitle";
import VisibilityIcon from '@mui/icons-material/Visibility';
import { IconButton, Typography } from "@mui/material";
import { fetchEmployeeDocuments } from "@services/employee";
import { useSelector } from "react-redux";
import { RootState } from "@redux/store";
import dayjs from "dayjs";
import { pdfjs } from 'react-pdf';
import PdfLoader from "./PdfLoader";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

const usersBreadcrumbs: Array<PageLink> = [
  {
    title: "People",
    path: "/employees",
    isSeparator: false,
    isActive: false,
  },
  {
    title: "",
    path: "",
    isSeparator: true,
    isActive: false,
  },
];

const DocumentsTable = () => {
  const employeeId = useSelector((state: RootState) => state.employee.currentEmployee?.id);
  const digitalSignature = useSelector((state: RootState) => state.employee.currentEmployee?.digitalSignaturePath);
  const status = useSelector((state: RootState) => state.employee.currentEmployee?.dateOfExit) ? 'Terminated' : 'Active';
  const [documents, setDocuments] = useState<Array<{}>>([]);
  const [file, setFile] = useState("");
  const [fileName, setFileName] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      if (employeeId) {
        try {
          const response = await fetchEmployeeDocuments(employeeId);
          const { documentsDetails = [] } = response?.data || {};
          const formattedDocuments = documentsDetails.map(({ fileName, createdAt, path }: any) => ({
            fileName,
            created: dayjs(createdAt).format('YYYY-MM-DD'),
            status,
            fileUrl: path,
          }));
          setDocuments(formattedDocuments);
        } catch (error) {
          console.error("Failed to fetch documents", error);
        }
      }
    };

    fetchData();
  }, [employeeId]);

  const handleViewDocument = (documentPath: string, documentName: string) => {
    setFile(documentPath);
    setFileName(documentName);
  };

  const handleCloseDialog = () => {
    setFile("");
  };

  const columns = [
    { accessorKey: 'fileName', header: 'File Name' },
    { accessorKey: 'created', header: 'Created' },
    {
      accessorKey: 'status',
      header: 'Status',
      Cell: ({ cell }: any) => {
        const status = cell.getValue();
        const backgroundColor = status === "Active" ? 'lightgreen' : 'lightcoral';
        return (
          <span style={{
            color: status === "Active" ? 'black' : 'red',
            backgroundColor,
            padding: '2px 5px',
            borderRadius: '4px'
          }}>
            {status}
          </span>
        );
      },
    },
    {
      accessorKey: 'actions',
      header: 'Actions',
      Cell: ({ row }: any) => (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <IconButton onClick={() => handleViewDocument(row.original.fileUrl, row.original.fileName)}>
            <VisibilityIcon />
          </IconButton>
        </div>
      ),
    }
  ];

  return (
    <>
      <PageTitle breadcrumbs={usersBreadcrumbs}>Documents</PageTitle>
      <div className="px-lg-9 px-4 py-5">
        <PageHeadingTitle />

        <Typography variant="body1" component="div" className="my-5">
          Displays the list of documents with their status and creation details.
        </Typography>
      </div>
      <div className="w-90 px-lg-8 px-5">
        <MaterialTable columns={columns} data={documents} tableName="Documents" employeeId={employeeId}/>
      </div>
      <PdfLoader file={file} fileName={fileName} signatureUrl={digitalSignature} onClose={handleCloseDialog} />
    </>
  );
};

export default DocumentsTable;
