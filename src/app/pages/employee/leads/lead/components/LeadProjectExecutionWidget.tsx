import React, { useEffect, useState } from "react";
import { Grid, Chip, CircularProgress, Tooltip, IconButton } from "@mui/material";
import {
  Engineering,
  CheckCircle,
  RadioButtonUnchecked,
  Edit,
  AddTask,
  Delete,
} from "@mui/icons-material";
import {
  getLeadProjectMeta,
  getLeadTasks,
  createLeadTask,
  updateLeadTask,
  deleteLeadTask,
} from "@services/leadProjectMeta";

// ── Project Execution Banner ──────────────────────────────────────────────────

export const LeadProjectExecutionBanner: React.FC<{ lead: any }> = ({ lead }) => {
  const meta = lead?.projectMeta;
  if (!meta) return null;

  const status = meta?.projectStatus;
  const manager = meta?.projectManager;

  const statusColor = status?.color || "#1976d2";

  return (
    <div
      className="d-flex align-items-center gap-3 px-5 py-3 rounded mb-4"
      style={{ background: "linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%)", border: "1px solid #90caf9" }}
    >
      <Engineering sx={{ color: "#1976d2", fontSize: 28 }} />
      <div className="d-flex align-items-center gap-3 flex-wrap">
        <div>
          <span className="text-muted small fw-semibold">Execution Status</span>
          <div>
            {status ? (
              <Chip
                label={status.name}
                size="small"
                sx={{ backgroundColor: statusColor, color: "#fff", fontWeight: 700, fontSize: "12px" }}
              />
            ) : (
              <span className="text-muted small">Not set</span>
            )}
          </div>
        </div>
        {manager && (
          <div>
            <span className="text-muted small fw-semibold">Project Manager</span>
            <div className="fw-bold text-dark small">
              {manager.firstName} {manager.lastName}
            </div>
          </div>
        )}
        {meta.contractRate && (
          <div>
            <span className="text-muted small fw-semibold">Contract Rate</span>
            <div className="fw-bold text-dark small">₹{Number(meta.contractRate).toLocaleString("en-IN")}</div>
          </div>
        )}
        {meta.finalCost && (
          <div>
            <span className="text-muted small fw-semibold">Final Cost</span>
            <div className="fw-bold text-dark small">₹{Number(meta.finalCost).toLocaleString("en-IN")}</div>
          </div>
        )}
        <div className="d-flex gap-2">
          {meta.isLive && <Chip label="Live" size="small" color="success" sx={{ fontWeight: 700 }} />}
          {!meta.isProjectOpen && <Chip label="Closed" size="small" color="default" sx={{ fontWeight: 700 }} />}
        </div>
      </div>
    </div>
  );
};

// ── Execution Detail Tab ──────────────────────────────────────────────────────

export const LeadProjectExecutionTab: React.FC<{ leadId: string }> = ({ leadId }) => {
  const [meta, setMeta] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLeadProjectMeta(leadId)
      .then((res: any) => setMeta(res?.data))
      .catch(() => setMeta(null))
      .finally(() => setLoading(false));
  }, [leadId]);

  if (loading) {
    return (
      <div className="d-flex justify-content-center py-10">
        <CircularProgress size={32} />
      </div>
    );
  }

  if (!meta) {
    return (
      <div className="alert alert-info">
        No project execution details have been set yet. Edit the lead and navigate to the Project Execution step to add them.
      </div>
    );
  }

  const rows: { label: string; value: any }[] = [
    { label: "Execution Status", value: meta.projectStatus?.name || "—" },
    { label: "Project Manager", value: meta.projectManager ? `${meta.projectManager.firstName} ${meta.projectManager.lastName}` : "—" },
    { label: "Team", value: meta.team?.name || "—" },
    { label: "Project Access", value: meta.projectAccess || "—" },
    { label: "Is Live", value: meta.isLive ? "Yes" : "No" },
    { label: "Project Open", value: meta.isProjectOpen ? "Yes" : "No" },
    { label: "Contract Rate", value: meta.contractRate ? `₹${Number(meta.contractRate).toLocaleString("en-IN")}` : "—" },
    { label: "Final Cost", value: meta.finalCost ? `₹${Number(meta.finalCost).toLocaleString("en-IN")}` : "—" },
    { label: "Location Country", value: meta.locationCountry || "—" },
    { label: "Location State", value: meta.locationState || "—" },
    { label: "Location City", value: meta.locationCity || "—" },
    { label: "Location Incorrect", value: meta.isLocationIncorrect ? "Yes" : "No" },
    ...(meta.locationRemark ? [{ label: "Location Remark", value: meta.locationRemark }] : []),
  ];

  return (
    <div className="card border p-6 bg-white">
      <div className="d-flex align-items-center gap-2 mb-5">
        <Engineering color="primary" />
        <h5 className="mb-0 fw-bold" style={{ fontFamily: "Barlow, sans-serif" }}>
          Project Execution Details
        </h5>
      </div>
      <Grid container spacing={3}>
        {rows.map((row) => (
          <Grid item xs={12} sm={6} md={4} key={row.label}>
            <div className="p-3 rounded" style={{ background: "#f8f9fa" }}>
              <div className="text-muted small fw-semibold mb-1">{row.label}</div>
              <div className="fw-bold text-dark">{row.value}</div>
            </div>
          </Grid>
        ))}
      </Grid>
    </div>
  );
};

