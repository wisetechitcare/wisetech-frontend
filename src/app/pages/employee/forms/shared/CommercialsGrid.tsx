import React from "react";
import { useFormikContext } from "formik";
import { Plus, Ruler, Trash2 } from "lucide-react";
import { formatCurrencyDecimal } from "@utils/currency";
import { Button } from "@/ds/ui/button";
import { Input } from "@/ds/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ds/ui/select";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/ds/ui/table";
import { EmptyState } from "@/ds/patterns/empty-state";

interface CommercialsGridProps {
  type: "lead" | "project";
  /** Card heading; the Add Row button sits at its right. */
  title?: string;
}

/** Select has no empty value, so "no cost type yet" is this sentinel. */
const NONE = "__none__";

export const CommercialsGrid: React.FC<CommercialsGridProps> = ({ type, title = "Commercial Work Areas" }) => {
  const { values, setFieldValue, setFieldError } = useFormikContext<any>();

  const isLead = type === "lead";
  const arrayPath = isLead ? "projectAreas" : "commercials";
  const items: any[] = values[arrayPath] || [];

  const keys = isLead
    ? { area: "projectArea", rate: "rate", rateCost: "cost", lumpsumCost: "cost", RATE: "1", LUMPSUM: "2" }
    : { area: "area", rate: "rate", rateCost: "rateCost", lumpsumCost: "lumpsumCost", RATE: "RATE", LUMPSUM: "LUMPSUM" };

  const costTypes = [
    { value: NONE, label: "Select" },
    { value: keys.RATE, label: "Rate" },
    { value: keys.LUMPSUM, label: "Lumpsum" },
  ];

  const grandTotal = items.reduce((sum, item) => {
    const costType = String(item.costType);
    if (costType === keys.RATE) return sum + (parseFloat(item[keys.rateCost]) || 0);
    if (costType === keys.LUMPSUM) return sum + (parseFloat(item[keys.lumpsumCost]) || 0);
    return sum;
  }, 0);

  // Area is summed over every row that has one, regardless of cost type — a work area is
  // measured whether it is priced per sqft or as a lump sum.
  const totalArea = items.reduce((sum, item) => sum + (parseFloat(item[keys.area]) || 0), 0);

  // `row` is the row as it stands now; `patch` is the field being typed.
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

  const removeRow = (index: number) => setFieldValue(arrayPath, items.filter((_, i) => i !== index));

  const addButton = (
    <Button type="button" variant="outline" size="sm" onClick={addRow}>
      <Plus data-icon="inline-start" />
      Add Commercial Row
    </Button>
  );

  return (
    <section data-slot="commercials-grid" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="m-0 text-sm font-semibold text-foreground">{title}</h3>
        {items.length > 0 && addButton}
      </div>

      {items.length === 0 ? (
        <EmptyState
          size="sm"
          icon={<Ruler />}
          title="No work areas yet"
          description="Add a row for each area you are pricing, by rate per sqft or as a lump sum."
          action={addButton}
        />
      ) : (
        <div className="overflow-hidden rounded-2xl ring-1 ring-border">
          <Table className="min-w-[760px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[26%]">Label</TableHead>
                <TableHead className="w-[16%]">Area (sqft)</TableHead>
                <TableHead className="w-[16%]">Cost Type</TableHead>
                <TableHead className="w-[14%]">Rate</TableHead>
                <TableHead className="w-[20%]">Calculated Cost</TableHead>
                <TableHead className="w-12"><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((row, i) => {
                const isLumpsum = String(row.costType) === keys.LUMPSUM;
                return (
                  <TableRow key={i}>
                    <TableCell>
                      <Input
                        aria-label={`Row ${i + 1} label`} placeholder="e.g. Basement Ground"
                        value={row.label || ""}
                        onChange={(e) => setFieldValue(`${arrayPath}.${i}.label`, e.target.value)}
                        className="h-9"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        aria-label={`Row ${i + 1} area`} type="number" min={0} placeholder="0"
                        value={row[keys.area] || ""}
                        onChange={(e) => nonNegative(e.target.value) && updateRow(i, row, { [keys.area]: e.target.value })}
                        className="h-9"
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        items={costTypes}
                        value={row.costType ? String(row.costType) : NONE}
                        onValueChange={(v) => updateRow(i, row, { costType: v === NONE ? "" : String(v) })}
                      >
                        <SelectTrigger className="h-9 w-full" aria-label={`Row ${i + 1} cost type`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {costTypes.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {isLumpsum ? (
                        <span className="text-sm text-muted-foreground">N/A (Lumpsum)</span>
                      ) : (
                        <Input
                          aria-label={`Row ${i + 1} rate`} type="number" min={0} placeholder="0.00"
                          value={row.rate || ""}
                          onChange={(e) => nonNegative(e.target.value) && updateRow(i, row, { rate: e.target.value })}
                          className="h-9"
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      {isLumpsum ? (
                        <Input
                          aria-label={`Row ${i + 1} cost`} type="number" min={0} placeholder="Enter cost"
                          value={row[keys.lumpsumCost] || ""}
                          onChange={(e) => nonNegative(e.target.value) && setFieldValue(`${arrayPath}.${i}.${keys.lumpsumCost}`, e.target.value)}
                          className="h-9"
                        />
                      ) : (
                        <Input
                          aria-label={`Row ${i + 1} calculated cost`} readOnly placeholder="Calculated"
                          value={row[keys.rateCost] || ""}
                          className="h-9 bg-muted/60"
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button" variant="tinted" size="icon-sm" title="Delete row" aria-label={`Delete row ${i + 1}`}
                        style={{ "--tint": "var(--cta-danger)" } as React.CSSProperties}
                        onClick={() => removeRow(i)}
                      >
                        <Trash2 />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell className="text-xs font-bold tracking-wider text-primary uppercase">Grand total</TableCell>
                <TableCell className="font-bold text-primary tabular-nums">{totalArea ? totalArea.toLocaleString("en-IN") : "—"}</TableCell>
                <TableCell colSpan={2} />
                <TableCell className="font-bold text-primary tabular-nums">{formatCurrencyDecimal(grandTotal)}</TableCell>
                <TableCell />
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      )}
    </section>
  );
};
