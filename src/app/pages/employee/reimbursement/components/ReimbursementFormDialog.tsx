import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Form, Formik, type FormikHelpers } from 'formik';
import dayjs from 'dayjs';
import { parseDate, type CalendarDate } from '@internationalized/date';
import { useSelector } from 'react-redux';
import { ReceiptText, TriangleAlert } from 'lucide-react';
import type { RootState } from '@redux/store';
import { uploadUserAsset } from '@services/uploader';
import { currencyInputFormat, currencyPrefix } from '@utils/currency';
import { useFormField } from '@app/modules/common/hooks/useFormField';
import { FormDialog } from '@/ds/patterns/form-dialog';
import { SearchSelect, type SearchSelectOption } from '@/ds/patterns/search-select';
import { ImageField } from '@/ds/patterns/image-field';
import { DatePicker } from '@/ds/ui/date-picker';
import { NumberField } from '@/ds/ui/number-field';
import { Field, FieldError, FieldLabel } from '@/ds/ui/field';
import { Input } from '@/ds/ui/input';
import { Textarea } from '@/ds/ui/textarea';
import { Alert, AlertDescription } from '@/ds/ui/alert';
import { useReimbursementFormLookups, type LookupSeed } from '../hooks/useReimbursementFormLookups';
import {
  getReimbursementSchema,
  categoryRequiresLocation,
  describeLimitBreach,
  findDuplicateCandidate,
} from '../utils/reimbursementSchema';
import { fmtAmount } from '../utils/reimbursementFormat';
import DocumentPreviewModal from './DocumentPreviewModal';

export interface ReimbursementFormValues {
  expenseDate: string;
  clientTypeId: string;
  clientCompanyId: string;
  projectId: string;
  reimbursementTypeId: string;
  fromLocation: string;
  toLocation: string;
  amount: number | undefined;
  document: string;
  description: string;
  [key: string]: unknown;
}

export interface ReimbursementFormHelpers {
  /**
   * After a create: clear the expense itself (category, amount, locations, receipt, remark) and keep the
   * context — date, company and project — so a run of expenses against one project is one selection
   * followed by N amounts, not N full re-selections.
   */
  startNextExpense: () => void;
}

export interface ReimbursementFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** `create` requires project and category; `edit` does not (historical rows often have neither). */
  mode: 'create' | 'edit';
  title: string;
  /** A line under the title, e.g. the month being filed. */
  description?: ReactNode;
  /** Above the fields: why this edit is happening (rejection, query). */
  banner?: ReactNode;
  /** The record being edited; its saved company / project / category selections are restored. */
  record?: LookupSeed | null;
  initialValues: ReimbursementFormValues;
  /** YYYY-MM-DD: the expense date must fall inside this window. */
  minDate: string;
  maxDate: string;
  submitLabel: string;
  submitting: boolean;
  onSubmit: (values: ReimbursementFormValues, helpers: ReimbursementFormHelpers) => void | Promise<void>;
  /** Rows the new expense is checked against for a likely duplicate (advisory, never blocks). */
  duplicatePool?: Parameters<typeof findDuplicateCandidate>[0];
  /** Ignored by the duplicate check — the row being edited. */
  excludeId?: string;
  /** The employee's per-request cap, for the live warning under Amount. */
  perRequestLimit?: number | string | null;
}

const RECEIPT_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif', 'application/pdf'];
const RECEIPT_MAX_MB = 5;

const toCalendarDate = (v?: string | null): CalendarDate | null => {
  if (!v) return null;
  try {
    return parseDate(String(v).slice(0, 10));
  } catch {
    return null;
  }
};

/**
 * THE reimbursement form — filing a new expense, editing a draft, editing a submitted claim. One component
 * for every entry point; the rules live in utils/reimbursementSchema and the lookup cascade in
 * hooks/useReimbursementFormLookups, so the three copies that used to drift (fields, labels, upload, limits)
 * cannot drift again.
 *
 * Built only from design-system parts (FormDialog, SearchSelect, DatePicker, NumberField, ImageField, Field).
 * Formik binds through `useFormField` — the one seam to swap for react-hook-form later.
 */
