import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, 
  Search, 
  Filter, 
  Copy, 
  CheckCircle2, 
  AlertCircle, 
  Upload, 
  Download, 
  ChevronDown, 
  ChevronRight, 
  Activity, 
  Database, 
  Layout, 
  Info, 
  Settings, 
  BookOpen, 
  Plus,
  ArrowRight,
  Code2,
  Zap,
  BarChart3,
  HelpCircle,
  Hash,
  Box,
  Layers,
  Table as TableIcon,
  CreditCard,
  Users,
  Calendar,
  Clock,
  Terminal
} from 'lucide-react';
import { useQuery } from 'react-query';
import { toast } from 'react-toastify';
import { useDropzone } from 'react-dropzone';

// Components (We will define these or use Shadcn if available, otherwise build them matching project style)
import { PageTitle } from '../../../../../_metronic/layout/core';
import { KTIcon } from '../../../../../_metronic/helpers';

// Placeholder Categories Data
const PLACEHOLDER_CATEGORIES = [
  {
    id: 'inquiry',
    title: 'Inquiry Information',
    icon: <Hash className="w-4 h-4" />,
    placeholders: [
      { key: 'inquiry_no', label: 'Inquiry Number', description: 'Internal inquiry tracking number', type: 'String', example: 'INQ-2024-001' },
      { key: 'inquiry_date', label: 'Inquiry Date', description: 'Date when the inquiry was received', type: 'Date', example: '12 May, 2024' },
      { key: 'revision_no', label: 'Revision Number', description: 'Number of times the proposal has been revised', type: 'Number', example: '0' },
      { key: 'lead_status', label: 'Lead Status', description: 'Current status of the lead', type: 'String', example: 'In Progress' },
    ]
  },
  {
    id: 'client',
    title: 'Client Information',
    icon: <Users className="w-4 h-4" />,
    placeholders: [
      { key: 'client_company_name', label: 'Company Name', description: 'Full legal name of the client company', type: 'String', example: 'Global Tech Solutions' },
      { key: 'client_contact_person', label: 'Contact Person', description: 'Primary contact person for the client', type: 'String', example: 'John Doe' },
      { key: 'client_address_line_1', label: 'Address Line 1', description: 'Primary street address', type: 'String', example: '123 Business Bay' },
      { key: 'client_address_line_2', label: 'Address Line 2', description: 'Secondary address info (City/Region)', type: 'String', example: 'Downtown, Mumbai' },
    ]
  },
  {
    id: 'project',
    title: 'Project Information',
    icon: <Layers className="w-4 h-4" />,
    placeholders: [
      { key: 'project_name', label: 'Project Name', description: 'Name of the proposed project', type: 'String', example: 'Corporate Office Renovation' },
      { key: 'project_location', label: 'Location', description: 'Specific project site location', type: 'String', example: 'BKC, Mumbai' },
      { key: 'project_type', label: 'Project Type', description: 'Category/Type of the project', type: 'String', example: 'Interior Design' },
      { key: 'built_up_area', label: 'Built-up Area', description: 'Total area of the project', type: 'Number', example: '5000 sqft' },
    ]
  },
  {
    id: 'commercial',
    title: 'Commercial Costing',
    icon: <CreditCard className="w-4 h-4" />,
    placeholders: [
      { key: 'total_project_cost', label: 'Total Project Cost', description: 'Total estimated cost for the project', type: 'Currency', example: '₹ 25,00,000.00' },
      { key: 'total_offer_cost', label: 'Total Offer Cost', description: 'Specific offer amount for the proposal', type: 'Currency', example: '₹ 22,50,000.00' },
      { key: 'commercial_1_label', label: 'Commercial Item Label', description: 'Label for the first commercial item', type: 'String', example: 'MEP Services' },
      { key: 'commercial_1_cost', label: 'Commercial Item Cost', description: 'Cost for the first commercial item', type: 'Currency', example: '₹ 5,00,000.00' },
    ]
  },
  {
    id: 'dynamic_arrays',
    title: 'Dynamic Arrays & Loops',
    icon: <TableIcon className="w-4 h-4" />,
    placeholders: [
      { key: 'fee_breakup', label: 'Fee Breakup Loop', description: 'Loop through payment stages', type: 'Array', example: '{#fee_breakup} {stage_name} - {percentage}% {/fee_breakup}' },
      { key: 'services_list', label: 'Services List', description: 'Bulleted list of all project services', type: 'Array', example: 'HVAC, Electrical, Plumbing' },
      { key: 'stage_1_name', label: 'Stage 1 Name', description: 'Direct access to first stage name', type: 'String', example: 'Design Concept' },
      { key: 'stage_1_amount', label: 'Stage 1 Amount', description: 'Direct access to first stage amount', type: 'Currency', example: '₹ 2,50,000.00' },
    ]
  }
];

const TemplateDocumentationBuilderPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [validationReport, setValidationReport] = useState<any>(null);
  const [playgroundCode, setPlaygroundCode] = useState('{{project_name}}\n{{client_company_name}}\n\nDear {{client_contact_person}},\n\nWe are pleased to submit our proposal for the {{project_name}} project located at {{project_location}}.');

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        duration: 0.5,
        staggerChildren: 0.1 
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 }
  };

  // Filtered placeholders
  const filteredCategories = useMemo(() => {
    if (!searchTerm) return PLACEHOLDER_CATEGORIES;
    return PLACEHOLDER_CATEGORIES.map(cat => ({
      ...cat,
      placeholders: cat.placeholders.filter(p => 
        p.key.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
    })).filter(cat => cat.placeholders.length > 0);
  }, [searchTerm]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(`{{${text}}}`);
    toast.success(`Copied {{${text}}} to clipboard`);
  };

  // Dropzone for DOCX Validation
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'] },
    onDrop: (files) => {
      handleFileUpload(files[0]);
    }
  });

  const handleFileUpload = (file: File) => {
    setIsUploading(true);
    // Simulate validation
    setTimeout(() => {
      setValidationReport({
        fileName: file.name,
        score: 85,
        totalPlaceholders: 12,
        validPlaceholders: 10,
        invalidPlaceholders: 2,
        missingFields: ['authorized_person_name', 'validity_date'],
        detectedSections: ['Header', 'Commercials', 'Payment Stages'],
      });
      setIsUploading(false);
      toast.success('Template validation complete');
    }, 2000);
  };

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-10 bg-[#F9FAFB] min-h-screen font-inter">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Template Documentation Builder</h1>
          <p className="text-gray-500 mt-1 text-lg">Create enterprise-grade dynamic DOCX proposal templates using intelligent placeholders.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-all shadow-sm">
            <Download className="w-4 h-4" /> Download Docs
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-[#9D4141] text-white rounded-lg font-medium hover:bg-[#8a3636] transition-all shadow-md shadow-[#9D4141]/20">
            <Plus className="w-4 h-4" /> Upload Template
          </button>
        </div>
      </div>

      {/* Quick Action Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Placeholders', value: '124+', icon: <Database className="text-blue-500" />, trend: '+5 new' },
          { label: 'Validation Health', value: '98%', icon: <Activity className="text-green-500" />, trend: 'Stable' },
          { label: 'Missing Fields', value: '12', icon: <AlertCircle className="text-amber-500" />, trend: '-2 this week' },
          { label: 'DOCX Templates', value: '45', icon: <FileText className="text-purple-500" />, trend: '+3 uploaded' },
        ].map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gray-50 rounded-xl group-hover:bg-white transition-colors">
                {React.cloneElement(stat.icon as React.ReactElement, { className: 'w-6 h-6' })}
              </div>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{stat.label}</span>
            </div>
            <div className="flex items-end justify-between">
              <h3 className="text-2xl font-bold text-gray-900">{stat.value}</h3>
              <span className={`text-xs font-medium ${stat.trend.includes('+') ? 'text-green-500' : stat.trend.includes('-') ? 'text-blue-500' : 'text-gray-400'}`}>
                {stat.trend}
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column - Documentation & Categories */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Placeholder Documentation Table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-6 border-bottom border-gray-50 bg-gray-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg shadow-xs">
                  <BookOpen className="w-5 h-5 text-[#9D4141]" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Placeholder Library</h2>
              </div>
              <div className="relative w-full md:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search placeholders..." 
                  className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#9D4141]/20 focus:border-[#9D4141] outline-none transition-all text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50/50 text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                    <th className="px-6 py-4">Placeholder Key</th>
                    <th className="px-6 py-4">Display Name</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredCategories.flatMap(cat => cat.placeholders).slice(0, 8).map((p, i) => (
                    <motion.tr 
                      key={p.key}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.05 }}
                      className="hover:bg-gray-50/80 transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <code className="px-2 py-1 bg-gray-100 text-[#9D4141] rounded-md text-xs font-mono font-medium">
                            {`{{${p.key}}}`}
                          </code>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-gray-900">{p.label}</span>
                          <span className="text-xs text-gray-500 line-clamp-1">{p.description}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-tighter ${
                          p.type === 'Currency' ? 'bg-green-50 text-green-600' :
                          p.type === 'Date' ? 'bg-blue-50 text-blue-600' :
                          p.type === 'Array' ? 'bg-purple-50 text-purple-600' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {p.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => copyToClipboard(p.key)}
                          className="p-2 text-gray-400 hover:text-[#9D4141] hover:bg-white rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
              {filteredCategories.length === 0 && (
                <div className="p-12 text-center">
                  <div className="mx-auto w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                    <Search className="w-8 h-8 text-gray-300" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">No placeholders found</h3>
                  <p className="text-gray-500">Try adjusting your search or filters to find what you're looking for.</p>
                </div>
              )}
            </div>
            
            <div className="p-4 bg-gray-50/30 border-t border-gray-50 text-center">
              <button className="text-[#9D4141] text-sm font-bold hover:underline">View All 124 Placeholders</button>
            </div>
          </div>

          {/* Categories Accordion */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-[#9D4141]" />
              Browse by Categories
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {PLACEHOLDER_CATEGORIES.map((cat) => (
                <motion.div 
                  key={cat.id}
                  whileHover={{ y: -4 }}
                  className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm cursor-pointer group hover:border-[#9D4141]/30 transition-all"
                  onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-gray-50 rounded-xl group-hover:bg-[#9D4141]/10 group-hover:text-[#9D4141] transition-colors">
                        {cat.icon}
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900">{cat.title}</h4>
                        <span className="text-xs text-gray-500">{cat.placeholders.length} active fields</span>
                      </div>
                    </div>
                    <ChevronRight className={`w-5 h-5 text-gray-300 group-hover:text-[#9D4141] transition-all ${activeCategory === cat.id ? 'rotate-90 text-[#9D4141]' : ''}`} />
                  </div>
                  
                  <AnimatePresence>
                    {activeCategory === cat.id && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden mt-4 pt-4 border-t border-gray-50"
                      >
                        <div className="flex flex-wrap gap-2">
                          {cat.placeholders.map(p => (
                            <button 
                              key={p.key}
                              onClick={(e) => { e.stopPropagation(); copyToClipboard(p.key); }}
                              className="px-3 py-1.5 bg-gray-50 hover:bg-[#9D4141]/5 border border-gray-100 hover:border-[#9D4141]/20 rounded-lg text-xs font-mono text-gray-600 hover:text-[#9D4141] transition-all flex items-center gap-2"
                            >
                              {p.key}
                              <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100" />
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column - Validator & Tools */}
        <div className="lg:col-span-4 space-y-8">
          
          {/* DOCX Validator */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-fit">
            <div className="p-6 border-bottom border-gray-50 bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg shadow-xs">
                  <Zap className="w-5 h-5 text-amber-500" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Template Validator</h2>
              </div>
              <p className="text-xs text-gray-500 mt-2">Upload your DOCX file to detect and validate placeholders instantly.</p>
            </div>
            
            <div className="p-6">
              <div 
                {...getRootProps()} 
                className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center gap-4 transition-all cursor-pointer ${
                  isDragActive ? 'border-[#9D4141] bg-[#9D4141]/5' : 'border-gray-200 hover:border-[#9D4141]/50 hover:bg-gray-50'
                }`}
              >
                <input {...getInputProps()} />
                <div className="w-16 h-16 bg-[#F2F5F8] rounded-full flex items-center justify-center">
                  <Upload className={`w-8 h-8 ${isDragActive ? 'text-[#9D4141]' : 'text-gray-400'}`} />
                </div>
                <div className="text-center">
                  <p className="font-bold text-gray-900">{isDragActive ? 'Drop it here!' : 'Click or Drag DOCX'}</p>
                  <p className="text-xs text-gray-400 mt-1">Maximum file size: 10MB</p>
                </div>
              </div>

              {isUploading && (
                <div className="mt-6 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-gray-700 italic">Analyzing structure...</span>
                    <span className="text-[#9D4141]">75%</span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: '75%' }}
                      className="h-full bg-[#9D4141]"
                    />
                  </div>
                </div>
              )}

              {validationReport && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-8 space-y-6"
                >
                  <div className="p-4 bg-gray-50 rounded-xl flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-tighter">Template Score</p>
                      <h4 className="text-2xl font-bold text-gray-900">{validationReport.score}/100</h4>
                    </div>
                    <div className="w-12 h-12 rounded-full border-4 border-[#9D4141] border-t-transparent animate-spin-slow flex items-center justify-center text-xs font-bold text-[#9D4141]">
                      {validationReport.score}%
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-[#9D4141]" />
                      Validation Summary
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 border border-gray-100 rounded-xl">
                        <span className="text-[10px] text-gray-400 uppercase block font-bold">Valid</span>
                        <span className="text-lg font-bold text-green-600">{validationReport.validPlaceholders}</span>
                      </div>
                      <div className="p-3 border border-gray-100 rounded-xl">
                        <span className="text-[10px] text-gray-400 uppercase block font-bold">Invalid</span>
                        <span className="text-lg font-bold text-red-500">{validationReport.invalidPlaceholders}</span>
                      </div>
                    </div>
                  </div>

                  {validationReport.missingFields.length > 0 && (
                    <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="w-4 h-4 text-red-500" />
                        <span className="text-xs font-bold text-red-700 uppercase">Critical Missing Fields</span>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {validationReport.missingFields.map((field: string) => (
                          <span key={field} className="px-2 py-1 bg-white border border-red-100 rounded text-[10px] font-mono text-red-600">
                            {field}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <button 
                    onClick={() => setValidationReport(null)}
                    className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-all flex items-center justify-center gap-2"
                  >
                    Generate Health Report <ArrowRight className="w-4 h-4" />
                  </button>
                </motion.div>
              )}
            </div>
          </div>

          {/* Placeholder Playground */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
             <div className="p-6 border-bottom border-gray-50 bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg shadow-xs">
                  <Terminal className="w-5 h-5 text-purple-500" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Live Playground</h2>
              </div>
              <p className="text-xs text-gray-500 mt-2">Draft and preview your template snippets in real-time.</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="relative">
                <textarea 
                  className="w-full h-48 p-4 bg-gray-900 text-gray-100 font-mono text-sm rounded-xl outline-none focus:ring-2 focus:ring-purple-500/20"
                  value={playgroundCode}
                  onChange={(e) => setPlaygroundCode(e.target.value)}
                  placeholder="Type your template here..."
                />
                <div className="absolute top-2 right-2 px-2 py-1 bg-gray-800 rounded text-[10px] font-bold text-gray-400 uppercase">
                  Markdown Support
                </div>
              </div>
              
              <div className="p-4 bg-purple-50 border border-purple-100 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                   <h5 className="text-xs font-bold text-purple-700 uppercase flex items-center gap-2">
                    <Code2 className="w-3 h-3" /> Preview
                   </h5>
                   <button className="text-[10px] text-purple-600 font-bold hover:underline">Download Snippet</button>
                </div>
                <div className="text-xs text-gray-600 leading-relaxed italic whitespace-pre-wrap">
                  {playgroundCode.replace(/\{\{(.*?)\}\}/g, (match, p1) => {
                    const found = PLACEHOLDER_CATEGORIES.flatMap(c => c.placeholders).find(p => p.key === p1);
                    return found ? `[${found.example}]` : match;
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Best Practices Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
        {[
          { title: 'Naming Conventions', desc: 'Use snake_case for all placeholder keys to ensure maximum compatibility.', icon: <Settings /> },
          { title: 'Dynamic Blocks', desc: 'Always wrap tables in {#array_key} blocks to handle multiple rows dynamically.', icon: <Layout /> },
          { title: 'Validation Standard', desc: 'Ensure all mandatory project fields are present before saving a template.', icon: <CheckCircle2 /> },
        ].map((item, i) => (
          <div key={i} className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm flex items-start gap-4 group hover:bg-[#F2F5F8]/30 transition-all">
            <div className="p-3 bg-gray-50 rounded-xl text-[#9D4141] group-hover:bg-white transition-colors">
              {React.cloneElement(item.icon as React.ReactElement, { className: 'w-6 h-6' })}
            </div>
            <div>
              <h4 className="font-bold text-gray-900 mb-1">{item.title}</h4>
              <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* FAQ Accordion Section */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-8 flex items-center gap-3">
          <HelpCircle className="w-6 h-6 text-[#9D4141]" />
          Frequently Asked Questions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {[
            { q: 'How do placeholders work?', a: 'Placeholders are variables wrapped in double curly braces {{variable_name}}. When you generate a proposal, the system replaces these with actual data from the database.' },
            { q: 'How are dynamic sections mapped?', a: 'Dynamic sections like fee breakups or meeting schedules use start/end tags. For example, {#fee_breakup} defines the start of a repeating section.' },
            { q: 'Can templates be reused across leads?', a: 'Yes! Once you upload and validate a template, it becomes available in the global library and can be used for any lead or inquiry.' },
            { q: 'How does DOCX validation work?', a: 'The system scans your uploaded file for any text matching our placeholder patterns and cross-references them with our system capabilities.' },
          ].map((faq, i) => (
            <div key={i} className="space-y-2">
              <h4 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                <span className="w-1 h-4 bg-[#9D4141] rounded-full"></span>
                {faq.q}
              </h4>
              <p className="text-gray-500 text-sm leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Documentation */}
      <div className="mt-8 border-t border-gray-200 pt-8 pb-12 flex flex-col md:flex-row items-center justify-between text-gray-400 text-sm">
        <div className="flex items-center gap-4">
          <img src="/media/logos/favicon.ico" className="w-5 h-5 grayscale opacity-50" alt="" />
          <span>&copy; 2024 WiseTech Enterprise Template Builder. All rights reserved.</span>
        </div>
        <div className="flex items-center gap-6 mt-4 md:mt-0">
          <a href="#" className="hover:text-[#9D4141] transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-[#9D4141] transition-colors">Developer API</a>
          <a href="#" className="hover:text-[#9D4141] transition-colors">Support Center</a>
        </div>
      </div>

      {/* Breadcrumbs (Using Metronic style but refined) */}
      <PageTitle breadcrumbs={[{ title: 'QC', path: '/qc/leads', isSeparator: false, isActive: false }, { title: 'Leads', path: '/qc/leads', isSeparator: false, isActive: false }]}>
        Template Documentation Builder
      </PageTitle>
    </div>
  );
};

export default TemplateDocumentationBuilderPage;
