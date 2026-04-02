import { RootState } from "@redux/store";
import { fetchEmployeeMediaByUserId } from "@services/employee";
import { getAllProjectDataForOverviewById } from "@services/projects";
import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import MaterialTable from "@app/modules/common/components/MaterialTable";
import { KTIcon } from "@metronic/helpers";

const ProjectFiles = ({ projectId }: { projectId: string }) => {
  const [projectData, setProjectData] = useState<any[]>([]);
  const userId = useSelector(
    (state: RootState) => state?.employee?.currentEmployee?.userId
  );
  const employeeId = useSelector(
    (state: RootState) => state?.employee?.currentEmployee?.id
  );

  const fetchProjectData = async () => {
    if (!projectId) return;

    try {
      const projectResponse = await getAllProjectDataForOverviewById(projectId);
    
      const projectDocuments = projectResponse?.projectDataById?.documents;

      const { data: { media }} = await fetchEmployeeMediaByUserId(userId);

      let projectMediaUrls: any[]= [];
      
      if (typeof projectDocuments === 'string') {
        projectMediaUrls = [projectDocuments];
      } else if (Array.isArray(projectDocuments)) {
        projectMediaUrls = projectDocuments;
      } else if (projectDocuments && typeof projectDocuments === 'object') {
        projectMediaUrls = Object.values(projectDocuments).flat().filter(Boolean);
      }
      const filteredMedia = media.filter((m: any) =>
        projectMediaUrls.some(url => url === m.media || url === m.path || url.includes(m.fileName))
      );

      setProjectData(filteredMedia);
    } catch (error) {
      console.error("error fetching project files", error);
    }
  };

  useEffect(() => {
    fetchProjectData();
  }, [projectId]);

  const handleViewDocument = (document: string) => {
    window.open(document, "_blank");
  };


  const columns = [
    {
      accessorKey: "fileName", 
      header: "File Name",
      Cell: ({ row }: any) => (
        <span
          style={{ color: "#333", textDecoration: "none" }}
        >
          {row.original.fileName}
        </span>
      ),
    },
    {
      accessorKey: "size", 
      header: "Size",
    },
    {
      accessorKey: "createdAt", 
      header: "Uploaded At",
      Cell: ({ row }: any) => (
        <span>{new Date(row.original.createdAt).toLocaleString()}</span>
      ),
    },
    {
      id: "actions", 
      header: "Actions",
      Cell: ({ row }: any) => (
        <div style={{ display: "flex", gap: "8px" }}>
          <button className="btn btn-icon btn-active-color-primary btn-sm w-[20px]" onClick={() => handleViewDocument(row?.original?.media || row?.original?.path)}>          
              {<KTIcon iconName='eye' className='fs-1' />}
          </button>,
        </div>
      ),
    },
  ];

  return (
    <div>
      <h3 className="mb-2">Project Files</h3>
      <MaterialTable
        data={projectData || []}
        columns={columns}
        employeeId={employeeId}
        tableName="ProjectMedia"
        muiTableProps={{
          sx: {
            borderCollapse: "separate",
            borderSpacing: "0 8px !important",
          },
          muiTableBodyRowProps: ({ row }) => ({
            sx: {
              cursor: "pointer",
              backgroundColor: `${row.original?.status?.color}20`,
              padding: "10px !important",
              "& .MuiTableCell-root": {
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                fontSize: "14px",
                fontFamily: "Inter",
                fontWeight: "400",
                padding: "8px 16px !important",
                borderBottom: "2px solid white",
                borderTop: "2px solid white",
              },
              "& .MuiTableCell-root:first-of-type": {
                borderTopLeftRadius: "12px",
                borderBottomLeftRadius: "12px",
                borderLeft: "3px solid white",
              },
              "& .MuiTableCell-root:last-of-type": {
                borderTopRightRadius: "12px",
                borderBottomRightRadius: "12px",
                borderRight: "3px solid white",
              },
              "&:hover": {
                backgroundColor: `${row.original?.status?.color}99`,
                "& td": {
                  color: "black",
                },
              },
            },
          }),
        }}
      />
    </div>
  );
};

export default ProjectFiles;
