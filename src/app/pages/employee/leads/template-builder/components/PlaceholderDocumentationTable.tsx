import React, { useMemo, useState } from 'react';
import { Button, Form, Table } from 'react-bootstrap';
import { Copy, ChevronLeft, ChevronRight, Hash, Eye } from 'lucide-react';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import type { ProposalPlaceholder } from '../proposalPlaceholderData';

type PlaceholderDocumentationTableProps = {
  rows: ProposalPlaceholder[];
};

const pageSizeOptions = [10, 20, 50];

const copyToken = async (token: string) => {
  try {
    await navigator.clipboard.writeText(token);
    toast.success(`Copied: ${token}`);
  } catch (error) {
    toast.error('Unable to copy');
  }
};

const PlaceholderDocumentationTable: React.FC<
  PlaceholderDocumentationTableProps
> = ({ rows }) => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const normalizedPage = Math.min(page, totalPages);
  const paginatedRows = rows.slice((normalizedPage - 1) * pageSize, normalizedPage * pageSize);

  return (
    <div className="bg-white">
      <div className="table-responsive">
        <Table className="align-middle mb-0 premium-table">
          <thead>
            <tr>
              <th className="ps-8 py-5 bg-light-subtle text-muted fw-bold fs-8 text-uppercase">Placeholder Token</th>
              <th className="py-5 bg-light-subtle text-muted fw-bold fs-8 text-uppercase">Identification</th>
              <th className="py-5 bg-light-subtle text-muted fw-bold fs-8 text-uppercase">Data Type</th>
              <th className="py-5 bg-light-subtle text-muted fw-bold fs-8 text-uppercase">Preview Value</th>
              <th className="pe-8 py-5 bg-light-subtle text-end text-muted fw-bold fs-8 text-uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="border-top-0">
            <AnimatePresence mode="popLayout">
              {paginatedRows.map((row, index) => (
                <motion.tr
                  key={row.token}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="hover-bg-light"
                >
                  <td className="ps-8 py-6">
                    <button
                      type="button"
                      onClick={() => copyToken(row.token)}
                      className="token-pill"
                    >
                      <code>{row.token}</code>
                      <Copy size={12} className="opacity-50" />
                    </button>
                  </td>
                  <td className="py-6">
                    <div className="d-flex flex-column">
                      <span className="fw-bolder text-gray-800 fs-7">{row.label}</span>
                      <span className="text-muted fs-9 mt-1 line-clamp-1" style={{ maxWidth: '300px' }}>
                        {row.description}
                      </span>
                    </div>
                  </td>
                  <td className="py-6">
                    <span className={`type-badge ${row.type.toLowerCase()}`}>
                      {row.type}
                    </span>
                  </td>
                  <td className="py-6">
                    <span className="text-gray-600 fw-medium fs-7 opacity-75">
                      {row.exampleValue}
                    </span>
                  </td>
                  <td className="pe-8 py-6 text-end">
                    <div className="d-flex justify-content-end gap-2">
                       <Button 
                        variant="light-primary" 
                        size="sm" 
                        className="btn-icon rounded-pill w-30px h-30px"
                        onClick={() => copyToken(row.token)}
                        title="Copy to clipboard"
                       >
                         <Copy size={14} />
                       </Button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </Table>

        {rows.length === 0 && (
          <div className="p-20 text-center">
            <div className="mb-5 opacity-20">
              <Hash size={60} className="mx-auto" />
            </div>
            <h4 className="fw-bold text-gray-400">No tokens match your search</h4>
            <p className="text-muted fs-7">Try using broader search terms or clear your filters.</p>
          </div>
        )}
      </div>

      {/* Modern Pagination */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-center px-8 py-6 border-top bg-light-subtle">
        <div className="d-flex align-items-center gap-4 mb-4 mb-md-0">
          <span className="text-muted fs-8 fw-bold text-uppercase letter-spacing-1">
            Displaying {paginatedRows.length} of {rows.length} tokens
          </span>
          <Form.Select
            size="sm"
            className="w-80px rounded-pill bg-white border-gray-300 fs-8 fw-bold"
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
          >
            {pageSizeOptions.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </Form.Select>
        </div>

        <div className="d-flex align-items-center gap-2">
          <Button
            variant="white"
            size="sm"
            className="btn-icon rounded-pill shadow-sm border"
            disabled={normalizedPage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft size={16} />
          </Button>
          
          <div className="d-flex gap-1">
            {[...Array(totalPages)].map((_, i) => {
              const p = i + 1;
              if (totalPages > 5 && Math.abs(p - normalizedPage) > 2 && p !== 1 && p !== totalPages) {
                if (p === 2 || p === totalPages - 1) return <span key={p} className="px-2 text-muted">...</span>;
                return null;
              }
              return (
                <Button
                  key={p}
                  variant={normalizedPage === p ? "primary" : "white"}
                  size="sm"
                  className={`w-30px h-30px rounded-pill p-0 fs-8 fw-bold ${normalizedPage === p ? 'shadow-sm' : 'border'}`}
                  onClick={() => setPage(p)}
                >
                  {p}
                </Button>
              );
            })}
          </div>

          <Button
            variant="white"
            size="sm"
            className="btn-icon rounded-pill shadow-sm border"
            disabled={normalizedPage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            <ChevronRight size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PlaceholderDocumentationTable;