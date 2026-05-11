export type PlaceholderValueType =
  | 'Text'
  | 'Date'
  | 'Number'
  | 'Area'
  | 'Currency'
  | 'Percentage'
  | 'Duration'
  | 'List';

export type ProposalPlaceholder = {
  key: string;
  token: string;
  label: string;
  sectionId: string;
  sectionTitle: string;
  group: string;
  type: PlaceholderValueType;
  exampleValue: string;
  description: string;
  formatting: string;
  dynamicBehavior: string;
  required: boolean;
  docxSafe: boolean;
  pdfSafe: boolean;
  revisionSafe: boolean;
};

export type PlaceholderSection = {
  id: string;
  title: string;
  description: string;
  groups: string[];
  exportNotes: string[];
  placeholders: ProposalPlaceholder[];
};

type PlaceholderInput = Omit<ProposalPlaceholder, 'token' | 'sectionId' | 'sectionTitle' | 'docxSafe' | 'pdfSafe' | 'revisionSafe'>;

const tokenFor = (key: string) => `{ ${key} }`;

const createPlaceholder = (
  sectionId: string,
  sectionTitle: string,
  input: PlaceholderInput
): ProposalPlaceholder => ({
  ...input,
  sectionId,
  sectionTitle,
  token: tokenFor(input.key),
  docxSafe: true,
  pdfSafe: true,
  revisionSafe: true,
});

const textPlaceholder = (
  key: string,
  label: string,
  group: string,
  exampleValue: string,
  description: string,
  required = false
): PlaceholderInput => ({
  key,
  label,
  group,
  type: 'Text',
  exampleValue,
  description,
  formatting: 'Plain text. Preserve casing from source data and avoid manual punctuation inside the token.',
  dynamicBehavior: 'Resolved from inquiry, lead, client, company, project, or template metadata at export time.',
  required,
});

const datePlaceholder = (
  key: string,
  label: string,
  group: string,
  exampleValue: string,
  description: string,
  required = false
): PlaceholderInput => ({
  key,
  label,
  group,
  type: 'Date',
  exampleValue,
  description,
  formatting: 'Date value formatted by the proposal export engine. Keep the token on one line for DOCX/PDF output.',
  dynamicBehavior: 'Resolved at render time from inquiry dates, current date, or configured completion data.',
  required,
});

const numberPlaceholder = (
  key: string,
  label: string,
  group: string,
  exampleValue: string,
  description: string,
  required = false
): PlaceholderInput => ({
  key,
  label,
  group,
  type: 'Number',
  exampleValue,
  description,
  formatting: 'Numeric value. The export engine keeps the placeholder atomic and applies formatting from the template.',
  dynamicBehavior: 'Calculated or read from the proposal configuration during dynamic replacement.',
  required,
});

const areaPlaceholder = (
  key: string,
  label: string,
  group: string,
  exampleValue: string,
  description: string,
  required = false
): PlaceholderInput => ({
  key,
  label,
  group,
  type: 'Area',
  exampleValue,
  description,
  formatting: 'Area value. Pair with the matching unit placeholder where the document needs a unit suffix.',
  dynamicBehavior: 'Resolved from project area, commercial rows, or calculated project totals.',
  required,
});

const currencyPlaceholder = (
  key: string,
  label: string,
  group: string,
  exampleValue: string,
  description: string,
  required = false
): PlaceholderInput => ({
  key,
  label,
  group,
  type: 'Currency',
  exampleValue,
  description,
  formatting: 'Currency-ready value. Keep the placeholder separate from surrounding symbols for export-safe formatting.',
  dynamicBehavior: 'Calculated from costing blocks, payment percentages, or the total project summary.',
  required,
});

const percentagePlaceholder = (
  key: string,
  label: string,
  group: string,
  exampleValue: string,
  description: string,
  required = false
): PlaceholderInput => ({
  key,
  label,
  group,
  type: 'Percentage',
  exampleValue,
  description,
  formatting: 'Percentage value. Add the percent sign in the template text only when the exported data excludes it.',
  dynamicBehavior: 'Resolved from revision-safe payment stage configuration.',
  required,
});

const durationPlaceholder = (
  key: string,
  label: string,
  group: string,
  exampleValue: string,
  description: string,
  required = false
): PlaceholderInput => ({
  key,
  label,
  group,
  type: 'Duration',
  exampleValue,
  description,
  formatting: 'Duration value. Keep year and month placeholders separate for clean DOCX/PDF layout.',
  dynamicBehavior: 'Resolved from configured proposal completion rules and area based mappings.',
  required,
});

