import React, { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Button, Col, Form, Modal, Row } from "react-bootstrap";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  ClipboardCheck,
  Copy,
  Download,
  Printer,
  RefreshCw,
  Search,
  Layout,
  FileText,
  ShieldCheck,
  Zap,
  Info,
  CheckCircle2,
  XCircle,
  Hash,
  Filter,
  ChevronRight,
} from "lucide-react";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { PageTitle } from "@metronic/layout/core";
import { KTIcon } from "@metronic/helpers";

import {
  allPlaceholders,
  closingLetterTemplate,
  documentationSectionTitles,
  dynamicReplacementSteps,
  exportRequirements,
  invalidSyntaxExamples,
  placeholderFormatRules,
  placeholderSections,
  usageRules,
  validSyntaxExamples,
  type ProposalPlaceholder,
} from "./proposalPlaceholderData";

import {
  buildDocumentationManifest,
  getHighlightedSegments,
  renderTemplatePreview,
  validateTemplate,
} from "./proposalTemplateEngine";

import "./TemplateDocumentationBuilderPage.css";

const PlaceholderDocumentationTable = lazy(
  () => import("./components/PlaceholderDocumentationTable"),
);

const TEMPLATE_STORAGE_KEY = "proposal-template-documentation-live-draft";

const documentationBreadcrumbs = [
  { title: "QC", path: "/qc/leads", isSeparator: false, isActive: false },
  { title: "Leads", path: "/qc/leads", isSeparator: false, isActive: false },
];

const typeOptions = Array.from(
  new Set(allPlaceholders.map((p) => p.type)),
).sort();

const copyText = async (value: string, successMessage: string) => {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(successMessage);
  } catch (error) {
    toast.error("Unable to copy");
  }
};

