// The schema manager operates directly on the canonical form-schema types so the
// same shape flows: DB (section_config) → form state → manager → back to form.
import { IFormField, IFormSection, FormFieldType } from '@models/company';

export type { IFormField as SchemaField, IFormSection as SchemaSection, FormFieldType as FieldType };