const listPlaceholder = (
  key: string,
  label: string,
  group: string,
  exampleValue: string,
  description: string,
  required = false
): PlaceholderInput => ({
  key,
  label,
  group,
  type: 'List',
  exampleValue,
  description,
  formatting: 'Comma-separated or template-formatted list value. Use in paragraph-safe or table-safe locations.',
  dynamicBehavior: 'Joined from related service, category, or sub category collections at export time.',
  required,
});

const buildSection = (
  id: string,
  title: string,
  description: string,
  groups: string[],
  exportNotes: string[],
  inputs: PlaceholderInput[]
): PlaceholderSection => ({
  id,
  title,
  description,
  groups,
  exportNotes,
  placeholders: inputs.map((input) => createPlaceholder(id, title, input)),
});

export const placeholderSections: PlaceholderSection[] = [
  buildSection(
    'inquiry-proposal-information',
    'Inquiry & Proposal Information',
    'Core inquiry, proposal, revision, author, and template metadata used throughout the proposal lifecycle.',
    ['Inquiry & Proposal Information'],
    [
      'Use these placeholders in cover pages, headers, revision blocks, and proposal audit trails.',
      'Revision fields are stable across regenerated DOCX/PDF exports.',
    ],
    [
      textPlaceholder('inquiry_no', 'Inquiry No', 'Inquiry & Proposal Information', 'INQ-2026-0042', 'Internal inquiry or lead tracking number.', true),
      datePlaceholder('inquiry_date', 'Inquiry Date', 'Inquiry & Proposal Information', '09 May 2026', 'Date when the inquiry was received.'),
      datePlaceholder('date', 'Date', 'Inquiry & Proposal Information', '09/05/2026', 'Current proposal date or export date.'),
      datePlaceholder('formatted_date', 'Formatted Date', 'Inquiry & Proposal Information', '09 May, 2026', 'Human-readable export date.'),
      numberPlaceholder('revision_no', 'Revision No', 'Inquiry & Proposal Information', '03', 'Current revision number of the proposal.', true),
      textPlaceholder('lead_name', 'Lead Name', 'Inquiry & Proposal Information', 'Corporate Office Fit-Out', 'Lead name associated with the proposal.'),
      textPlaceholder('project_name', 'Project Name', 'Inquiry & Proposal Information', 'Corporate Office Renovation', 'Project name used in formal proposal copy.', true),
      textPlaceholder('project_description', 'Project Description', 'Inquiry & Proposal Information', 'Complete HVAC and Electrical design for new headquarters.', 'Full description or summary of the project.'),
      textPlaceholder('status', 'Status', 'Inquiry & Proposal Information', 'In Progress', 'Current lead or proposal status.'),
      textPlaceholder('created_by', 'Created By', 'Inquiry & Proposal Information', 'Priya Shah', 'Employee or user who prepared the proposal.'),
      textPlaceholder('template_name', 'Template Name', 'Inquiry & Proposal Information', 'Standard Commercial Proposal', 'Selected export template name.'),
      textPlaceholder('assigned_to_name', 'Assigned To (Name)', 'Inquiry & Proposal Information', 'Santhana Kumar', 'WiseTech employee handling this project.'),
      textPlaceholder('assigned_to_email', 'Assigned To (Email)', 'Inquiry & Proposal Information', 'santhana@wisetech.com', 'Email of the WiseTech handler.'),
      textPlaceholder('assigned_to_phone', 'Assigned To (Phone)', 'Inquiry & Proposal Information', '9876543210', 'Phone number of the WiseTech handler.'),
      textPlaceholder('assigned_to_designation', 'Assigned To (Designation)', 'Inquiry & Proposal Information', 'Sr. Design Engineer', 'Title/Designation of the WiseTech handler.'),
      datePlaceholder('current_day', 'Current Day', 'Inquiry & Proposal Information', '11', 'Current day of the month (DD).'),
      datePlaceholder('current_month', 'Current Month (Num)', 'Inquiry & Proposal Information', '05', 'Current month number (MM).'),
      datePlaceholder('current_month_name', 'Current Month (Name)', 'Inquiry & Proposal Information', 'May', 'Current month full name.'),
      datePlaceholder('current_year', 'Current Year', 'Inquiry & Proposal Information', '2026', 'Current year (YYYY).'),
    ]
  ),
  buildSection(
    'client-company-information',
    'Client & Company Information',
    'Client, contact, and sender organization fields used in opening letters, address blocks, and signature blocks.',
    ['Client & Company Information'],
    [
      'Use client fields exactly as written to avoid sender/client ambiguity.',
      'Contact fields remain revision-safe even when the proposal is exported again.',
    ],
    [
      textPlaceholder('company_name', 'Company Name', 'Client & Company Information', 'Acme Workspace Private Limited', 'Client company or organization name.', true),
      textPlaceholder('client_name', 'Client Name', 'Client & Company Information', 'Acme Workspace Private Limited', 'Client display name used in greetings and summaries.', true),
      textPlaceholder('contact_person', 'Contact Person', 'Client & Company Information', 'Rahul Mehta', 'Primary contact person for the proposal.'),
      textPlaceholder('contact_name', 'Contact Name', 'Client & Company Information', 'Rahul Mehta', 'Named contact for address and correspondence blocks.'),
      textPlaceholder('contact_title', 'Contact Title (Mr/Ms)', 'Client & Company Information', 'Mr', 'Gender-based title for greetings.'),
      textPlaceholder('contact_title_2', 'Contact Title (Sir/Madam)', 'Client & Company Information', 'Sir', 'Formal gender-based title.'),
      textPlaceholder('contact_email', 'Contact Email', 'Client & Company Information', 'rahul@acme.com', 'Email address of the primary contact.'),
      textPlaceholder('contact_phone', 'Contact Phone', 'Client & Company Information', '9820012345', 'Phone number of the primary contact.'),
      textPlaceholder('contact_designation', 'Contact Designation', 'Client & Company Information', 'Director', 'Professional title of the contact.'),
      textPlaceholder('sender_company', 'Sender Company', 'Client & Company Information', 'WiseTech Consultancy', 'Company issuing the proposal.'),
      textPlaceholder('company_website', 'Company Website', 'Client & Company Information', 'www.acme.com', 'Client company website.'),
      textPlaceholder('company_email', 'Company Email', 'Client & Company Information', 'info@acme.com', 'Client company general email.'),
      textPlaceholder('company_phone', 'Company Phone', 'Client & Company Information', '022-12345678', 'Client company general phone number.'),
    ]
  ),
  buildSection(
    'project-area-building-information',
    'Project Area & Building Information',
    'Project size, unit, and building detail placeholders used in scope and technical summary sections.',
    ['Project Area & Building Information'],
    [
      'Keep area value and unit placeholders adjacent only when both are needed.',
      'Do not merge area and unit into one custom placeholder.',
    ],
    [
      areaPlaceholder('plot_area', 'Plot Area', 'Project Area & Building Information', '12000', 'Project plot area.'),
      textPlaceholder('plot_area_unit', 'Plot Area Unit', 'Project Area & Building Information', 'sq ft', 'Measurement unit for plot area.'),
      areaPlaceholder('built_up_area', 'Built-Up Area', 'Project Area & Building Information', '8500', 'Built-up area for the project.'),
      textPlaceholder('built_up_area_unit', 'Built-Up Area Unit', 'Project Area & Building Information', 'sq ft', 'Measurement unit for built-up area.'),
      textPlaceholder('building_detail', 'Building Detail', 'Project Area & Building Information', 'Basement + Ground + 8 Floors', 'Building configuration or structure detail.'),
    ]
  ),
  buildSection(
    'project-location-information',
    'Project Location Information',
    'Structured project location fields for address, locality, city, state, postal, and country output.',
    ['Project Location Information'],
    [
      'Use structured fields instead of one long manual address when the template needs column or line control.',
      'Address fields are safe for DOCX tables and PDF paragraph rendering.',
    ],
    [
      textPlaceholder('project_address', 'Project Address', 'Project Location Information', 'Plot 18, Business Park Road', 'Full or primary project address.'),
      textPlaceholder('project_location', 'Project Location', 'Project Location Information', 'Bandra Kurla Complex', 'Project locality or named location.', true),
      textPlaceholder('locality', 'Locality', 'Project Location Information', 'BKC', 'Locality or neighborhood.'),
      textPlaceholder('city', 'City', 'Project Location Information', 'Mumbai', 'Project city.', true),
      textPlaceholder('state', 'State', 'Project Location Information', 'Maharashtra', 'Project state.', true),
      textPlaceholder('zip_code', 'Zip Code', 'Project Location Information', '400051', 'Postal or ZIP code.'),
      textPlaceholder('country', 'Country', 'Project Location Information', 'India', 'Project country.'),
    ]
  ),
  buildSection(
    'commercial-costing-sections',
    'Commercial Costing Sections',
    'Three fixed commercial costing blocks for labels, areas, cost types, rates, and calculated costs.',
    ['Commercial Block 1', 'Commercial Block 2', 'Commercial Block 3'],
    [
      'Keep each commercial block in the same table row or paragraph group to preserve export alignment.',
      'Commercial block placeholders are index-based and must not be renamed.',
    ],
    [
      textPlaceholder('commercial_1_label', 'Commercial 1 Label', 'Commercial Block 1', 'MEP Consultancy', 'Label for the first commercial item.'),
      areaPlaceholder('commercial_1_area', 'Commercial 1 Area', 'Commercial Block 1', '8500', 'Area used in the first commercial item.'),
      textPlaceholder('commercial_1_cost_type', 'Commercial 1 Cost Type', 'Commercial Block 1', 'Per Sq Ft', 'Costing type for the first commercial item.'),
      currencyPlaceholder('commercial_1_rate', 'Commercial 1 Rate', 'Commercial Block 1', '125', 'Rate for the first commercial item.'),
      currencyPlaceholder('commercial_1_cost', 'Commercial 1 Cost', 'Commercial Block 1', '1062500', 'Calculated cost for the first commercial item.'),
      textPlaceholder('commercial_2_label', 'Commercial 2 Label', 'Commercial Block 2', 'Design Coordination', 'Label for the second commercial item.'),
      areaPlaceholder('commercial_2_area', 'Commercial 2 Area', 'Commercial Block 2', '8500', 'Area used in the second commercial item.'),
      textPlaceholder('commercial_2_cost_type', 'Commercial 2 Cost Type', 'Commercial Block 2', 'Lump Sum', 'Costing type for the second commercial item.'),
      currencyPlaceholder('commercial_2_rate', 'Commercial 2 Rate', 'Commercial Block 2', '0', 'Rate for the second commercial item.'),
      currencyPlaceholder('commercial_2_cost', 'Commercial 2 Cost', 'Commercial Block 2', '250000', 'Calculated cost for the second commercial item.'),
      textPlaceholder('commercial_3_label', 'Commercial 3 Label', 'Commercial Block 3', 'Site Visits', 'Label for the third commercial item.'),
      areaPlaceholder('commercial_3_area', 'Commercial 3 Area', 'Commercial Block 3', '8500', 'Area used in the third commercial item.'),
      textPlaceholder('commercial_3_cost_type', 'Commercial 3 Cost Type', 'Commercial Block 3', 'Per Visit', 'Costing type for the third commercial item.'),
      currencyPlaceholder('commercial_3_rate', 'Commercial 3 Rate', 'Commercial Block 3', '15000', 'Rate for the third commercial item.'),
      currencyPlaceholder('commercial_3_cost', 'Commercial 3 Cost', 'Commercial Block 3', '180000', 'Calculated cost for the third commercial item.'),
    ]
  ),
  buildSection(
    'project-area-breakdown',
    'Project Area Breakdown',
    'Three fixed project area rows that mirror export-safe area labels, area values, cost types, rates, and totals.',
    ['Project Area 1', 'Project Area 2', 'Project Area 3'],
    [
      'Use these placeholders when the proposal needs a project area costing table separate from commercial blocks.',
      'Do not mix project area indexes across table columns.',
    ],
    [
      textPlaceholder('project_area_1_label', 'Project Area 1 Label', 'Project Area 1', 'Office Area', 'Label for the first project area row.'),
      areaPlaceholder('project_area_1_area', 'Project Area 1 Area', 'Project Area 1', '5000', 'Area value for the first project area row.'),
      textPlaceholder('project_area_1_cost_type', 'Project Area 1 Cost Type', 'Project Area 1', 'Per Sq Ft', 'Cost type for the first project area row.'),
      currencyPlaceholder('project_area_1_rate', 'Project Area 1 Rate', 'Project Area 1', '125', 'Rate for the first project area row.'),
      currencyPlaceholder('project_area_1_cost', 'Project Area 1 Cost', 'Project Area 1', '625000', 'Calculated cost for the first project area row.'),
      textPlaceholder('project_area_2_label', 'Project Area 2 Label', 'Project Area 2', 'Common Area', 'Label for the second project area row.'),
      areaPlaceholder('project_area_2_area', 'Project Area 2 Area', 'Project Area 2', '2500', 'Area value for the second project area row.'),
      textPlaceholder('project_area_2_cost_type', 'Project Area 2 Cost Type', 'Project Area 2', 'Per Sq Ft', 'Cost type for the second project area row.'),
      currencyPlaceholder('project_area_2_rate', 'Project Area 2 Rate', 'Project Area 2', '110', 'Rate for the second project area row.'),
      currencyPlaceholder('project_area_2_cost', 'Project Area 2 Cost', 'Project Area 2', '275000', 'Calculated cost for the second project area row.'),
      textPlaceholder('project_area_3_label', 'Project Area 3 Label', 'Project Area 3', 'Service Area', 'Label for the third project area row.'),
      areaPlaceholder('project_area_3_area', 'Project Area 3 Area', 'Project Area 3', '1000', 'Area value for the third project area row.'),
      textPlaceholder('project_area_3_cost_type', 'Project Area 3 Cost Type', 'Project Area 3', 'Lump Sum', 'Cost type for the third project area row.'),
      currencyPlaceholder('project_area_3_rate', 'Project Area 3 Rate', 'Project Area 3', '0', 'Rate for the third project area row.'),
      currencyPlaceholder('project_area_3_cost', 'Project Area 3 Cost', 'Project Area 3', '180000', 'Calculated cost for the third project area row.'),
    ]
  ),
  buildSection(
    'total-project-summary',
    'Total Project Summary',
    'Final total area and total cost placeholders for summaries, commercial notes, and closing blocks.',
    ['Total Project Summary'],
    [
      'Use these fields for final summary blocks and not for intermediate row calculations.',
      'Totals are export-safe in PDF and DOCX summary tables.',
    ],
    [
      areaPlaceholder('total_project_area', 'Total Project Area', 'Total Project Summary', '8500', 'Total calculated project area.'),
      areaPlaceholder('total_area', 'Total Area', 'Total Project Summary', '8500', 'Alias-style total area for summary sections.'),
      areaPlaceholder('area', 'Area (Short Token)', 'Total Project Summary', '8500', 'Short alias for total project area.'),
      currencyPlaceholder('total_project_cost', 'Total Project Cost', 'Total Project Summary', '1492500', 'Final estimated cost for the proposal.', true),
      textPlaceholder('total_cost_in_words', 'Total Cost (Words)', 'Total Project Summary', 'Fourteen Lakh Ninety Two Thousand Five Hundred Only', 'Project cost converted to formal Indian currency words.'),
      textPlaceholder('total_offer_cost_in_words', 'Total Offer Cost (Words)', 'Total Project Summary', 'Fourteen Lakh Ninety Two Thousand Five Hundred Only', 'Formal word representation of the offer amount.'),
    ]
  ),
  buildSection(
    'services-information',
    'Services Information',
    'Service list and indexed service placeholders for scope, inclusions, and proposal summaries.',
    ['Services Information'],
    [
      'Use the indexed placeholders when fixed table rows are required.',
      'Use the aggregate services placeholder for paragraph or comma-separated output.',
    ],
    [
      listPlaceholder('services', 'Services', 'Services Information', 'MEP Design, HVAC, Electrical', 'Combined services list.'),
      textPlaceholder('service_1', 'Service 1', 'Services Information', 'MEP Design', 'First service.'),
      textPlaceholder('service_2', 'Service 2', 'Services Information', 'HVAC', 'Second service.'),
      textPlaceholder('service_3', 'Service 3', 'Services Information', 'Electrical', 'Third service.'),
      textPlaceholder('service_4', 'Service 4', 'Services Information', 'Fire Fighting', 'Fourth service.'),
      textPlaceholder('service_5', 'Service 5', 'Services Information', 'Plumbing', 'Fifth service.'),
      textPlaceholder('service_6', 'Service 6', 'Services Information', 'ELV', 'Sixth service.'),
    ]
  ),
  buildSection(
    'categories-information',
    'Categories Information',
    'Category list and indexed category placeholders used for classification, scope, and reporting.',
    ['Categories Information'],
    [
      'Indexed category placeholders keep fixed DOCX tables stable.',
      'The aggregate categories placeholder is best for paragraph-safe summaries.',
    ],
    [
      textPlaceholder('category_1', 'Category 1', 'Categories Information', 'Commercial', 'First category.'),
      textPlaceholder('category_2', 'Category 2', 'Categories Information', 'Interior', 'Second category.'),
      textPlaceholder('category_3', 'Category 3', 'Categories Information', 'MEP', 'Third category.'),
      textPlaceholder('category_4', 'Category 4', 'Categories Information', 'Design', 'Fourth category.'),
      textPlaceholder('category_5', 'Category 5', 'Categories Information', 'Execution', 'Fifth category.'),
      textPlaceholder('category_6', 'Category 6', 'Categories Information', 'Consultancy', 'Sixth category.'),
      listPlaceholder('categories', 'Categories', 'Categories Information', 'Commercial, Interior, MEP', 'Combined category list.'),
    ]
  ),
  buildSection(
    'sub-categories-information',
    'Sub Categories Information',
    'Sub category list and indexed sub category placeholders for detailed service classification.',
    ['Sub Categories Information'],
    [
      'Use the exact plural form sub_categories for all sub category placeholders.',
      'Do not use singular sub_category placeholders in proposal templates.',
    ],
    [
      textPlaceholder('sub_categories_1', 'Sub Categories 1', 'Sub Categories Information', 'HVAC Design', 'First sub category.'),
      textPlaceholder('sub_categories_2', 'Sub Categories 2', 'Sub Categories Information', 'Electrical Design', 'Second sub category.'),
      textPlaceholder('sub_categories_3', 'Sub Categories 3', 'Sub Categories Information', 'Plumbing Design', 'Third sub category.'),
      textPlaceholder('sub_categories_4', 'Sub Categories 4', 'Sub Categories Information', 'Fire Fighting', 'Fourth sub category.'),
      textPlaceholder('sub_categories_5', 'Sub Categories 5', 'Sub Categories Information', 'ELV Systems', 'Fifth sub category.'),
      listPlaceholder('sub_categories', 'Sub Categories', 'Sub Categories Information', 'HVAC Design, Electrical Design, Plumbing Design', 'Combined sub category list.'),
    ]
  ),
  buildSection(
    'payment-stages-percentage-breakdown',
    'Payment Stages & Percentage Breakdown',
    'Six revision-safe payment stages with stage names, percentage values, and calculated amounts.',
    ['Payment Stage 1', 'Payment Stage 2', 'Payment Stage 3', 'Payment Stage 4', 'Payment Stage 5', 'Payment Stage 6'],
    [
      'Payment percentages should total 100 percent in production templates.',
      'Stage amount placeholders are calculated from total project cost and the configured percentage.',
    ],
    [
      textPlaceholder('stage_1_name', 'Stage 1 Name', 'Payment Stage 1', 'Advance', 'Name of payment stage 1.'),
      percentagePlaceholder('percentage_1_value', 'Percentage 1 Value', 'Payment Stage 1', '10', 'Percentage assigned to payment stage 1.'),
      currencyPlaceholder('stage_1_amount', 'Stage 1 Amount', 'Payment Stage 1', '149250', 'Calculated amount for payment stage 1.'),
      textPlaceholder('stage_2_name', 'Stage 2 Name', 'Payment Stage 2', 'Design Concept', 'Name of payment stage 2.'),
      percentagePlaceholder('percentage_2_value', 'Percentage 2 Value', 'Payment Stage 2', '20', 'Percentage assigned to payment stage 2.'),
      currencyPlaceholder('stage_2_amount', 'Stage 2 Amount', 'Payment Stage 2', '298500', 'Calculated amount for payment stage 2.'),
      textPlaceholder('stage_3_name', 'Stage 3 Name', 'Payment Stage 3', 'Design Development', 'Name of payment stage 3.'),
      percentagePlaceholder('percentage_3_value', 'Percentage 3 Value', 'Payment Stage 3', '20', 'Percentage assigned to payment stage 3.'),
      currencyPlaceholder('stage_3_amount', 'Stage 3 Amount', 'Payment Stage 3', '298500', 'Calculated amount for payment stage 3.'),
      textPlaceholder('stage_4_name', 'Stage 4 Name', 'Payment Stage 4', 'Tendering', 'Name of payment stage 4.'),
      percentagePlaceholder('percentage_4_value', 'Percentage 4 Value', 'Payment Stage 4', '20', 'Percentage assigned to payment stage 4.'),
      currencyPlaceholder('stage_4_amount', 'Stage 4 Amount', 'Payment Stage 4', '298500', 'Calculated amount for payment stage 4.'),
      textPlaceholder('stage_5_name', 'Stage 5 Name', 'Payment Stage 5', 'Execution Support', 'Name of payment stage 5.'),
      percentagePlaceholder('percentage_5_value', 'Percentage 5 Value', 'Payment Stage 5', '20', 'Percentage assigned to payment stage 5.'),
      currencyPlaceholder('stage_5_amount', 'Stage 5 Amount', 'Payment Stage 5', '298500', 'Calculated amount for payment stage 5.'),
      textPlaceholder('stage_6_name', 'Stage 6 Name', 'Payment Stage 6', 'Handover', 'Name of payment stage 6.'),
      percentagePlaceholder('percentage_6_value', 'Percentage 6 Value', 'Payment Stage 6', '10', 'Percentage assigned to payment stage 6.'),
      currencyPlaceholder('stage_6_amount', 'Stage 6 Amount', 'Payment Stage 6', '149250', 'Calculated amount for payment stage 6.'),
    ]
  ),
  buildSection(
    'meeting-information',
    'Meeting Information',
    'Four meeting name/value pairs generated from configured proposal rules and project area conditions.',
    ['Meeting Information'],
    [
      'Meeting placeholders are dynamic and may vary based on matched area rules.',
      'Use name and value pairs in the same table row for export-safe alignment.',
    ],
    [
      textPlaceholder('meeting_1_name', 'Meeting 1 Name', 'Meeting Information', 'Design Review', 'Name of meeting item 1.'),
      numberPlaceholder('meeting_1_value', 'Meeting 1 Value', 'Meeting Information', '2', 'Meeting count or value for meeting item 1.'),
      textPlaceholder('meeting_2_name', 'Meeting 2 Name', 'Meeting Information', 'Site Coordination', 'Name of meeting item 2.'),
      numberPlaceholder('meeting_2_value', 'Meeting 2 Value', 'Meeting Information', '4', 'Meeting count or value for meeting item 2.'),
      textPlaceholder('meeting_3_name', 'Meeting 3 Name', 'Meeting Information', 'Testing and Commissioning', 'Name of meeting item 3.'),
      numberPlaceholder('meeting_3_value', 'Meeting 3 Value', 'Meeting Information', '1', 'Meeting count or value for meeting item 3.'),
      textPlaceholder('meeting_4_name', 'Meeting 4 Name', 'Meeting Information', 'Handover', 'Name of meeting item 4.'),
      numberPlaceholder('meeting_4_value', 'Meeting 4 Value', 'Meeting Information', '1', 'Meeting count or value for meeting item 4.'),
    ]
  ),
  buildSection(
    'project-completion-information',
    'Project Completion Information',
    'Completion duration and date placeholders used in proposal schedules and closing summaries.',
    ['Completion Information'],
    [
      'Completion duration is generated from configured area rules where available.',
      'Use completion date in schedule summaries and keep duration values separate for clarity.',
    ],
    [
      durationPlaceholder('completion_years', 'Completion Years', 'Completion Information', '1', 'Completion duration in years.'),
      durationPlaceholder('completion_months', 'Completion Months', 'Completion Information', '8', 'Completion duration in months.', true),
      datePlaceholder('completion_date', 'Completion Date', 'Completion Information', '31 Dec 2027', 'Estimated completion date.'),
    ]
  ),
];