const TemplateDocumentationBuilderPage: React.FC = () => {
  const navigate = useNavigate();
  const [globalSearch, setGlobalSearch] = useState("");
  const [sectionFilter, setSectionFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [templateDraft, setTemplateDraft] = useState(
    () => localStorage.getItem(TEMPLATE_STORAGE_KEY) || closingLetterTemplate,
  );
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    localStorage.setItem(TEMPLATE_STORAGE_KEY, templateDraft);
  }, [templateDraft]);

  const validationReport = useMemo(
    () => validateTemplate(templateDraft, documentationSectionTitles.length),
    [templateDraft],
  );

  const previewText = useMemo(
    () => renderTemplatePreview(templateDraft),
    [templateDraft],
  );

  const filteredPlaceholders = useMemo(() => {
    const norm = globalSearch.trim().toLowerCase();
    return allPlaceholders.filter((p) => {
      const matchesSection = sectionFilter === "all" || p.sectionId === sectionFilter;
      const matchesType = typeFilter === "all" || p.type === typeFilter;
      const matchesSearch = !norm || [p.token, p.label, p.description].join(" ").toLowerCase().includes(norm);
      return matchesSection && matchesType && matchesSearch;
    });
  }, [globalSearch, sectionFilter, typeFilter]);

  const resetDraft = () => {
    setTemplateDraft(closingLetterTemplate);
    toast.success("Live preview reset");
  };

  return (
    <div className="proposal-docs-page">
      {/* Premium Sticky Header */}
      <header className={`proposal-docs-header ${scrolled ? 'scrolled' : ''}`}>
        <div className="d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center gap-4">
            <motion.button 
              whileHover={{ x: -3 }}
              className="btn btn-icon btn-sm btn-light-primary"
              onClick={() => navigate(-1)}
            >
              <KTIcon iconName="arrow-left" className="fs-2" />
            </motion.button>
            <div className="proposal-icon-box">
              <BookOpen size={20} />
            </div>
            <div>
              <h1 className="proposal-docs-title">Documentation Hub</h1>
              <p className="proposal-docs-subtitle mb-0">Proposal Template Engineering Guide</p>
            </div>
          </div>
          <div className="d-flex align-items-center gap-3">
             <div className="search-container-premium d-none d-lg-block">
                <Search size={16} className="search-icon-premium" />
                <input 
                  type="text" 
                  className="search-input-premium"
                  placeholder="Quick search tokens..."
                  value={globalSearch}
                  onChange={(e) => setGlobalSearch(e.target.value)}
                />
             </div>
             <Button variant="primary" size="sm" className="fw-bold px-5 rounded-pill shadow-sm">
                <Download size={14} className="me-2" />
                Export Manifest
             </Button>
          </div>
        </div>
      </header>

      <div className="docs-layout-container">
        {/* Main Content */}
        <main className="docs-content">
          <AnimatePresence mode="wait">
            {/* Library Section */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="proposal-card"
            >
              <div className="card-header-premium">
                <h2 className="card-title-premium">
                  <Hash size={20} className="text-primary" />
                  Placeholder Library
                </h2>
                <div className="d-flex gap-3">
                  <Form.Select 
                    size="sm" 
                    className="rounded-pill px-4 bg-light border-0"
                    value={sectionFilter}
                    onChange={(e) => setSectionFilter(e.target.value)}
                    style={{ width: '200px' }}
                  >
                    <option value="all">All Sections</option>
                    {placeholderSections.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                  </Form.Select>
                  <Form.Select 
                    size="sm" 
                    className="rounded-pill px-4 bg-light border-0"
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    style={{ width: '150px' }}
                  >
                    <option value="all">All Types</option>
                    {typeOptions.map(t => <option key={t} value={t}>{t}</option>)}
                  </Form.Select>
                </div>
              </div>
              <div className="card-body-premium p-0">
                <Suspense fallback={<div className="p-10 text-center text-muted">Initializing Library...</div>}>
                  <PlaceholderDocumentationTable rows={filteredPlaceholders} />
                </Suspense>
              </div>
            </motion.div>

            {/* Playground Section */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="proposal-card"
            >
              <div className="card-header-premium">
                <h2 className="card-title-premium">
                  <Zap size={20} className="text-warning" />
                  Live Preview Lab
                </h2>
                <div className="d-flex gap-2">
                  <Button variant="light" size="sm" className="rounded-pill px-4" onClick={resetDraft}>
                    <RefreshCw size={14} className="me-2" />
                    Reset
                  </Button>
                  <Button variant="light-danger" size="sm" className="rounded-pill px-4">
                    <ClipboardCheck size={14} className="me-2" />
                    Validation Report
                  </Button>
                </div>
              </div>
              <div className="card-body-premium">
                <div className="playground-grid">
                  <div className="editor-pane">
                    <div className="pane-label"><FileText size={14} /> Template Source</div>
                    <div className="editor-box">
                      <textarea 
                        value={templateDraft}
                        onChange={(e) => setTemplateDraft(e.target.value)}
                        placeholder="Write your template here using tokens like {{client_name}}..."
                      />
                    </div>
                  </div>
                  <div className="preview-pane">
                    <div className="pane-label"><Zap size={14} /> Rendered Result</div>
                    <div className="preview-box">
                      {previewText}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Rules Section */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="proposal-card border-0 bg-transparent shadow-none"
            >
              <div className="rules-grid">
                <div className="rule-card">
                  <h3 className="rule-card-title text-success"><CheckCircle2 size={18} /> Best Practices</h3>
                  <ul className="rule-list">
                    {placeholderFormatRules.slice(0, 4).map(r => <li key={r}>{r}</li>)}
                  </ul>
                </div>
                <div className="rule-card">
                  <h3 className="rule-card-title text-danger"><XCircle size={18} /> Common Pitfalls</h3>
                  <div className="d-flex flex-column gap-3">
                    {invalidSyntaxExamples.slice(0, 3).map(ex => (
                      <div key={ex.example} className="p-3 bg-white rounded-3 border border-danger-subtle">
                         <code className="text-danger fw-bold">{ex.example}</code>
                         <div className="text-muted fs-9 mt-1">{ex.reason}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rule-card">
                  <h3 className="rule-card-title text-primary"><Layout size={18} /> Export Logic</h3>
                  <ul className="rule-list">
                    {dynamicReplacementSteps.slice(0, 4).map(r => <li key={r}>{r}</li>)}
                  </ul>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <PageTitle breadcrumbs={documentationBreadcrumbs}>
        Proposal Engineering Hub
      </PageTitle>
    </div>
  );
};

export default TemplateDocumentationBuilderPage;
