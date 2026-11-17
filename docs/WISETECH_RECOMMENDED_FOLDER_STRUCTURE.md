# WiseTech Frontend --- Recommended Folder Structure

**Architecture reference:** HMS project conventions\
**Selected approach:** HMS
-style layered architecture with domain-based
subfolders\
**Primary priorities:** Cleaning, reusability, optimization,
readability, and maintainability

---

## 1. Architecture decision

WiseTech will follow the **layered architecture used by HMS**, adapted
to WiseTech's existing codebase.

The structure is organized by technical responsibility at the top level.
Within each layer, domain-specific code is grouped into domain
subfolders.

For example, employee-related code can be found in the employee area of
pages, components, hooks, services, types, schemas, and utilities.
Shared code remains in the corresponding common/shared location.

We will **not** introduce a new `src/features/` root.

This is an architectural direction. It does not mean every folder must
be created immediately or that all existing files should be moved at
once.

## 2. Recommended folder structure

```text
src/
├── app/
│   ├── routing/                       # Application routes, route guards and route config
│   ├── pages/
│   │   ├── employee/                  # Employee screens
│   │   ├── attendance/                # Attendance screens
│   │   ├── leave/                     # Leave screens
│   │   ├── recruitment/                # Recruitment screens
│   │   ├── payroll/                   # Payroll screens
│   │   ├── billing/                   # Billing screens
│   │   └── ...                        # Other business-domain screens
│   └── ...                            # Other application-level code
│
├── components/
│   ├── ui/                            # Low-level UI primitives, where applicable
│   ├── common/                        # Components reused across multiple domains
│   ├── employee/                      # Employee-domain shared components
│   ├── attendance/
│   ├── recruitment/
│   └── ...                            # Other domain-specific component groups
│
├── hooks/
│   ├── common/                        # Hooks reused across domains
│   ├── employee/
│   ├── attendance/
│   ├── recruitment/
│   └── ...                            # Other domain-specific hooks
│
├── services/
│   ├── common/                        # Shared/core services used by multiple domains
│   ├── employee/
│   ├── company/
│   ├── attendance/
│   ├── recruitment/
│   ├── billing/
│   └── ...                            # Other domain-specific services
│
├── utils/
│   ├── common/                        # Generic, domain-independent utilities
│   ├── employee/
│   ├── attendance/
│   ├── leave/
│   ├── payroll/
│   └── ...                            # Other domain-specific business utilities
│
├── lib/                               # Shared technical infrastructure
│   ├── apiClient.ts                   # Canonical shared HTTP/API client, if retained here
│   ├── queryKeys.ts                   # Shared query-key definitions
│   └── cn.ts                          # Shared class-name helper, if retained here
│
├── types/
│   ├── common/                        # Shared application and API types
│   ├── employee/
│   ├── attendance/
│   ├── recruitment/
│   └── ...                            # Domain-specific types
│
├── schemas/
│   ├── common/                        # Shared validation schemas, if needed
│   ├── employee/
│   ├── attendance/
│   ├── recruitment/
│   └── ...                            # Domain-specific validation schemas
│
├── constants/
│   ├── common/                        # Application-wide constants
│   ├── employee/
│   ├── attendance/
│   ├── recruitment/
│   └── ...                            # Domain-specific constants
│
├── redux/                             # Existing Redux store and slices
├── contexts/                          # Application-level React contexts
├── preferences/                       # User/application preferences
├── shared/                            # Existing shared infrastructure, where justified
├── ds/                                # Existing WiseTech design system
├── modules/                           # Existing standalone modules; preserve initially
├── _metronic/                         # Existing Metronic theme/vendor code
├── App.tsx
├── main.tsx
└── ...
```

**Structure notes**

- The tree shows the intended organization, not a requirement to
  create empty folders.
- Keep the existing `src/app/pages/` location for WiseTech pages.
- Keep one canonical root for each responsibility. Do not create
  parallel folders that serve the same purpose.
- Add a domain subfolder only when there is actual code and a clear
  ownership reason.
- Existing modules such as payroll and audit should not be moved
  solely to make the structure visually uniform.
- Preserve the existing design-system boundary in `ds/`.
- Treat `_metronic/` as vendor/theme code; do not mix
  application-owned components into it.

## 3. Folder responsibilities

### `app/`

Contains application-level setup and navigation.

- `app/routing/` owns route definitions, route guards, and route
  configuration.
- `app/pages/<domain>/` owns the screens for each business domain.
- Page components should primarily compose UI and connect the required
  hooks and services.
- Keep substantial business logic and reusable UI outside page files.

### `components/`

Contains application-owned reusable UI components.

- `components/ui/` contains low-level UI primitives, subject to the
  existing `ds/` design-system boundary.