export const allPlaceholders: ProposalPlaceholder[] = placeholderSections.flatMap((section) => section.placeholders);

export const placeholderTokens = allPlaceholders.map((placeholder) => placeholder.token);

export const placeholderKeys = allPlaceholders.map((placeholder) => placeholder.key);

export const placeholderMap = new Map(allPlaceholders.map((placeholder) => [placeholder.token, placeholder]));

export const placeholderKeyMap = new Map(allPlaceholders.map((placeholder) => [placeholder.key, placeholder]));

export const sampleValues = allPlaceholders.reduce<Record<string, string>>((acc, placeholder) => {
  acc[placeholder.key] = placeholder.exampleValue;
  acc[placeholder.token] = placeholder.exampleValue;
  return acc;
}, {});

export const documentationSectionTitles = [
  'Introduction',
  'Placeholder Format',
  'Template Health Summary',
  'Inquiry & Proposal Information',
  'Client & Company Information',
  'Project Area & Building Information',
  'Project Location Information',
  'Commercial Costing Sections',
  'Project Area Breakdown',
  'Total Project Summary',
  'Services Information',
  'Categories Information',
  'Sub Categories Information',
  'Payment Stages & Percentage Breakdown',
  'Meeting Information',
  'Project Completion Information',
  'Invalid Syntax Examples',
  'Valid Syntax Examples',
  'Placeholder Usage Rules',
  'Dynamic Replacement Process',
  'Example Closing Letter Block',
  'Conclusion',
];

