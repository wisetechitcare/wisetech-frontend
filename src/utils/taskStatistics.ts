export interface TaskChartData {
  label: string;
  value: number;
  color?: string;
  id?: string;
}

export const convertTaskDataToChartData = (
  tasks: any[]
): TaskChartData[] => {
  if (!tasks || tasks.length === 0) return [];

  // Group tasks by status
  const statusMap = new Map();

  tasks.forEach((task) => {
    const status = task.status;
    if (status) {
      const statusName = status.name;
      const statusId = status.id;
      const statusColor = status.color || "#3B82F6";

      if (statusMap.has(statusId)) {
        statusMap.set(statusId, {
          ...statusMap.get(statusId),
          value: statusMap.get(statusId).value + 1,
        });
      } else {
        statusMap.set(statusId, {
          label: statusName,
          value: 1,
          color: statusColor,
          id: statusId,
        });
      }
    }
  });

  return Array.from(statusMap.values());
};