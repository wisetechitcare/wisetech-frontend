import React, { useState, useEffect } from 'react';
import { Formik, Form as FormikForm, Field, useFormikContext } from 'formik';
import { useOrgScope } from '@hooks/useOrgScope';
import * as Yup from 'yup';
// import NumberInput from '../inputs/NumberInput'; // Commented out - replaced with fiscal year selector
import TextInput from '../inputs/TextInput';
import { fetchAllPrefixSettings, createPrefixSetting, updatePrefixSetting } from '@services/options';
import { fetchCompanyOverview } from '@services/company';
import { successConfirmation } from '@utils/modal';
import Flatpickr from "react-flatpickr";
import { canonicalFiscalYear } from '@utils/fiscalYearSegment';

// Format a Date object to "YYYY-MM-DD" — used when storing fiscal year range in the DB.
// We do NOT use Intl.DateTimeFormat here because en-IN locale produces "DD/MM/YYYY"
// which cannot be parsed back by new Date() reliably.
export const toISODateString = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// Props interface simplified - parent only needs to provide type information
interface PrefixSettingsFormProps {
  typeLabel: string; // e.g. 'Lead', 'Project', 'Company'
  typeValue: string; // e.g. 'LEAD', 'PROJECT', 'COMPANY' (enum value)
  onSuccess?: () => void; // Optional callback on successful save
  /**
   * Scope the setting to one organization instead of the single global row.
   *
   * Used by LEAD, where each organization numbers its leads under its own prefix
   * (WISETECH MEP → WT/OFFER, Associates → WTA/OFFER). PROJECT and COMPANY leave
   * this off and keep editing the one global row they have always used.
   */
  perOrganization?: boolean;
}

export interface PrefixSetting {
  id: string;
  year: string;
  prefix: string;
  identifier: string;
  /**
   * How the year is PRINTED in this series' numbers — a `FiscalYearFormat`.
   * null/absent means "YY-YY", what every number rendered before the shape was
   * configurable. Display only: the server keys its counter on the canonical
   * form, so changing this never renumbers anything.
   */
  yearFormat?: string | null;
  /** null on the global/default row; set on an organization's own row. */
  organizationId?: string | null;
  /**
   * Sequence sharing. null = this organization runs its own counter. When set,
   * its numbers come out of THAT organization's counter, so the two run one
   * continuous series — each still keeps its own prefix string.
   */
  sequenceSourceOrganizationId?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PrefixSettingsFormValues {
  year: string;
  prefix: string;
  identifier: string;
  organizationId?: string | null;
  id?: string;
}

// Generate default fiscal year (April to March of next year)
export const getDefaultFiscalYear = () => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1; // getMonth() returns 0-11, so add 1
  if (currentMonth >= 4) {
    // Current fiscal year: April current year to March next year
    return `${currentYear}-04-01 to ${currentYear + 1}-03-31`;
  } else {
    // Previous fiscal year: April previous year to March current year
    return `${currentYear - 1}-04-01 to ${currentYear}-03-31`;
  }
};

// Parse a date string to a Date object, handling both storage formats:
//   "YYYY-MM-DD"  (correct format, what we save now)
//   "DD/MM/YYYY"  (legacy format saved by en-IN dateFormatter bug)
const parseDateString = (str: string): Date => {
  const trimmed = str.trim();
  // DD/MM/YYYY  e.g. "01/04/2026"
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
    const [dd, mm, yyyy] = trimmed.split('/');
    return new Date(`${yyyy}-${mm}-${dd}`);
  }
  // YYYY-MM-DD  e.g. "2026-04-01"
  return new Date(trimmed);
};

/**
 * The short year segment for a stored fiscal-year string.
 *
 * Kept as a named export because three other modules import it from here, but the
 * parsing now lives in `@utils/fiscalYearSegment` — ONE implementation, shared with
 * the Lead/Project/Bill prefix screens and algorithmically identical to the
 * backend's. It renders the canonical "26-27"; a caller that wants the shape an
 * admin configured passes that row's `yearFormat` to `formatFiscalYearSegment`.
 */
export const convertFiscalYearToYearFormat = (fiscalYear: string) =>
  canonicalFiscalYear(fiscalYear);

// Convert fiscal year date range to date objects for Flatpickr
export const convertFiscalYearToDates = (fiscalYear: string): Date[] => {
  if (fiscalYear.includes(' to ')) {
    const [startDate, endDate] = fiscalYear.split(' to ');
    return [parseDateString(startDate), parseDateString(endDate)];
  }
  return [];
};

