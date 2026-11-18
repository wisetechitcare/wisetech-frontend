import { createElement, type ReactNode } from "react"
import { CalendarClock, CircleAlert, Fingerprint, Image as ImageIcon, Store, Users } from "lucide-react"

import { DescriptionList } from "@/ds/patterns/description-list"
import { SectionHeader } from "@/ds/patterns/section-header"
import { SensitiveProvider, SensitiveToggle, SensitiveValue } from "@/ds/patterns/sensitive"
import { StatCard } from "@/ds/patterns/stat-card"
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/ds/ui/alert"
import { Button, buttonVariants } from "@/ds/ui/button"
import { Card, CardContent, CardHeader } from "@/ds/ui/card"
import { SmartAvatar } from "@/ds/ui/smart-avatar"

import type { IFormField } from "@/models/company"
import { useOrganizationStore } from "@/ds/prototypes/hooks/organization"
import {
  BuiltinFieldId,
  BuiltinSectionId,
  OrgDetailTab,
  ProfileFieldType,
  ProfileInputKind,
  type Organization,
  type OrgScope,
} from "@/ds/prototypes/types/organization/organization"
import { formatDate, plural } from "@/ds/prototypes/utils/common/format"
import {
  attentionLabel,
  countNeedingAttention,
  fieldValue,
  isFiscalYearOver,
  missingRequiredFields,
  sectionIcon,
  sumEmployees,
} from "@/ds/prototypes/utils/organization/organization"

const shownOnProfile = (f: IFormField) => !f.hidden && f.showOnInfoPage !== false

function display(field: IFormField, value: string): ReactNode {
  if (!value) return ""
  if (field.inputKind === ProfileInputKind.URL) {
    return (
      <a href={value} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "link", className: "h-auto p-0" })}>
        {value.replace(/^https?:\/\//, "")}
      </a>
    )
  }
  if (field.type === ProfileFieldType.DATE && field.id !== BuiltinFieldId.FISCAL_YEAR) return formatDate(value)
  return value
}

interface OrgOverviewTabProps {
  org: Organization
  scope: OrgScope
  onEdit: () => void
  onOpenTab: (tab: OrgDetailTab) => void
}

/** The read-only profile: what needs fixing first, the headline numbers, then each profile section as a card. */
export function OrgOverviewTab({ org, scope, onEdit, onOpenTab }: OrgOverviewTabProps) {
  const { now } = useOrganizationStore()
  const missing = missingRequiredFields(org)
  const attention = countNeedingAttention(scope.devices, now)
  const brandingImages = [
    { label: "Logo", src: org.logo },
    { label: "Stamp", src: org.salaryStamp },
  ]

  return (
    <SensitiveProvider>
      <div className="space-y-5 pt-5">
        {isFiscalYearOver(org.fiscalYear, now) && (
          <Alert variant="warning">
            <CalendarClock aria-hidden />
            <AlertTitle>The fiscal year ended on {formatDate(org.fiscalYear.end)}</AlertTitle>
            <AlertDescription>Payroll, leave balances and reports follow it. Set the new year before the next pay run.</AlertDescription>
            <AlertAction>
              <Button size="sm" variant="outline" onClick={onEdit}>
                Update
              </Button>
            </AlertAction>
          </Alert>
        )}
        {missing.length > 0 && (
          <Alert variant="info">
            <CircleAlert aria-hidden />
            <AlertTitle>{plural(missing.length, "required field")} still empty</AlertTitle>
            <AlertDescription>{missing.map((f) => f.label).join(", ")}</AlertDescription>
            <AlertAction>
              <Button size="sm" variant="outline" onClick={onEdit}>
                Complete profile
              </Button>
            </AlertAction>
          </Alert>
        )}

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard size="sm" label="Branches" value={scope.branches.length} hint="Including sub-organizations" tone="cyan" icon={<Store aria-hidden />} />
          <StatCard size="sm" label="Employees" value={sumEmployees(scope.branches)} hint="Across these branches" tone="green" icon={<Users aria-hidden />} />
          <StatCard
            size="sm"
            label="Devices"
            value={scope.devices.length}
            hint={attention ? attentionLabel(attention) : "All healthy"}
            tone={attention ? "warning" : "success"}
            icon={<Fingerprint aria-hidden />}
          />
          <StatCard
            size="sm"
            label="Work week"
            value={`${org.workingDaysPerWeek} × ${org.workingHoursPerDay}h`}
            hint="Days × hours per day"
            tone="purple"
            icon={<CalendarClock aria-hidden />}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {org.sections
            .filter((s) => s.showOnInfoPage !== false)
            .map((section) => {
              const bank = section.id === BuiltinSectionId.BANK
              const rows = section.fields.filter(shownOnProfile).map((f) => {
                const value = display(f, fieldValue(org, f.id))
                return { label: f.label, value: bank && value ? <SensitiveValue>{value}</SensitiveValue> : value, wide: f.inputKind === ProfileInputKind.LONG_TEXT }
              })
              return (
                <Card key={section.id} variant="panel">
                  <CardHeader>
                    <SectionHeader
                      title={section.title}
                      icon={createElement(sectionIcon(section.id))}
                      action={bank ? <SensitiveToggle label="Show details" /> : undefined}
                    />
                  </CardHeader>
                  <CardContent>
                    <DescriptionList rows={rows} emptyText="No fields are shown on the profile for this section." />
                  </CardContent>
                </Card>
              )
            })}

          <Card variant="panel">
            <CardHeader>
              <SectionHeader title="Branding" description="Printed on documents and payslips." icon={<ImageIcon />} />
            </CardHeader>
            <CardContent className="flex gap-6">
              {brandingImages.map((img) => (
                <div key={img.label} className="space-y-2 text-center">
                  <SmartAvatar name={img.label} src={img.src} shape="rounded" size="lg" decorative />
                  <p className="text-xs text-muted-foreground">{img.src ? img.label : `No ${img.label.toLowerCase()} yet`}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <p className="text-xs text-muted-foreground">
          Choose what this page shows in{" "}
          <Button variant="link" size="xs" className="px-0" onClick={() => onOpenTab(OrgDetailTab.FIELDS)}>
            Profile fields
          </Button>
          .
        </p>
      </div>
    </SensitiveProvider>
  )
}
