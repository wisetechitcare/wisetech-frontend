/**
 * LOCAL TEMPLATE REGISTRY
 * Defines all available MEP proposal templates loaded directly from JSON files.
 * These are used to populate the template dropdown without requiring DB records.
 */

export interface LocalTemplate {
  id: string;          // matches the JSON filename (e.g. "mep_bungalow_multi")
  templateName: string; // display label in dropdown
  templateCode: string;
  category: string;
  description?: string;
}

export const LOCAL_TEMPLATES: LocalTemplate[] = [
  {
    id: 'mep_bungalow_multi',
    templateName: 'MEP – Bungalow (Multiple / Set of Bungalows)',
    templateCode: 'mep_bungalow_multi',
    category: 'Residential',
    description: 'MEP consultancy proposal for a set / cluster of bungalows',
  },
  {
    id: 'mep_bungalow_single',
    templateName: 'MEP – Bungalow (Single)',
    templateCode: 'mep_bungalow_single',
    category: 'Residential',
    description: 'MEP consultancy proposal for a single standalone bungalow',
  },
  {
    id: 'mep_commercial',
    templateName: 'MEP – Commercial',
    templateCode: 'mep_commercial',
    category: 'Commercial',
    description: 'MEP consultancy proposal for commercial developments',
  },
  {
    id: 'mep_factory',
    templateName: 'MEP – Factory / Industrial',
    templateCode: 'mep_factory',
    category: 'Industrial',
    description: 'MEP consultancy proposal for factory / industrial projects',
  },
  {
    id: 'mep_flat',
    templateName: 'MEP – Flat / Apartment',
    templateCode: 'mep_flat',
    category: 'Residential',
    description: 'MEP consultancy proposal for flat or apartment developments',
  },
  {
    id: 'mep_hospital',
    templateName: 'MEP – Hospital / Healthcare',
    templateCode: 'mep_hospital',
    category: 'Healthcare',
    description: 'MEP consultancy proposal for hospital and healthcare facilities',
  },
  {
    id: 'mep_interior_office',
    templateName: 'MEP – Interior Office',
    templateCode: 'mep_interior_office',
    category: 'Interior',
    description: 'MEP consultancy proposal for interior office fit-outs',
  },
  {
    id: 'mep_residential',
    templateName: 'MEP – Residential (High Rise / Complex)',
    templateCode: 'mep_residential',
    category: 'Residential',
    description: 'MEP consultancy proposal for large-scale residential complexes',
  },
];
