import fs from 'fs';

const path = 'src/app/modules/common/components/MaterialTableImpl.tsx';
let s = fs.readFileSync(path, 'utf8');

function replaceBetween(src, startMarker, endMarker, replacement) {
  const start = src.indexOf(startMarker);
  if (start < 0) throw new Error(`start not found: ${startMarker.slice(0, 60)}`);
  const end = src.indexOf(endMarker, start);
  if (end < 0) throw new Error(`end not found after start: ${endMarker.slice(0, 60)}`);
  return src.slice(0, start) + replacement + src.slice(end);
}

// ── Mobile: Column Selector + Search Input + status (through status block) ──
s = replaceBetween(
  s,
  '                  {/* Column Selector */}',
  '                </div>\n              )}\n            </div>\n          )}\n\n        {/* Result count for assistive tech.',
  `                  {/* Column scope + search — kit WtField (SSOT). */}
                  <div style={{ marginBottom: "16px" }}>
                    <WtField
                      label="Column"
                      size="sm"
                      fullWidth
                      value={selectedSearchColumn || "all"}
                      onChange={handleSearchColumnChange}
                      options={columnSelectOptions}
                    />
                  </div>
                  <div style={{ marginBottom: "16px" }}>
                    <WtField
                      label="Search"
                      size="sm"
                      fullWidth
                      icon="magnifier"
                      clearable
                      value={globalFilterValue}
                      onChange={handleGlobalFilterChange}
                      placeholder={
                        searchPlaceholder && selectedSearchColumn === "all"
                          ? searchPlaceholder
                          : \`Search in \${
                              columnSelectOptions.find((opt) => opt.value === selectedSearchColumn)?.label
                              || "All Columns"
                            }…\`
                      }
                    />
                  </div>

                  {globalFilterValue && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: "6px",
                        fontSize: "13px",
                        color: "#6B7280",
                        padding: "10px 14px",
                        backgroundColor: "#FEF2F2",
                        borderRadius: "8px",
                        border: "1px solid #FECACA",
                      }}
                    >
                      <span>Found</span>
                      <strong style={{ color: "#1E3A8A", fontSize: "14px" }}>
                        {filteredData.length}
                      </strong>
                      <span>result{filteredData.length !== 1 ? "s" : ""} in</span>
                      <strong style={{ color: "#374151" }}>
                        {columnSelectOptions.find((opt) => opt.value === selectedSearchColumn)?.label
                          || "All Columns"}
                      </strong>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

        {/* Result count for assistive tech.`,
);

// ── Desktop toolbar: from local columnSelectOptions rebuild through end of search Box ──
s = replaceBetween(
  s,
  '              // Desktop view: Show both dropdowns normally\n              const columnSelectOptions = [',
  '                  {renderTopToolbarRightActions?.()}',
  `              // Desktop view: kit WtField for column scope + search (same SSOT as forms).
              const currentValue = columnSelectOptions.find(
                (opt) => opt.value === selectedSearchColumn,
              );

              return (
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "10px 16px",
                    flexWrap: "wrap",
                    position: "relative",
                    zIndex: 1000,
                  }}
                >
                  <Box sx={{ minWidth: "150px", maxWidth: "200px" }}>
                    <WtField
                      label="Column"
                      size="sm"
                      fullWidth
                      value={selectedSearchColumn || "all"}
                      onChange={handleSearchColumnChange}
                      options={columnSelectOptions}
                    />
                  </Box>

                  <Box sx={{ minWidth: "220px", maxWidth: "320px", flex: "1 1 220px" }}>
                    <WtField
                      ariaLabel="Search table"
                      size="sm"
                      fullWidth
                      icon="magnifier"
                      clearable
                      value={globalFilterValue}
                      onChange={handleGlobalFilterChange}
                      placeholder={
                        searchPlaceholder && (!currentValue || currentValue.value === "all")
                          ? searchPlaceholder
                          : \`Search in \${currentValue?.label || "All Columns"}…\`
                      }
                    />
                  </Box>

                  {renderTopToolbarRightActions?.()}`,
);

if (s.includes('SelectInput')) {
  console.error('SelectInput still present after patch');
  process.exit(1);
}
if (!s.includes('import { WtField }')) {
  console.error('WtField import missing');
  process.exit(1);
}

fs.writeFileSync(path, s);
console.log('Patched MaterialTableImpl search controls → WtField');