export function ReimbursementFormDialog(props: ReimbursementFormDialogProps) {
  const { open, mode, initialValues, record } = props;
  const isEditing = mode === 'edit';

  // Seeding only while open: closing clears the seed, so reopening the SAME record changes it again and the
  // saved selections are restored every time (the restore effect keys on the seed's ids).
  const lookups = useReimbursementFormLookups(open ? record ?? null : null);
  const { reset } = lookups;
  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  const schema = useMemo(
    () => getReimbursementSchema({ isEditing, category: lookups.selectedReimbursementFor }),
    [isEditing, lookups.selectedReimbursementFor],
  );

  return (
    <Formik<ReimbursementFormValues>
      initialValues={initialValues}
      enableReinitialize
      validationSchema={schema}
      onSubmit={async (values, actions: FormikHelpers<ReimbursementFormValues>) => {
        await props.onSubmit(values, {
          startNextExpense: () => {
            // handleCategoryChange owns BOTH halves of the category (selected option + form value).
            lookups.handleCategoryChange(null, actions.setFieldValue);
            actions.setFieldValue('amount', undefined, false);
            actions.setFieldValue('fromLocation', '', false);
            actions.setFieldValue('toLocation', '', false);
            actions.setFieldValue('document', '', false);
            actions.setFieldValue('description', '', false);
            actions.setTouched({}, false);
          },
        });
      }}
    >
      {(formik) => (
        <FormDialog
          open={open}
          onOpenChange={props.onOpenChange}
          title={props.title}
          description={props.description}
          icon={<ReceiptText />}
          size="lg"
          formId="reimbursement-form"
          submitLabel={props.submitLabel}
          submitting={props.submitting || formik.isSubmitting}
          dirty={formik.dirty}
        >
          {props.banner && <div className="mb-5">{props.banner}</div>}
          <Form id="reimbursement-form" noValidate>
            <ReimbursementFields {...props} lookups={lookups} />
          </Form>
        </FormDialog>
      )}
    </Formik>
  );
}

