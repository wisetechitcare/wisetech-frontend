import React, { useState } from 'react';
import { Modal, Button, Table, Alert, Spinner, Badge } from 'react-bootstrap';
import { KTIcon } from '@metronic/helpers';
import { previewLeadImport, executeLeadImport, ImportPreviewResult } from '@services/leadImport';
import { successConfirmation, errorConfirmation } from '@utils/modal';
import eventBus from '@utils/EventBus';
import { EVENT_KEYS } from '@constants/eventKeys';

interface Props {
  show: boolean;
  onHide: () => void;
}

const LeadBulkImport: React.FC<Props> = ({ show, onHide }) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<ImportPreviewResult | null>(null);
  const [importing, setImporting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setPreview(null);
    }
  };

  const handlePreview = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const result = await previewLeadImport(file);
      setPreview(result);
    } catch (err: any) {
      errorConfirmation(err.message || 'Failed to parse CSV file');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!preview || preview.validRows.length === 0) return;
    setImporting(true);
    try {
      const result = await executeLeadImport(preview.validRows);
      successConfirmation(`${result.count} leads imported successfully!`);
      eventBus.emit(EVENT_KEYS.leadCreated);
      onHide();
      setPreview(null);
      setFile(null);
    } catch (err: any) {
      errorConfirmation(err.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setLoading(false);
    setImporting(false);
  };

  return (
    <Modal show={show} onHide={onHide} size="xl" centered>
      <Modal.Header closeButton>
        <Modal.Title>Bulk Import Leads</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {!preview ? (
          <div className="text-center py-10">
            <div className="mb-5">
              <label className="btn btn-outline btn-outline-dashed btn-outline-default d-flex flex-column flex-center py-10 w-100">
                <KTIcon iconName="file-up" className="fs-3x mb-3 text-primary" />
                <span className="fw-bold fs-4">Click to upload CSV file</span>
                <input type="file" accept=".csv" className="d-none" onChange={handleFileChange} />
                {file && <span className="mt-2 text-primary">{file.name}</span>}
              </label>
            </div>
            <Button 
              variant="primary" 
              onClick={handlePreview} 
              disabled={!file || loading}
              className="px-10"
            >
              {loading ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Analyzing...
                </>
              ) : 'Preview Import'}
            </Button>
          </div>
        ) : (
          <div className="import-preview">
            {preview.errors.length > 0 && (
              <Alert variant="danger" className="mb-5">
                <div className="d-flex flex-column">
                  <h4 className="mb-2">Validation Errors Found</h4>
                  <div className="scroll-y mh-200px">
                    {preview.errors.slice(0, 10).map((err, i) => (
                      <div key={i} className="mb-2 border-bottom pb-2">
                        <strong>Row {err.row}:</strong> {err.errors.join(', ')}
                        <br />
                        <small className="text-muted">Solution: {err.solution}</small>
                      </div>
                    ))}
                    {preview.errors.length > 10 && (
                      <div className="text-center fw-bold">... and {preview.errors.length - 10} more errors</div>
                    )}
                  </div>
                </div>
              </Alert>
            )}

            <div className="row mb-5">
              <div className="col-md-4">
                <div className="card bg-light-primary border-primary border-dashed p-4 h-100">
                  <h5 className="text-primary mb-3">Summary</h5>
                  <div className="d-flex justify-content-between mb-2">
                    <span>Valid Rows:</span>
                    <span className="fw-bold">{preview.validRows.length}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-2">
                    <span>Errors:</span>
                    <span className="fw-bold text-danger">{preview.errors.length}</span>
                  </div>
                </div>
              </div>
              <div className="col-md-8">
                <div className="card bg-light-info border-info border-dashed p-4 h-100">
                  <h5 className="text-info mb-3">Detected Entities</h5>
                  <div className="d-flex flex-wrap gap-2">
                    {preview.newEntities.companies.length > 0 && (
                      <Badge bg="info">New Companies: {preview.newEntities.companies.length}</Badge>
                    )}
                    {preview.newEntities.statuses.length > 0 && (
                      <Badge bg="warning">New Statuses: {preview.newEntities.statuses.length}</Badge>
                    )}
                    {preview.newEntities.projects.length > 0 && (
                      <Badge bg="success">New Projects: {preview.newEntities.projects.length}</Badge>
                    )}
                    {preview.newEntities.companies.length === 0 && 
                     preview.newEntities.statuses.length === 0 && 
                     preview.newEntities.projects.length === 0 && (
                       <span className="text-muted italic">No new entities detected.</span>
                     )}
                  </div>
                </div>
              </div>
            </div>

            <h5 className="mb-3">Data Preview (First 50 rows)</h5>
            <div className="table-responsive mh-400px scroll-y border rounded">
              <Table striped bordered hover size="sm">
                <thead className="bg-light sticky-top">
                  <tr>
                    <th>Action</th>
                    <th>Date</th>
                    <th>ID/Prefix</th>
                    <th>Title</th>
                    <th>Company</th>
                    <th>Status</th>
                    <th>Category</th>
                    <th>Service</th>
                    <th>Assigned To</th>
                    <th>Contact</th>
                    <th>Area</th>
                    <th>Rate</th>
                    <th>Cost</th>
                    <th>PO Details</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.validRows.slice(0, 50).map((row, i) => (
                    <tr key={i}>
                      <td>
                        <small className={row.existing ? 'text-warning' : 'text-success'}>
                          {row.importAction}
                        </small>
                      </td>
                      <td>{row.inquiryDate ? new Date(row.inquiryDate).toLocaleDateString() : '-'}</td>
                      <td>{row.prefix || '-'}</td>
                      <td>{row.title}</td>
                      <td>
                        {row.companyName || '-'}
                        {row.isNewCompany && <Badge bg="info" className="ms-1">New</Badge>}
                      </td>
                      <td>
                        {row.statusName || '-'}
                        {row.isNewStatus && <Badge bg="warning" className="ms-1">New</Badge>}
                      </td>
                      <td>
                        <div className="d-flex flex-column">
                          <span className="fw-bold">{row.category || '-'}</span>
                          <small className="text-muted">{row.subcategory}</small>
                        </div>
                      </td>
                      <td>{(row as any).service || '-'}</td>
                      <td>{row.assignedTo || '-'}</td>
                      <td>
                        <div className="d-flex flex-column">
                          <span>{row.contactName || '-'}</span>
                          <small className="text-muted">{row.contactPhone}</small>
                        </div>
                      </td>
                      <td>{row.area || '-'}</td>
                      <td>{row.rate || '-'}</td>
                      <td>{row.cost || '-'}</td>
                      <td>
                        <div className="d-flex flex-column">
                          <span>{row.poNumber || '-'}</span>
                          <small className="text-muted">{row.poDate ? new Date(row.poDate).toLocaleDateString() : ''}</small>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={() => { onHide(); reset(); }}>
          Cancel
        </Button>
        {preview && (
          <>
            <Button variant="outline-primary" onClick={() => setPreview(null)}>
              Change File
            </Button>
            <Button 
              variant="primary" 
              onClick={handleImport} 
              disabled={preview.validRows.length === 0 || importing}
            >
              {importing ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Importing...
                </>
              ) : `Execute Import (${preview.validRows.length} rows)`}
            </Button>
          </>
        )}
      </Modal.Footer>
    </Modal>
  );
};

export default LeadBulkImport;
