import React, { useState, useEffect } from 'react';
import { Formik, Form as FormikForm, Field } from 'formik';
import * as Yup from 'yup';
// import NumberInput from '../inputs/NumberInput'; // Commented out - replaced with fiscal year selector
import TextInput from '../inputs/TextInput';
import { fetchAllPrefixSettings, createPrefixSetting, updatePrefixSetting } from '@services/options';
import { fetchCompanyOverview } from '@services/company';
import { successConfirmation } from '@utils/modal';
import Flatpickr from "react-flatpickr";

// Format a Date object to "YYYY-MM-DD" — used when storing fiscal year range in the DB.
// We do NOT use Intl.DateTimeFormat here because en-IN locale produces "DD/MM/YYYY"
// which cannot be parsed back by new Date() reliably.
const toISODateString = (date: Date): string => {
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
}

export interface PrefixSetting {
  id: string;
  year: string;
  prefix: string;
  identifier: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PrefixSettingsFormValues {
  year: string;
  prefix: string;
  identifier: string;
  id?: string;
}

// Generate default fiscal year (April to March of next year)
const getDefaultFiscalYear = () => {
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

// Utility function: Convert full fiscal year date range to year format for display
export const convertFiscalYearToYearFormat = (fiscalYear: string) => {
  if (!fiscalYear) return '';

  if (fiscalYear.includes(' to ')) {
    // Supports both "2026-04-01 to 2027-03-31" (correct) and
    // "01/04/2026 to 31/03/2027" (legacy en-IN bug) formats
    const [startPart, endPart] = fiscalYear.split(' to ');
    const startYear = parseDateString(startPart).getFullYear();
    const endYear = parseDateString(endPart).getFullYear();

    // Guard: if either date is invalid, return as-is
    if (isNaN(startYear) || isNaN(endYear)) return fiscalYear;

    if (startYear === endYear) {
      // Same year: return last 2 digits only
      return startYear.toString().slice(-2);
    }

    // Different years: return both years in short format (26-27)
    const shortStartYear = startYear.toString().slice(-2);
    const shortEndYear = endYear.toString().slice(-2);
    return `${shortStartYear}-${shortEndYear}`;
  }

  // Already in short format like "2026-27" or "26-27"
  // If it's "2026-27", convert to "26-27"
  if (fiscalYear.includes('-')) {
    const [start, end] = fiscalYear.split('-');
    if (start.length === 4) {
      // "2026-27" format, convert to "26-27"
      return `${start.slice(-2)}-${end}`;
    }
  }
  
  return fiscalYear;
};

// Convert fiscal year date range to date objects for Flatpickr
const convertFiscalYearToDates = (fiscalYear: string): Date[] => {
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

const PrefixSettingsForm: React.FC<PrefixSettingsFormProps> = ({
  typeLabel,
  typeValue,
  onSuccess,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [currentPrefix, setCurrentPrefix] = useState<PrefixSetting | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [companyFiscalYear, setCompanyFiscalYear] = useState<string>('');

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
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch both prefix settings and company overview
        const [prefixResponse, companyResponse] = await Promise.all([
          fetchAllPrefixSettings(),
          fetchCompanyOverview()
        ]);

        const prefixForType = prefixResponse.data?.prefixSettings.find(
          (prefix: PrefixSetting) => prefix.identifier === typeValue
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
  }, [typeValue]);

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
        <FormikForm placeholder="">
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

          <div className="row">
            {/* Type (readonly) */}
            <div className="col-md-4 mb-4">
              <label className="form-label">Type</label>
              <input
                className="form-control"
                value={typeLabel}
                readOnly
                disabled
                name="identifier"
                type="text"
              />
            </div>

            {/* Fiscal Year (date range picker) */}
            <div className="col-md-4 mb-4">
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
            <div className="col-md-4 mb-4">
              <TextInput
                isRequired={true}
                formikField="prefix"
                label="Prefix"
                placeholder={`Enter ${typeLabel} Prefix`}
              />
            </div>
          </div>

          <div className="mt-4">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting || isLoading}
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
