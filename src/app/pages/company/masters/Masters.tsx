import React from 'react'
import Towns from './Towns';

/**
 * Company masters that are NOT part of onboarding.
 *
 * Shifts, Departments and Job Profiles (Designations) used to live here too. All three
 * feed onboarding pickers, so they now sit with the rest of the onboarding configuration
 * on Employees → Configure, where an admin setting the form up is already looking —
 * having them here meant editing an onboarding dropdown from a different module.
 *
 * Towns stays because onboarding never reads it: it fills the required Town field on a
 * BRANCH, and onboarding only picks the finished branch.
 *
 * One section left, so no tab strip — it would be a single tab pointing at itself.
 */
function Masters() {
  return <Towns />
}

export default Masters