// Convert old year format to full date format (for backward compatibility)
const convertOldYearFormatToFullDate = (yearFormat: string): string => {
  if (yearFormat.includes('-') && !yearFormat.includes(' to ')) {
    // Old format like "2030-2031", convert to full date format
    const [startYear, endYear] = yearFormat.split('-');
    return `${startYear}-04-01 to ${endYear}-03-31`;
  }
  // Already in full format or invalid format
  return yearFormat;
};

/**
 * Live "this is what your numbers will look like" line, built from the values
 * currently in the form rather than from what is saved — so the effect of an
 * edit is visible before it is committed. The trailing 001 is illustrative; the
 * real sequence continues from whatever the organization has already issued.
 */
const PrefixPreview: React.FC<{ typeLabel: string; organizationName: string }> = ({
  typeLabel,
  organizationName,
}) => {
  const { values } = useFormikContext<PrefixSettingsFormValues>();
  const prefix = (values.prefix || '').trim();
  if (!prefix) return null;

  const shortYear = convertFiscalYearToYearFormat(values.year || '');
  const sample = shortYear ? `${prefix}/${shortYear}/001` : `${prefix}/001`;

  return (
    <div className="mt-2">
      <span className="text-muted fs-8 me-2">Preview</span>
      <span className="fw-bold text-gray-800">{sample}</span>
      <span className="text-muted fs-8 ms-2">
        {organizationName
          ? `— format used for new ${typeLabel.toLowerCase()}s in ${organizationName}`
          : `— format used for new ${typeLabel.toLowerCase()}s`}
      </span>
    </div>
  );
};