function ReimbursementFields({
  mode,
  minDate,
  maxDate,
  duplicatePool,
  excludeId,
  perRequestLimit,
  lookups,
}: ReimbursementFormDialogProps & { lookups: ReturnType<typeof useReimbursementFormLookups> }) {
  const isEditing = mode === 'edit';
  const userId = useSelector((state: RootState) => state.auth.currentUser.id);

  const date = useFormField<string>('expenseDate');
  const clientType = useFormField<string>('clientTypeId');
  const clientCompany = useFormField<string>('clientCompanyId');
  const project = useFormField<string>('projectId');
  const category = useFormField<string>('reimbursementTypeId');
  const amount = useFormField<number | string | undefined>('amount');
  const from = useFormField<string>('fromLocation');
  const to = useFormField<string>('toLocation');
  const receipt = useFormField<string>('document');
  const remark = useFormField<string>('description');

  // Receipts are stored private, so the saved path alone won't render; this covers the gap between an
  // upload and a save (saved records come back presigned from the API).
  const [justUploadedUrl, setJustUploadedUrl] = useState<string | null>(null);
  const [viewing, setViewing] = useState<string | null>(null);
  useEffect(() => {
    if (!receipt.value) setJustUploadedUrl(null);
  }, [receipt.value]);

  const {
    reimbursementOptions, companyTypeOptions, filteredCompanies, projectOptions, projectsLoading,
    projectStatusOptions, selectedReimbursementFor, selectedProjectStatus,
    handleCategoryChange, handleClientTypeChange, handleClientCompanyChange, handleProjectChange,
    handleProjectStatusChange,
  } = lookups;
  const setField = (field: string, value: unknown) => {
    // The cascade handlers speak Formik's setFieldValue; route them through the same validated path.
    const map: Record<string, ReturnType<typeof useFormField<any>>> = {
      clientTypeId: clientType, clientCompanyId: clientCompany, projectId: project, reimbursementTypeId: category,
    };
    map[field]?.setValue(value);
  };

  const companyOptions: SearchSelectOption[] = useMemo(
    () => [...filteredCompanies]
      .sort((a: any, b: any) => a.companyName.localeCompare(b.companyName))
      .map((c: any) => ({ value: c.id, label: c.companyName })),
    [filteredCompanies],
  );
  const categoryOptions: SearchSelectOption[] = useMemo(
    () => [...reimbursementOptions]
      .sort((a: any, b: any) => String(a.label).localeCompare(String(b.label)))
      .map((o: any) => ({ value: String(o.value), label: String(o.label), icon: o.icon || undefined })),
    [reimbursementOptions],
  );
  const asOptions = (list: any[]): SearchSelectOption[] =>
    list.map((o) => ({ value: String(o.value), label: String(o.label) }));

  const needsLocation = categoryRequiresLocation(selectedReimbursementFor);
  const amountNumber = amount.value === '' || amount.value == null ? NaN : Number(amount.value);

  // The cap, as the amount is typed — not days later as a red row an approver finds.
  const breach = describeLimitBreach(amount.value as number | undefined, {
    perRequest: perRequestLimit,
    category: (selectedReimbursementFor as any)?.amountLimit,
    categoryName: selectedReimbursementFor?.label,
  });
  // Two cab rides on one day are real, so this warns and never blocks.
  const dupe = duplicatePool
    ? findDuplicateCandidate(duplicatePool, {
        expenseDate: date.value,
        amount: amount.value as number | undefined,
        reimbursementTypeId: category.value,
      }, excludeId)
    : null;

  const upload = async (file: File) => {
    const form = new FormData();
    form.append('file', file);
    const { data: { path, previewUrl } } = await uploadUserAsset(form, userId, undefined, 'reimbursement-docs');
    setJustUploadedUrl(previewUrl ?? path);
    return path as string;
  };

  return (
    <div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
      <DatePicker
        label="Expense date"
        value={toCalendarDate(date.value)}
        onChange={(d) => date.setValue(d ? d.toString() : '')}
        onBlur={date.onBlur}
        minValue={toCalendarDate(minDate)}
        maxValue={toCalendarDate(maxDate)}
        isRequired
        isInvalid={date.invalid}
        errorMessage={date.error}
      />
      {/* Project status, company type and company name all narrow the project list, so they sit together
          above it — and the status fills the space beside the date instead of leaving it empty. */}
      <SearchSelect
        id="reimb-project-status"
        label="Project status"
        placeholder={projectsLoading ? 'Loading…' : 'All statuses'}
        options={asOptions(projectStatusOptions)}
        value={selectedProjectStatus?.value ?? null}
        disabled={projectsLoading || projectStatusOptions.length === 0}
        // A view filter only — never part of the saved record.
        onValueChange={(v, o) => handleProjectStatusChange(v ? { value: v, label: o?.label ?? v } : null)}
      />

      <SearchSelect
        id="reimb-company-type"
        label="Company type"
        placeholder="Search company types"
        options={asOptions(companyTypeOptions)}
        value={clientType.value}
        onBlur={clientType.onBlur}
        onValueChange={(v, o) => handleClientTypeChange(v ? { value: v, label: o?.label ?? v } : null, setField)}
      />
      <SearchSelect
        id="reimb-company"
        label="Company name"
        placeholder="Search companies"
        options={companyOptions}
        value={clientCompany.value}
        onBlur={clientCompany.onBlur}
        disabled={!clientType.value}
        emptyText="No clients for this type."
        hint={!clientType.value ? 'Choose a company type first.' : undefined}
        onValueChange={(v, o) => handleClientCompanyChange(v ? { value: v, label: o?.label ?? v } : null, setField)}
      />

      {/* The whole row: project names are long ("WT/PROJECT/26-27/742 - 5th Floor Criti Care Hospital…"). */}
      <SearchSelect
        id="reimb-project"
        className="sm:col-span-2"
        label="Project"
        placeholder={projectsLoading ? 'Loading projects…' : 'Search projects'}
        // Options keep the hook's order (ongoing first), so no sort here.
        options={asOptions(projectOptions)}
        value={project.value}
        onBlur={project.onBlur}
        disabled={projectsLoading}
        required={!isEditing}
        error={project.error}
        emptyText="No ongoing projects found."
        onValueChange={(v, o) => handleProjectChange(v ? { value: v, label: o?.label ?? v } : null, setField)}
      />

      <SearchSelect
        id="reimb-category"
        label="Reimbursement for"
        placeholder="Search categories"
        options={categoryOptions}
        value={category.value}
        onBlur={category.onBlur}
        required={!isEditing}
        error={category.error}
        onValueChange={(v) =>
          handleCategoryChange(v ? reimbursementOptions.find((o: any) => String(o.value) === v) ?? null : null, setField)
        }
      />
      <NumberField
        label="Amount"
        value={amountNumber}
        onChange={(n) => amount.setValue(Number.isNaN(n) ? undefined : n)}
        onBlur={amount.onBlur}
        minValue={0}
        formatOptions={currencyInputFormat()}
        steppers={false}
        isRequired
        isInvalid={amount.invalid}
        errorMessage={amount.error}
        description={breach ? (
          <span className="font-semibold text-warning-foreground">{breach} — it can still be submitted, but expect a question.</span>
        ) : undefined}
      />

      {dupe && (
        <Alert variant="warning" className="sm:col-span-2">
          <TriangleAlert aria-hidden />
          <AlertDescription>
            You already have a {currencyPrefix()}{fmtAmount(dupe.amount ?? 0)} expense in this category on{' '}
            {dayjs(date.value).format('DD MMM')}. Submit anyway if this is a separate claim.
          </AlertDescription>
        </Alert>
      )}

      {/* Only categories that are journeys collect From/To — requiring them on meals is how rows got junk. */}
      {needsLocation && (
        <>
          <Field data-invalid={from.invalid || undefined}>
            <FieldLabel htmlFor="reimb-from">From location</FieldLabel>
            <Input
              id="reimb-from"
              value={from.value ?? ''}
              onChange={(e) => from.setValue(e.target.value)}
              onBlur={from.onBlur}
              aria-required
              aria-invalid={from.invalid || undefined}
              aria-describedby={from.error ? 'reimb-from-error' : undefined}
            />
            {from.error && <FieldError id="reimb-from-error">{from.error}</FieldError>}
          </Field>
          <Field data-invalid={to.invalid || undefined}>
            <FieldLabel htmlFor="reimb-to">To location</FieldLabel>
            <Input
              id="reimb-to"
              value={to.value ?? ''}
              onChange={(e) => to.setValue(e.target.value)}
              onBlur={to.onBlur}
              aria-required
              aria-invalid={to.invalid || undefined}
              aria-describedby={to.error ? 'reimb-to-error' : undefined}
            />
            {to.error && <FieldError id="reimb-to-error">{to.error}</FieldError>}
          </Field>
        </>
      )}

      <ImageField
        id="reimb-receipt"
        className="sm:col-span-2"
        label="Receipt"
        value={receipt.value || null}
        onChange={(path) => receipt.setValue(path ?? '')}
        upload={upload}
        accept={RECEIPT_TYPES}
        maxSizeMB={RECEIPT_MAX_MB}
        previewUrl={justUploadedUrl}
        onView={() => setViewing(justUploadedUrl ?? receipt.value)}
        capture="environment"
        hint={`Photograph it or attach a PDF, up to ${RECEIPT_MAX_MB} MB.`}
      />

      <Field className="sm:col-span-2">
        <FieldLabel htmlFor="reimb-remark">Remark</FieldLabel>
        <Textarea
          id="reimb-remark"
          rows={2}
          value={remark.value ?? ''}
          onChange={(e) => remark.setValue(e.target.value)}
          onBlur={remark.onBlur}
        />
      </Field>

      {viewing && <DocumentPreviewModal url={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}

export default ReimbursementFormDialog;