export const placeholderFormatRules = [
  'Every placeholder must use a single opening curly brace, one internal space, the lowercase snake_case key, one internal space, and a single closing curly brace.',
  'Only exact string matching is supported. A placeholder is valid only when it matches the registered token exactly.',
  'Placeholder names must remain lowercase and use underscores between words.',
  'Do not use double braces, camelCase, hyphens, dots, brackets, or missing internal spaces.',
  'Do not add styling inside the placeholder text. Apply styling to the surrounding DOCX/PDF template text.',
  'Keep every placeholder atomic. Do not split a placeholder across runs, text boxes, or table cells.',
];

export const usageRules = [
  'Use placeholders exactly as documented, including the opening brace, trailing brace, and single internal spaces.',
  'Use only supported placeholders from the library. Unsupported placeholders are blocked by export validation.',
  'For indexed data, keep the index number tied to the same row or group. For example, stage_1_name, percentage_1_value, and stage_1_amount should remain together.',
  'For area and commercial tables, do not mix commercial block placeholders with project area breakdown placeholders unless the template intentionally has separate sections.',
  'Use aggregate list placeholders such as services, categories, and sub_categories only where comma-separated output is acceptable.',
  'Use indexed placeholders where fixed DOCX table rows are required.',
  'Before exporting, run validation and clear invalid syntax, duplicate warnings, and unsupported placeholders.',
  'For revisions, keep placeholder syntax unchanged so regenerated files remain compatible with stored proposal data.',
];