- `components/common/` contains components reused across multiple
  domains.
- `components/<domain>/` contains components reused by multiple
  screens within that domain.
- Components used by only one screen can remain close to that screen
  when this is clearer.
- Check existing components and `ds/` before creating another
  implementation.

### `hooks/`

Contains reusable React hooks.

- `hooks/common/` contains hooks used across multiple domains.
- `hooks/<domain>/` contains hooks whose behaviour belongs to one
  domain.
- Avoid maintaining multiple hooks that solve the same problem.

### `services/`

Contains API-facing and business-service functions.

- `services/common/` contains genuinely shared services, such as core
  employee, company, user, role/permission, and lookup operations when
  multiple domains consume them.
- `services/<domain>/` contains services owned by a particular domain.
- Keep generic HTTP client configuration and request infrastructure in
  `lib/`, rather than duplicating it in individual services.
- Before consolidating or moving a service, inspect all its consumers
  and preserve its public behaviour.

### `utils/`

Contains pure helper functions and business utilities.

- `utils/common/` contains generic helpers that are independent of a
  business domain.
- `utils/<domain>/` contains domain-specific calculations and business
  rules.
- Do not place domain-specific business logic in generic utilities
  merely because it is implemented as a function.
- Keep large business engines separated into focused files.

### `lib/`

Contains shared technical infrastructure rather than domain workflows.

Examples include the canonical API client, query-key definitions,
class-name helpers, and other cross-application technical utilities.
Keep existing implementations until their responsibilities and consumers
have been verified.

### `types/`, `schemas/`, and `constants/`

- Keep shared definitions in the common area.
- Group domain-specific types, schemas, and constants under their
  respective domain.
- Avoid duplicate definitions for the same API response, entity,
  option set, or business concept.
- Keep UI styling values and business constants in appropriate
  locations rather than mixing unrelated responsibilities.

### `redux/`, `contexts/`, `preferences/`, and `shared/`

Keep these established application-level responsibilities in their
existing roots unless a concrete issue justifies a change. Do not
migrate state-management patterns as part of folder organization alone.

### `ds/` and `_metronic/`

- Keep WiseTech's existing design system in `ds/`.
- Do not relocate the design system simply to match another project's
  directory names.
- Treat `_metronic/` as existing theme/vendor code and preserve its
  boundary.

### `modules/`

Keep existing standalone modules in place initially. Review their
ownership, imports, and responsibilities before considering any move.
Avoid creating additional competing homes for the same domain.

## 4. Rules for shared and domain-specific code

1.  **Shared means genuinely shared.** A component, hook, service, type,
    schema, constant, or utility belongs in a common location when
    multiple domains need the same responsibility.
2.  **Domain-specific code stays with its domain.** Avoid putting
    business-specific logic in generic shared folders.
3.  **Core records may be shared.** Employee, company/branch, users,
    roles/permissions, and common lookup data are cross-domain concerns
    when multiple domains depend on them.
4.  **Check existing implementations first.** Reuse or extend an
    existing component, hook, utility, service, type, schema, or
    constant before creating another.
5.  **Do not duplicate code to achieve local ownership.** If multiple
    domains need the same functionality, maintain one shared
    implementation with a clear interface.
6.  **Avoid unnecessary abstractions.** Do not extract a component or
    helper solely because it could theoretically be reused.
7.  **Avoid direct domain-to-domain coupling.** If one domain needs
    functionality from another, assess whether that functionality
    belongs in a shared layer with a clear interface.
8.  **Do not create empty folders or speculative layers.** Add a folder
    only when actual code and responsibility justify it.
9.  **Preserve existing behaviour.** Organization must not
    unintentionally change API contracts, permissions, routing,
    authentication, forms, exports, or integrations.
10. **Avoid circular dependencies and broad barrel exports.** Keep
    imports explicit and ensure shared layers do not depend on
    domain-specific code.

## 5. Naming and coding conventions

Follow the WiseTech `AGENTS.md` supplied by the project owner for
naming, imports, file size, typing, component conventions, API handling,
styling, and code quality.

Where the existing repository differs from the reference project's
naming or file conventions, use the approved WiseTech `AGENTS.md`. Do
not mass-rename files merely to make the tree look uniform.

## 6. Guiding principle

The purpose of this structure is to make WiseTech easier to clean,
navigate, reuse, optimize, and maintain.

**Follow the HMS-style layered architecture: organize top-level folders
by responsibility, group domain-specific code into subfolders within
those layers, and keep genuinely shared code in common locations. Do not
introduce a separate `src/features/` architecture.**

The folder structure should serve the codebase. Do not move files,
create abstractions, or add dependencies just to make the tree look
uniform.
