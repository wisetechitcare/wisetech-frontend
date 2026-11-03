import { useMemo, useState } from "react";
import {
  Download,
  Filter,
  Mail,
  MoreHorizontal,
  Plus,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { Button } from "@/ds/ui/button";
import { Badge } from "@/ds/ui/badge";
import { Card, CardFooter } from "@/ds/ui/card";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/ds/ui/input-group";
import { Item, ItemActions, ItemContent, ItemTitle } from "@/ds/ui/item";
import { Tabs, TabsList, TabsTrigger } from "@/ds/ui/tabs";
import { Checkbox } from "@/ds/ui/checkbox";
import { Avatar, AvatarFallback } from "@/ds/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/ds/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/ds/ui/dropdown-menu";
import { PageHeader } from "@/ds/patterns/page-header";
import { initials, PEOPLE, STATUS_META, type Person } from "./fixtures";

const VIEWS = [
  "All people",
  "Engineering",
  "On leave today",
  "New joiners",
] as const;

export function EmployeesScreen({ onOpen }: { onOpen: (p: Person) => void }) {
  const [view, setView] = useState<(typeof VIEWS)[number]>("All people");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const rows = useMemo(() => {
    let r = PEOPLE;
    if (view === "Engineering")
      r = r.filter((p) => p.department === "Engineering");
    if (view === "On leave today") r = r.filter((p) => p.status === "leave");
    if (view === "New joiners") r = r.filter((p) => p.joined.endsWith("2024"));
    if (q)
      r = r.filter((p) =>
        `${p.name} ${p.role} ${p.id}`.toLowerCase().includes(q.toLowerCase()),
      );
    return r;
  }, [view, q]);

  const allChecked = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const toggleAll = () =>
    setSelected(allChecked ? new Set() : new Set(rows.map((r) => r.id)));
  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <div className="space-y-5 p-6">
      <PageHeader
        title="Employees"
        description="248 people across 4 branches"
        actions={
          <>
            <Button variant="outline">
              <Download data-icon="inline-start" /> Export
            </Button>
            <Button>
              <Plus data-icon="inline-start" /> Add employee
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Tabs
          value={view}
          onValueChange={(v) => setView(v as (typeof VIEWS)[number])}
        >
          <TabsList variant="line" aria-label="Saved views">
            {VIEWS.map((v) => (
              <TabsTrigger key={v} value={v}>
                {v}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Button variant="ghost" size="sm" className="ml-auto">
          <Plus data-icon="inline-start" /> Save view
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <InputGroup className="max-w-xs">
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
          <InputGroupInput
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, role or ID"
            aria-label="Search employees"
          />
        </InputGroup>
        <Button variant="outline" size="sm">
          <Filter data-icon="inline-start" /> Department
        </Button>
        <Button variant="outline" size="sm">
          <Filter data-icon="inline-start" /> Status
        </Button>
        <Button variant="ghost" size="sm" className="ml-auto">
          <SlidersHorizontal data-icon="inline-start" /> Columns
        </Button>
      </div>

      {selected.size > 0 && (
        <Item variant="muted" size="sm">
          <ItemContent>
            <ItemTitle>{selected.size} selected</ItemTitle>
          </ItemContent>
          <ItemActions>
            <Button size="sm" variant="outline">
              <Mail data-icon="inline-start" /> Email
            </Button>
            <Button size="sm" variant="outline">
              <Download data-icon="inline-start" /> Export
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelected(new Set())}
              aria-label="Clear selection"
            >
              <X data-icon="inline-start" /> Clear
            </Button>
          </ItemActions>
        </Item>
      )}

      <Card className="gap-0 py-0">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={allChecked}
                  onCheckedChange={toggleAll}
                  aria-label="Select all"
                />
              </TableHead>
              <TableHead>Employee</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Today</TableHead>
              <TableHead className="text-right">Leave left</TableHead>
              <TableHead className="w-10">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((p) => (
              <TableRow
                key={p.id}
                data-state={selected.has(p.id) ? "selected" : undefined}
                className="cursor-pointer"
                onClick={() => onOpen(p)}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selected.has(p.id)}
                    onCheckedChange={() => toggle(p.id)}
                    aria-label={`Select ${p.name}`}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback className="bg-accent text-xs font-semibold text-accent-foreground">
                        {initials(p.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{p.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {p.role} · {p.id}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {p.department}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {p.location}
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_META[p.status].variant} dot>
                    {STATUS_META[p.status].label}
                  </Badge>
                </TableCell>
                <TableCell className="tabular text-right font-medium">
                  {p.leave.toFixed(1)}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Actions for ${p.name}`}
                        />
                      }
                    >
                      <MoreHorizontal />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onOpen(p)}>
                        View profile
                      </DropdownMenuItem>
                      <DropdownMenuItem>Send email</DropdownMenuItem>
                      <DropdownMenuItem variant="destructive">
                        Deactivate
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <CardFooter className="justify-between border-t py-3 text-xs text-muted-foreground">
          <span className="tabular">Showing {rows.length} of 248</span>
          <div className="flex gap-1.5">
            <Button variant="outline" size="sm" disabled>
              Previous
            </Button>
            <Button variant="outline" size="sm">
              Next
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
