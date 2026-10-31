// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { missingCustomFields } from './NewCompanyForm';

const sections = (fields: any[]) => [{ id: 's', title: 'S', fields }] as any;

describe('missingCustomFields (company form save gate)', () => {
  it('never reports a required BUILT-IN field — its value lives in Formik, not on the field', () => {
    // This exact case blocked every company save, twice.
    expect(missingCustomFields(sections([{ id: 'companyName', label: 'Company Name', isSystem: true, required: true }]))).toEqual({});
  });

  it('reports an empty required custom field by name', () => {
    expect(missingCustomFields(sections([{ id: 'gst', label: 'GST Certificate', required: true, value: '' }])))
      .toEqual({ gst: 'GST Certificate is required' });
  });

  it('ignores hidden and filled-in custom fields', () => {
    expect(missingCustomFields(sections([
      { id: 'a', label: 'A', required: true, hidden: true },
      { id: 'b', label: 'B', required: true, value: 'x' },
    ]))).toEqual({});
  });
});
