import { FormEvent, useEffect, useState } from 'react'
import { KeyRound } from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { RootState } from '@redux/store'
import { fetchEmployeeProfileData } from '@services/employee'
import { changePassword } from '@services/auth'
import { removeAuth } from '@app/modules/auth'
import { logoutUser } from '@redux/slices/auth'
import { errorConfirmation } from '@utils/modal'
import { Button } from '@/ds/ui/button'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/ds/ui/field'
import { PasswordField } from '@/ds/patterns/password-field'
import { FormDialog } from '@/ds/patterns/form-dialog'
import { SettingsRow, SettingsSection } from '@/ds/patterns/settings-section'

const SignInMethod: React.FC = () => {
  const employeeId = useSelector((state: RootState) => state.employee.currentEmployee.id)
  const dispatch = useDispatch()
  const navigate = useNavigate()

  const [companyEmail, setCompanyEmail] = useState<string | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(true)

  const [pwOpen, setPwOpen] = useState(false)
  const [pwBusy, setPwBusy] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{
    currentPassword?: string
    newPassword?: string
    passwordConfirmation?: string
  }>({})

  useEffect(() => {
    if (!employeeId) {
      setLoadingProfile(false)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const {
          data: { employeeProfile },
        } = await fetchEmployeeProfileData(employeeId)
        if (!cancelled) {
          setCompanyEmail(
            typeof employeeProfile?.companyEmailId === 'string' ? employeeProfile.companyEmailId : null,
          )
        }
      } catch {
        if (!cancelled) setCompanyEmail(null)
      } finally {
        if (!cancelled) setLoadingProfile(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [employeeId])

  function resetPasswordForm() {
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setFieldErrors({})
  }

  function validate(): boolean {
    const next: typeof fieldErrors = {}
    if (!currentPassword.trim()) next.currentPassword = 'Current password is required'
    if (!newPassword.trim()) next.newPassword = 'New password is required'
    else if (newPassword.length < 8) next.newPassword = 'Password must be at least 8 characters'
    if (!confirmPassword.trim()) next.passwordConfirmation = 'Confirm password is required'
    else if (confirmPassword !== newPassword) next.passwordConfirmation = 'Passwords must match'
    setFieldErrors(next)
    return Object.keys(next).length === 0
  }

  async function onChangePassword(e: FormEvent) {
    e.preventDefault()
    if (!employeeId || !validate()) return
    setPwBusy(true)
    try {
      await changePassword(employeeId, {
        currentPassword,
        newPassword,
        passwordConfirmation: confirmPassword,
      })
      setPwOpen(false)
      resetPasswordForm()
      removeAuth()
      dispatch(logoutUser())
      navigate('/auth')
      location.reload()
    } catch {
      errorConfirmation('Failure in updating the password')
    } finally {
      setPwBusy(false)
    }
  }

  return (
    <>
      <SettingsSection
        title="Sign-In Method"
        description="Work email and password for this account."
        icon={<KeyRound aria-hidden />}
        loading={loadingProfile}
        className="mb-5"
      >
        <SettingsRow
          label="Email Address"
          description="Work email used to sign in. Managed on the employee profile."
          control={
            <p className="text-sm font-medium text-foreground sm:text-right">
              {companyEmail ?? '—'}
            </p>
          }
        />
        <SettingsRow
          label="Password"
          description="You will be signed out of every session after saving."
          control={
            <Button type="button" variant="outline" size="sm" onClick={() => setPwOpen(true)}>
              Change Password
            </Button>
          }
        />
      </SettingsSection>

      <FormDialog
        open={pwOpen}
        onOpenChange={(open) => {
          setPwOpen(open)
          if (!open) resetPasswordForm()
        }}
        title="Change Password"
        description="You will be signed out of every session after saving."
        icon={<KeyRound aria-hidden />}
        formId="account-change-password"
        submitLabel="Update Password"
        submitting={pwBusy}
        dirty={Boolean(currentPassword || newPassword || confirmPassword)}
      >
        <form id="account-change-password" className="grid gap-5 p-6" onSubmit={onChangePassword} noValidate>
          <FieldGroup className="gap-4">
            <Field data-invalid={fieldErrors.currentPassword ? true : undefined}>
              <FieldLabel htmlFor="account-current-password">Current Password</FieldLabel>
              <PasswordField
                id="account-current-password"
                autoComplete="current-password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                invalid={Boolean(fieldErrors.currentPassword)}
              />
              {fieldErrors.currentPassword ? <FieldError>{fieldErrors.currentPassword}</FieldError> : null}
            </Field>
            <Field data-invalid={fieldErrors.newPassword ? true : undefined}>
              <FieldLabel htmlFor="account-new-password">New Password</FieldLabel>
              <PasswordField
                id="account-new-password"
                autoComplete="new-password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                invalid={Boolean(fieldErrors.newPassword)}
              />
              {fieldErrors.newPassword ? <FieldError>{fieldErrors.newPassword}</FieldError> : null}
            </Field>
            <Field data-invalid={fieldErrors.passwordConfirmation ? true : undefined}>
              <FieldLabel htmlFor="account-confirm-password">Confirm New Password</FieldLabel>
              <PasswordField
                id="account-confirm-password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                invalid={Boolean(fieldErrors.passwordConfirmation)}
              />
              {fieldErrors.passwordConfirmation ? (
                <FieldError>{fieldErrors.passwordConfirmation}</FieldError>
              ) : null}
            </Field>
          </FieldGroup>
          <p className="text-sm text-muted-foreground">
            Password must be at least 8 characters and contain symbols.
          </p>
        </form>
      </FormDialog>
    </>
  )
}

export { SignInMethod }
