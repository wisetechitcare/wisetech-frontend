import {ProfileDetails} from './cards/ProfileDetails'
import {SignInMethod} from './cards/SignInMethod'

export function Settings() {
  return (
    <>
      <ProfileDetails />
      <SignInMethod />
      {/* <ConnectedAccounts />
      <EmailPreferences />
      <Notifications />
      <DeactivateAccount /> */}
    </>
  )
}
