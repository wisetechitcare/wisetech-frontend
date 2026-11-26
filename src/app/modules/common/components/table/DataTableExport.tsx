/**
 * App bootstrap only — registers ExportButton (toast + currency) for kit DataTableExport.
 * Screens import `@/ds/patterns/data-table-export`, not this file.
 */
import type { ReactNode } from 'react'
import ExportButton from '@app/modules/common/components/ExportButton'
import {
  registerDataTableExportButton,
  type DataTableExportButtonProps,
} from '@/ds/patterns/data-table-export'

registerDataTableExportButton(ExportButton as <T,>(props: DataTableExportButtonProps<T>) => ReactNode)
