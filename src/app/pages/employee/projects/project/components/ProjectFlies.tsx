import { RootState } from "@redux/store";
import { fetchEmployeeMediaByUserId } from "@services/employee";
import { getAllProjectDataForOverviewById } from "@services/projects";
import { useState, useEffect, useMemo } from "react";
import { useSelector } from "react-redux";
import { Eye } from "lucide-react";
import { DataTable, type ColumnDef } from '@/ds/patterns/data-table';
import { RowAction } from '@/ds/patterns/row-action';

type ProjectMediaRow = {
  fileName?: string;
  size?: string | number;
  createdAt?: string;
  media?: string;
  path?: string;
  status?: { color?: string };
};

const ProjectFiles = ({ projectId }: { projectId: string }) => {
  const [projectData, setProjectData] = useState<ProjectMediaRow[]>([]);
  const userId = useSelector(
    (state: RootState) => state?.employee?.currentEmployee?.userId
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

  const columns = useMemo<ColumnDef<ProjectMediaRow>[]>(
    () => [
      {
        accessorKey: "fileName",
        header: "File Name",
        cell: ({ row }) => (
          <span className="text-foreground">{row.original.fileName}</span>
        ),
      },
      {
        accessorKey: "size",
        header: "Size",
      },
      {
        accessorKey: "createdAt",
        header: "Uploaded At",
        cell: ({ row }) => (
          <span>
            {row.original.createdAt
              ? new Date(row.original.createdAt).toLocaleString()
              : "—"}
          </span>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        enableSorting: false,
        meta: { export: false, pin: "end" },
        cell: ({ row }) => (
          <RowAction
            label="View"
            onClick={() =>
              handleViewDocument(row.original.media || row.original.path || "")
            }
          >
            <Eye className="size-4" />
          </RowAction>
        ),
      },
    ],
    []
  );

  return (
    <div>
      <h3 className="mb-2">Project Files</h3>
      <DataTable
        caption="Project Media"
        columns={columns}
        data={projectData || []}
        getRowId={(r, i) => String(r.path || r.media || r.fileName || i)}
        stateKey="ProjectMedia"
      />
    </div>
  );
};

export default ProjectFiles;
