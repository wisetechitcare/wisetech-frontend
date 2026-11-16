import React, { useMemo } from "react";
import { Autocomplete, Box, Chip, TextField, Typography } from "@mui/material";
import type { CategoryLike, SubCategoryLike } from "@utils/categoryScope";
import { PATH_SEPARATOR } from "@utils/presetTaskHierarchy";

/**
 * Which project types a payment plan bills — pick one or several.
 *
 * A type is a whole category or ONE of its subcategories, and each can belong to only one plan,
 * so a type another plan already covers is shown greyed out with that plan's name rather than
 * hidden: someone who cannot find "Villa" should be able to see WHY, and where to go to change it.
 * The server refuses a clash on save as well; this is the explanation before the mistake.
 *
 * Values are node ids (a category id, or a subcategory id) — the same convention
 * `scopeFromNodeId` reads, so the modal turns them into `{ categoryId, subCategoryId }` pairs
 * with the helper the rest of the app already uses.
 */

interface Option {
  id: string;
  /** Searchable and shown on the selected chip: "Bungalow & Duplex → Bungalow (SINGLE)". */
  path: string;
  /** What the row says inside its category group. */
  label: string;
  group: string;
  isWhole: boolean;
  /** The plan that already covers this type, or null when it is free. */
  takenBy: string | null;
}

interface Props {
  categories: CategoryLike[];
  subCategories: SubCategoryLike[];
  value: string[];
  onChange: (ids: string[]) => void;
  /** Node id → name of the plan that already covers it. The plan being edited is left out. */
  takenBy: Map<string, string>;
  disabled?: boolean;
  hasError?: boolean;
}

const PlanScopePicker: React.FC<Props> = ({ categories, subCategories, value, onChange, takenBy, disabled, hasError }) => {
  const options = useMemo<Option[]>(() => {
    const out: Option[] = [];
    for (const category of categories) {
      out.push({
        id: category.id,
        path: category.name,
        label: "Whole category",
        group: category.name,
        isWhole: true,
        takenBy: takenBy.get(category.id) ?? null,
      });
      for (const sub of subCategories.filter((s) => s.categoryId === category.id)) {
        out.push({
          id: sub.id,
          path: `${category.name}${PATH_SEPARATOR}${sub.name}`,
          label: sub.name,
          group: category.name,
          isWhole: false,
          takenBy: takenBy.get(sub.id) ?? null,
        });
      }
    }
    return out;
  }, [categories, subCategories, takenBy]);

  const selected = useMemo(() => {
    const byId = new Map(options.map((o) => [o.id, o]));
    return value.map((id) => byId.get(id)).filter((o): o is Option => !!o);
  }, [options, value]);

  return (
    <Autocomplete<Option, true, false, false>
      multiple
      size="small"
      disableCloseOnSelect
      filterSelectedOptions
      disabled={disabled}
      options={options}
      value={selected}
      groupBy={(o) => o.group}
      getOptionLabel={(o) => o.path}
      isOptionEqualToValue={(a, b) => a.id === b.id}
      getOptionDisabled={(o) => !!o.takenBy}
      onChange={(_, next) => onChange(next.map((o) => o.id))}
      noOptionsText="No matching category"
      renderTags={(tags, getTagProps) =>
        tags.map((tag, index) => {
          const { key, ...tagProps } = getTagProps({ index });
          return (
            <Chip
              key={key}
              {...tagProps}
              size="small"
              label={tag.path}
              // A selected type that someone else claimed in the meantime: say so, in red.
              color={tag.takenBy ? "error" : "default"}
              sx={{ fontWeight: 600, maxWidth: "100%" }}
            />
          );
        })
      }
      renderOption={(props, option) => {
        const { key, ...rest } = props as React.HTMLAttributes<HTMLLIElement> & { key: string };
        return (
          <li key={key} {...rest}>
            <Box sx={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
              <Typography sx={{ fontSize: 13.5, fontWeight: option.isWhole ? 600 : 500, lineHeight: 1.35 }}>
                {option.label}
              </Typography>
              {option.takenBy && (
                <Typography sx={{ fontSize: 11.5, color: "text.secondary", lineHeight: 1.3 }}>
                  Already in “{option.takenBy}”
                </Typography>
              )}
            </Box>
          </li>
        );
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          error={hasError}
          placeholder={selected.length ? "" : "Search categories & subcategories…"}
          inputProps={{ ...params.inputProps, "aria-label": "Project categories this plan bills" }}
        />
      )}
    />
  );
};

export default PlanScopePicker;