export const dynamicReplacementSteps = [
  'Parse the template text and collect every brace-based placeholder candidate.',
  'Validate each candidate against exact string matching, lowercase rules, snake_case rules, curly brace rules, and internal spacing rules.',
  'Compare valid placeholders with the registered proposal placeholder library.',
  'Build the replacement dictionary from inquiry, client, project, commercial, payment, meeting, and completion data.',
  'Replace exact placeholders with formatted values while preserving surrounding DOCX/PDF styling.',
  'Highlight unresolved, unsupported, duplicate, or malformed placeholders before export.',
  'Generate revision-safe DOCX/PDF output and keep the placeholder manifest stable for future revisions.',
];

export const invalidSyntaxExamples = [
  {
    example: 'inquiry_no',
    reason: 'Missing braces',
    correction: '{ inquiry_no }',
  },
  {
    example: '{{ inquiry_no }}',
    reason: 'Double braces',
    correction: '{ inquiry_no }',
  },
  {
    example: '{ inquiryNo }',
    reason: 'camelCase placeholder',
    correction: '{ inquiry_no }',
  },
  {
    example: '{inquiry_no}',
    reason: 'Missing spaces',
    correction: '{ inquiry_no }',
  },
  {
    example: '{ inquiry-no }',
    reason: 'Wrong underscores',
    correction: '{ inquiry_no }',
  },
  {
    example: '{ inquiry.no }',
    reason: 'Invalid characters',
    correction: '{ inquiry_no }',
  },
  {
    example: '{ client_company_name }',
    reason: 'Unsupported placeholder',
    correction: '{ company_name }',
  },
];