// ── Tasks Tab ─────────────────────────────────────────────────────────────────

export const LeadTasksTab: React.FC<{ leadId: string }> = ({ leadId }) => {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  const fetchTasks = () => {
    getLeadTasks(leadId)
      .then((res: any) => setTasks(res?.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchTasks(); }, [leadId]);

  const handleAdd = async () => {
    if (!newTitle.trim()) return;
    setAdding(true);
    try {
      await createLeadTask(leadId, { title: newTitle.trim() });
      setNewTitle("");
      fetchTasks();
    } catch (e) {
      console.error(e);
    } finally {
      setAdding(false);
    }
  };

  const handleToggle = async (task: any) => {
    await updateLeadTask(task.id, { isCompleted: !task.isCompleted }).catch(console.error);
    fetchTasks();
  };

  const handleDelete = async (id: string) => {
    await deleteLeadTask(id).catch(console.error);
    fetchTasks();
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center py-10">
        <CircularProgress size={32} />
      </div>
    );
  }

  const done = tasks.filter((t) => t.isCompleted);
  const pending = tasks.filter((t) => !t.isCompleted);

  return (
    <div>
      {/* Add task input */}
      <div className="card border p-4 mb-4 bg-white">
        <div className="d-flex gap-3 align-items-center">
          <AddTask color="primary" />
          <input
            type="text"
            className="form-control"
            placeholder="Add a task and press Enter..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            disabled={adding}
          />
          <button className="btn btn-primary btn-sm px-4 fw-bold" onClick={handleAdd} disabled={adding || !newTitle.trim()}>
            {adding ? <CircularProgress size={16} color="inherit" /> : "Add"}
          </button>
        </div>
      </div>

      {tasks.length === 0 && (
        <div className="alert alert-light text-center py-8">
          No tasks yet. Add your first task above.
        </div>
      )}

      {/* Pending tasks */}
      {pending.length > 0 && (
        <div className="card border p-4 mb-4 bg-white">
          <h6 className="fw-bold text-gray-700 mb-3">Pending ({pending.length})</h6>
          <div className="d-flex flex-column gap-2">
            {pending.map((task) => (
              <div
                key={task.id}
                className="d-flex align-items-center gap-3 p-3 rounded"
                style={{ background: "#f8f9fa" }}
              >
                <Tooltip title="Mark complete">
                  <IconButton size="small" onClick={() => handleToggle(task)}>
                    <RadioButtonUnchecked fontSize="small" color="action" />
                  </IconButton>
                </Tooltip>
                <span className="flex-grow-1 fw-medium">{task.title}</span>
                {task.assignedTo && (
                  <span className="badge badge-light-primary text-xs">
                    {task.assignedTo.firstName} {task.assignedTo.lastName}
                  </span>
                )}
                <Tooltip title="Delete">
                  <IconButton size="small" onClick={() => handleDelete(task.id)} color="error">
                    <Delete fontSize="small" />
                  </IconButton>
                </Tooltip>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completed tasks */}
      {done.length > 0 && (
        <div className="card border p-4 bg-white">
          <h6 className="fw-bold text-gray-400 mb-3">Completed ({done.length})</h6>
          <div className="d-flex flex-column gap-2">
            {done.map((task) => (
              <div
                key={task.id}
                className="d-flex align-items-center gap-3 p-3 rounded opacity-75"
                style={{ background: "#f0fff4" }}
              >
                <Tooltip title="Mark incomplete">
                  <IconButton size="small" onClick={() => handleToggle(task)}>
                    <CheckCircle fontSize="small" color="success" />
                  </IconButton>
                </Tooltip>
                <span className="flex-grow-1 text-muted" style={{ textDecoration: "line-through" }}>
                  {task.title}
                </span>
                <Tooltip title="Delete">
                  <IconButton size="small" onClick={() => handleDelete(task.id)} color="error">
                    <Delete fontSize="small" />
                  </IconButton>
                </Tooltip>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
