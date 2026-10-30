import React, { useMemo, useRef } from "react";
import { useFormikContext } from "formik";
import { MenuItem, Stack, TextField, Typography } from "@mui/material";
import { Delete, Add } from "@mui/icons-material";
import MaterialTable from "@app/modules/common/components/MaterialTable";
import { WtButton, WtIconButton } from "@app/modules/common/components/ui";
import { formatCurrencyDecimal } from "@utils/currency";

interface CommercialsGridProps {
  type: "lead" | "project";
  /** Card heading; the Add Row button sits at its right. */
  title?: string;
}

const inputSx = { "& .MuiOutlinedInput-input": { py: "7px", fontSize: 13 } };

export const CommercialsGrid: React.FC<CommercialsGridProps> = ({ type, title = "Commercial Work Areas" }) => {
  const { values, setFieldValue, setFieldError } = useFormikContext<any>();

  const isLead = type === "lead";
  const arrayPath = isLead ? "projectAreas" : "commercials";
  const items: any[] = values[arrayPath] || [];

  const keys = isLead
    ? { area: "projectArea", rate: "rate", rateCost: "cost", lumpsumCost: "cost", RATE: "1", LUMPSUM: "2" }
    : { area: "area", rate: "rate", rateCost: "rateCost", lumpsumCost: "lumpsumCost", RATE: "RATE", LUMPSUM: "LUMPSUM" };

  const grandTotal = items.reduce((sum, item) => {
    const costType = String(item.costType);
    if (costType === keys.RATE) return sum + (parseFloat(item[keys.rateCost]) || 0);
    if (costType === keys.LUMPSUM) return sum + (parseFloat(item[keys.lumpsumCost]) || 0);
    return sum;
  }, 0);

  // Area is summed over every row that has one, regardless of cost type — a work area is
  // measured whether it is priced per sqft or as a lump sum.
  const totalArea = items.reduce((sum, item) => sum + (parseFloat(item[keys.area]) || 0), 0);

  // `row` is the row as it stands now; `patch` is the field being typed. Cells are rendered
  // from row.original, so this never reads a stale `values` closure.
  const updateRow = (index: number, row: any, patch: Record<string, string>) => {
    Object.entries(patch).forEach(([k, v]) => setFieldValue(`${arrayPath}.${index}.${k}`, v));
    const item = { ...row, ...patch };
    const costType = String(item.costType);
    if (costType === keys.RATE) {
      const calculatedCost = parseFloat(((parseFloat(item[keys.area]) || 0) * (parseFloat(item.rate) || 0)).toFixed(4));
      setFieldValue(`${arrayPath}.${index}.${keys.rateCost}`, calculatedCost.toString());
      if (isLead) {
        setFieldError(`projectAreas.${index}.cost`, calculatedCost > 10000000000 ? "Calculated cost exceeds 100 Crores limit" : "");
      }
    } else if (costType === keys.LUMPSUM) {
      setFieldValue(`${arrayPath}.${index}.rate`, "0");
    }
  };

  const nonNegative = (v: string) => v === "" || parseFloat(v) >= 0;

  const addRow = () =>
    setFieldValue(arrayPath, [
      ...items,
      isLead
        ? { label: "", projectArea: "", costType: "", rate: "", cost: "" }
        : { label: "", area: "", costType: "", rate: "", rateCost: "", lumpsumCost: "" },
    ]);

  // Columns are memoized (so typing doesn't rebuild the table); read rows through a ref.
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const removeRow = (index: number) => setFieldValue(arrayPath, itemsRef.current.filter((_, i) => i !== index));

  const columns = useMemo(
    () => [
      {
        accessorKey: "label",
        header: "Label",
        size: 220,
        Cell: ({ row }: any) => (
          <TextField
            fullWidth size="small" sx={inputSx} placeholder="e.g. Basement Ground"
            value={row.original.label || ""}
            onChange={(e) => setFieldValue(`${arrayPath}.${row.index}.label`, e.target.value)}
          />
        ),
        Footer: () => <Typography sx={{ fontSize: 12.5, fontWeight: 800, color: "primary.main" }}>GRAND TOTAL</Typography>,
      },
      {
        accessorKey: keys.area,
        header: "Area (sqft)",
        size: 130,
        Footer: () => (
          <Typography sx={{ fontSize: 14, fontWeight: 800, color: "primary.main" }}>
            {totalArea ? totalArea.toLocaleString("en-IN") : "—"}
          </Typography>
        ),
        Cell: ({ row }: any) => (
          <TextField
            fullWidth size="small" sx={inputSx} type="number" placeholder="0"
            value={row.original[keys.area] || ""}
            onChange={(e) => nonNegative(e.target.value) && updateRow(row.index, row.original, { [keys.area]: e.target.value })}
          />
        ),
      },
      {
        accessorKey: "costType",
        header: "Cost Type",
        size: 150,
        Cell: ({ row }: any) => (
          <TextField
            select fullWidth size="small" sx={inputSx}
            value={row.original.costType ?? ""}
            onChange={(e) => updateRow(row.index, row.original, { costType: e.target.value })}
            SelectProps={{ displayEmpty: true }}
          >
            <MenuItem value="">Select</MenuItem>
            <MenuItem value={keys.RATE}>Rate</MenuItem>
            <MenuItem value={keys.LUMPSUM}>Lumpsum</MenuItem>
          </TextField>
        ),
      },
      {
        accessorKey: "rate",
        header: "Rate",
        size: 130,
        Cell: ({ row }: any) =>
          String(row.original.costType) === keys.LUMPSUM ? (
            <Typography sx={{ fontSize: 13, color: "text.disabled" }}>N/A (Lumpsum)</Typography>
          ) : (
            <TextField
              fullWidth size="small" sx={inputSx} type="number" placeholder="0.00"
              value={row.original.rate || ""}
              onChange={(e) => nonNegative(e.target.value) && updateRow(row.index, row.original, { rate: e.target.value })}
            />
          ),
      },
      {
        id: "cost",
        header: "Calculated Cost",
        size: 170,
        accessorFn: (r: any) => (String(r.costType) === keys.LUMPSUM ? r[keys.lumpsumCost] : r[keys.rateCost]),
        Cell: ({ row }: any) =>
          String(row.original.costType) === keys.LUMPSUM ? (
            <TextField
              fullWidth size="small" sx={inputSx} type="number" placeholder="Enter Cost"
              value={row.original[keys.lumpsumCost] || ""}
              onChange={(e) =>
                nonNegative(e.target.value) && setFieldValue(`${arrayPath}.${row.index}.${keys.lumpsumCost}`, e.target.value)
              }
            />
          ) : (
            <TextField
              fullWidth size="small" sx={inputSx} placeholder="Calculated"
              value={row.original[keys.rateCost] || ""}
              InputProps={{ readOnly: true }}
            />
          ),
        Footer: () => (
          <Typography sx={{ fontSize: 14, fontWeight: 800, color: "primary.main" }}>
            {formatCurrencyDecimal(grandTotal)}
          </Typography>
        ),
      },
      {
        id: "actions",
        header: "",
        size: 60,
        enableSorting: false,
        Cell: ({ row }: any) => (
          <WtIconButton color="#dc2626" title="Delete Row" onClick={() => removeRow(row.index)} sx={{ width: 34, height: 34 }}>
            <Delete fontSize="small" />
          </WtIconButton>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [arrayPath, grandTotal, totalArea, items.length],
  );

  return (
    <div>
      <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2} sx={{ mb: 2, pb: 1.5, borderBottom: 1, borderColor: "divider" }}>
        <Typography sx={{ fontSize: 15, fontWeight: 700, color: "text.primary" }}>{title}</Typography>
        <WtButton tone="accent" size="small" ghost startIcon={<Add fontSize="small" />} onClick={addRow}>
          Add Commercial Row
        </WtButton>
      </Stack>
      <MaterialTable
        tableName={`commercials-${type}`}
        data={items}
        columns={columns}
        showColumnFooter
        hideFilters
        hideExportCenter
        hidePagination
        enableBottomToolbar={false}
        enableColumnSpecificSearch={false}
        enableSorting={false}
        enableColumnActions={false}
        enableGrouping={false}
        enableColumnDragging={false}
        persistPreferences={false}
      />
    </div>
  );
};