export const validSyntaxExamples = [
  '{ inquiry_no }',
  '{ client_name }',
  '{ project_name }',
  '{ project_location }',
  '{ plot_area }',
  '{ built_up_area }',
  '{ total_project_cost }',
  '{ completion_months }',
];

export const closingLetterTemplate = `Dear { client_name },

Thank you for your inquiry regarding the project "{ project_name }".

Project Location : { project_location }, { city }, { state }

Plot Area : { plot_area } { plot_area_unit }

Built-Up Area : { built_up_area } { built_up_area_unit }

Estimated Cost : { total_project_cost }

Est. Completion : { completion_months } Months

Prepared By : { created_by }

Regards,
{ sender_company }`;

export const exportRequirements = [
  'DOCX export requires exact placeholder syntax and single-line placeholder runs.',
  'PDF export requires no unresolved or malformed placeholders before rendering.',
  'AWS storage compatibility requires stable template manifests and revision-safe placeholder keys.',
  'Proposal tables must avoid overflow by keeping placeholders inside predictable table cells.',
  'Page breaks should remain outside placeholder tokens and inside document layout sections.',
  'Margins and print-safe spacing are preserved when placeholder tokens are replaced with values.',
  'High-quality rendering depends on validating syntax before storing or exporting templates.',
];