const PrefixSettingsForm: React.FC<PrefixSettingsFormProps> = ({
  typeLabel,
  typeValue,
  onSuccess,
  perOrganization = false,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [currentPrefix, setCurrentPrefix] = useState<PrefixSetting | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [companyFiscalYear, setCompanyFiscalYear] = useState<string>('');

  // Which organization's setting is on screen. Reuses the shared org-scope hook
  // rather than fetching organizations again; includeAll is off because a prefix
  // always belongs to exactly one organization, and the holding root is dropped
  // because records are numbered under the operating sub-organizations.
  const orgScope = useOrgScope({ includeAll: false, initialScopeId: '', subOrgsOnly: true });
  const selectedOrgId = perOrganization ? orgScope.scopeId : '';
  const selectedOrgName = orgScope.selected?.name ?? '';

  // Default to the first organization so the form is never stranded on an empty
  // selection the user has to discover.
  useEffect(() => {
    if (perOrganization && !orgScope.scopeId && orgScope.organizations.length) {
      orgScope.setScopeId(orgScope.organizations[0].id);
    }
  }, [perOrganization, orgScope.scopeId, orgScope.organizations, orgScope.setScopeId]);

  const validationSchema = Yup.object().shape({
    year: Yup.string()
      .required('Fiscal year is required'),
    prefix: Yup.string()
      .required('Prefix is required')
      .max(20, 'Max 20 characters'),
    identifier: Yup.string().required(),
  });

  // Fetch existing prefix setting for this type and company fiscal year
  useEffect(() => {
    // Per-organization mode has nothing to load until an organization is chosen.
    if (perOrganization && !selectedOrgId) return;

    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        // Fetch both prefix settings and company overview
        const [prefixResponse, companyResponse] = await Promise.all([
          fetchAllPrefixSettings(),
          fetchCompanyOverview()
        ]);
        // Match on organization too, so switching organizations shows that
        // organization's own row and never edits another's by mistake. A missing
        // row is a real state here (nothing configured yet), not an error.
        const prefixForType = prefixResponse.data?.prefixSettings.find(
          (prefix: PrefixSetting) =>
            prefix.identifier === typeValue &&
            (perOrganization
              ? prefix.organizationId === selectedOrgId
              : !prefix.organizationId)
        );
        setCurrentPrefix(prefixForType || null);
        // Set company fiscal year (keep in full date format)
        if (companyResponse.data?.companyOverview?.fiscalYear) {
          setCompanyFiscalYear(companyResponse.data.companyOverview.fiscalYear);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [typeValue, perOrganization, selectedOrgId]);

  const handleSubmit = async (values: PrefixSettingsFormValues) => {
    try {
      setIsLoading(true);
      setError(null);

      if (currentPrefix?.id) {
        // Update existing
        await updatePrefixSetting(currentPrefix.id, values);
      } else {
        // Create new
        await createPrefixSetting(values);
      }
      if (onSuccess) {
        onSuccess?.(); // Call success callback if provided
      } else {
        successConfirmation('Prefix settings saved successfully');
      }
    } catch (err) {
      console.error('Error saving prefix settings:', err);
      setError('Failed to save prefix settings');
      throw err; // Let Formik know there was an error
    } finally {
      setIsLoading(false);
    }
  };

  const initialValues: PrefixSettingsFormValues = {
    year: currentPrefix?.year
      ? convertOldYearFormatToFullDate(currentPrefix.year)
      : companyFiscalYear || getDefaultFiscalYear(),
    prefix: currentPrefix?.prefix || '',
    identifier: typeValue,
    ...(perOrganization ? { organizationId: selectedOrgId } : {}),
    ...(currentPrefix?.id ? { id: currentPrefix.id } : {}),
  };

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={validationSchema}
      enableReinitialize
      onSubmit={handleSubmit}
    >
      {({ isSubmitting, errors, touched }) => (
        <FormikForm>
          {isLoading && !isSubmitting && (
            <div className="text-center mb-4">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          )}
          
          {error && (
            <div className="alert alert-danger mb-4" role="alert">
              {error}
            </div>
          )}

          {/* Which organization's prefix is being edited. Shown first because it
              scopes everything below it. */}
          <div className="row">
            {/* Which organization's prefix is being edited. Shown first because it
                scopes everything below it. */}
            {perOrganization && (
              <div className="col-md-3 mb-4">
                <label className="form-label">
                  Organization <span className="text-danger">*</span>
                </label>
                <select
                  className="form-select"
                  value={selectedOrgId}
                  onChange={(e) => orgScope.setScopeId(e.target.value)}
                  disabled={orgScope.isLoading}
                >
                  {orgScope.selectOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {!currentPrefix && !isLoading && selectedOrgId && (
                  <div className="text-warning mt-1 fs-8 fw-semibold">
                    No {typeLabel.toLowerCase()} prefix configured for {selectedOrgName} yet.
                  </div>
                )}
              </div>
            )}

            {/* Type (readonly) */}
            <div className={perOrganization ? "col-md-3 mb-4" : "col-md-4 mb-4"}>
              <label className="form-label">Type</label>
              <input
                className="form-control"
                value={typeLabel}
                readOnly
                name="identifier"
                type="text"
              />
            </div>

            {/* Fiscal Year (date range picker) */}
            <div className={perOrganization ? "col-md-3 mb-4" : "col-md-4 mb-4"}>
              <label className="form-label">Fiscal Year <span className="text-danger">*</span></label>
              <Field name="year">
                {({ field, form }: any) => (
                  <>
                    <Flatpickr
                      value={field.value ? convertFiscalYearToDates(field.value) : (companyFiscalYear ? convertFiscalYearToDates(companyFiscalYear) : [])}
                      className={`form-control ${errors.year && touched.year ? 'is-invalid' : ''}`}
                      placeholder={companyFiscalYear ? `Current: ${convertFiscalYearToYearFormat(companyFiscalYear)}` : "Set Fiscal Year"}
                      onChange={(selectedDates: Date[]) => {
                        if (selectedDates.length === 2) {
                          const startDate = toISODateString(selectedDates[0]);
                          const endDate = toISODateString(selectedDates[1]);
                          form.setFieldValue("year", `${startDate} to ${endDate}`);
                          form.setFieldTouched("year", false);
                        }
                      }}
                      onOpen={() => {
                        form.setFieldTouched("year", true);
                      }}
                      options={{
                        dateFormat: "Y-m-d",
                        altInput: true,
                        altFormat: "d/m/Y", // ← shows "01/04/2026 to 31/03/2027"
                        enableTime: false,
                        mode: 'range'
                      }}
                    />
                    {errors.year && touched.year && (
                      <div className="text-danger mt-1">{errors.year}</div>
                    )}
                  </>
                )}
              </Field>
            </div>

            {/* Prefix (text) */}
            <div className={perOrganization ? "col-md-3 mb-4" : "col-md-4 mb-4"}>
              <TextInput
                isRequired={true}
                formikField="prefix"
                label="Prefix"
                placeholder={`Enter ${typeLabel} Prefix`}
              />
            </div>
          </div>

          {/* What the configured prefix + year actually produce, so the format is
              confirmed before saving rather than discovered on the first lead. */}
          <PrefixPreview typeLabel={typeLabel} organizationName={perOrganization ? selectedOrgName : ''} />

          <div className="mt-4">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting || isLoading || (perOrganization && !selectedOrgId)}
            >
              {currentPrefix ? 'Update' : 'Create'} Prefix
            </button>
          </div>
        </FormikForm>
      )}
    </Formik>
  );
};

export default PrefixSettingsForm;
