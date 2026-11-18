# WiseTech Frontend — Storybook Structure

**Scope:** Storybook organization for the WiseTech frontend  
**Architecture approach:** Component-story colocation with centralized Storybook-only resources  
**Primary priorities:** Readability, discoverability, reusability, maintainability, and preserving existing application behavior

---

## 1. Architecture Decision

WiseTech will follow a **hybrid Storybook organization approach** that combines:

1. **Component-level story colocation:** Keep a story beside the component it documents.
2. **Centralized Storybook resources:** Keep resources used exclusively by Storybook inside `src/storybook/`.
3. **Dedicated configuration:** Keep Storybook's configuration in the root `.storybook/` directory.
4. **Clear ownership boundaries:** Keep application code in the application layer and design-system code in the existing `src/ds/` directory.

Do not move every story into one central `stories/` directory. Colocation keeps components and their documentation close together. The centralized Storybook directory is for Storybook-only material such as screen prototypes, documentation, shared demo fixtures, decorators, assets, and testing helpers.

This is the intended organizational direction. It does not require creating every example directory immediately or moving files before their consumers and dependencies have been inspected.

## 2. Recommended Folder Structure

```text
wisetech-frontend/
│
├── .storybook/                            # Storybook configuration only
│   ├── main.ts
│   └── preview.tsx
│
├── src/
│   │
│   ├── ds/                                # Existing WiseTech design system
│   │   ├── ui/
│   │   │   ├── button.tsx
│   │   │   ├── button.stories.tsx
│   │   │   ├── input.tsx
│   │   │   ├── input.stories.tsx
│   │   │   └── ...
│   │   │
│   │   ├── patterns/
│   │   │   ├── auth-layout.tsx
│   │   │   ├── auth-layout.stories.tsx
│   │   │   └── ...
│   │   │
│   │   ├── effects/
│   │   │   └── ...
│   │   │
│   │   ├── provider.tsx
│   │   ├── hooks/
│   │   ├── lib/
│   │   └── styles/
│   │
│   ├── app/                               # Actual application
│   │   └── modules/
│   │       └── common/
│   │           └── components/
│   │               ├── FileUpload.tsx
│   │               └── FileUpload.stories.tsx
│   │
│   └── storybook/                         # Storybook-only ecosystem
│       │
│       ├── docs/                          # Storybook documentation
│       │   ├── Introduction.mdx
│       │   └── KitMap.mdx
│       │
│       ├── foundations/                   # Design-system reference pages
│       │   ├── Foundations.tsx
│       │   ├── Foundations.stories.tsx
│       │   └── Icons.stories.tsx
│       │
│       ├── screens/                       # Full-page prototypes and previews
│       │   │
│       │   ├── app/
│       │   │   ├── AppScreen.tsx
│       │   │   ├── AppScreen.stories.tsx
│       │   │   └── ...
│       │   │
│       │   ├── organization/
│       │   │   ├── components/
│       │   │   ├── hooks/
│       │   │   ├── types/
│       │   │   ├── constants/
│       │   │   ├── fixtures/
│       │   │   ├── utils/
│       │   │   └── Organization.stories.tsx
│       │   │
│       │   ├── company-profile/
│       │   │   ├── CompanyProfile.stories.tsx
│       │   │   ├── OurJourney.stories.tsx
│       │   │   └── fixtures.ts
│       │   │
│       │   └── media-gallery/
│       │       ├── MediaGalleryPrototype.tsx
│       │       ├── MediaGallery.stories.tsx
│       │       └── fixtures.ts
│       │
│       ├── support/                       # Shared Storybook resources
│       │   │
│       │   ├── assets/                    # Storybook-only assets
│       │   │   ├── logo.svg
│       │   │   └── portrait.svg
│       │   │
│       │   ├── fixtures/                  # Shared demo data
│       │   │   ├── people.ts
│       │   │   └── typewriter.ts
│       │   │
│       │   ├── decorators/                # Reusable story decorators
│       │   │   └── with-story-layout.tsx
│       │   │
│       │   └── test-utils/                # Storybook testing helpers
│       │       └── animations-settled.ts
│       │
│       └── README.md                      # Storybook organization guidelines
│
├── tests/
│   └── storybook/
│       └── consistency.test.ts
│
├── public/
│
├── vitest.config.ts
├── vitest.shims.d.ts
├── .eslintrc.cjs
└── package.json
```

**Structure note:** The tree illustrates the intended organization and representative files. Create directories only when there is a real file or responsibility for them. Keep existing application folders and files that are not part of Storybook outside this Storybook-specific structure.

## 3. Folder Responsibilities

### `.storybook/`

Contains Storybook's root configuration and global preview setup.

- `main.ts`: Story discovery, framework configuration, addons, static asset directories, and other Storybook settings.
- `preview.tsx`: Global decorators, providers, themes, toolbar settings, parameters, and preview configuration.

Keep application components, screen prototypes, and general-purpose utilities out of this directory.

### `src/storybook/docs/`

Contains documentation intended to be presented or maintained as part of the Storybook experience.

Examples include:

- Introduction and onboarding documentation.
- Design-system usage guidelines.
- Component mapping and migration documentation.
- Other Storybook-specific reference material.

### `src/storybook/foundations/`

Contains Storybook-only design-system reference pages, such as:

- Design token references.
- Color palette documentation.
- Typography references.
- Icon references.
- Foundation overview pages.

Actual design-system implementations must remain in `src/ds/`.

### `src/storybook/screens/`

Contains full-page demonstrations and prototypes created exclusively for Storybook.

Organize these by the screen or business domain they demonstrate, for example:

- `app/`
- `organization/`
- `company-profile/`
- `media-gallery/`

A screen may have its own components, hooks, types, constants, fixtures, and utilities when those resources are specific to that screen. Avoid adding empty or speculative layers.

Do not move production pages or production components here simply because they are also displayed in Storybook.

### `src/storybook/support/`

Contains resources genuinely shared by multiple Storybook stories or prototypes.

- `assets/`: Images, SVGs, and other assets used only by Storybook.
- `fixtures/`: Shared mock data, personas, and demonstration datasets.
- `decorators/`: Reusable story decorators and layout wrappers.
- `test-utils/`: Helpers used by Storybook browser tests.

A fixture, asset, or helper used by only one story or screen should normally remain close to that owner. Do not turn `support/` into a dumping ground for every Storybook-related file.

### `tests/storybook/`

Contains Storybook-specific structural, consistency, and related test checks that are not owned by an individual component or prototype.

Keep the existing Vitest setup and update its references if test files are moved. Do not relocate unrelated application unit tests into this directory.

## 4. Story Colocation Rules

Stories should remain beside the components they document:

- Design-system component stories stay beside their components in `src/ds/`.
- Application component stories stay beside their components in the relevant application directory.
- Storybook-only prototype stories live with their prototypes under `src/storybook/screens/`.
- Foundation stories live in `src/storybook/foundations/`.
- Standalone Storybook documentation lives in `src/storybook/docs/`.

Do not create a central `src/stories/` directory for all component stories. The purpose of `src/storybook/` is to hold Storybook-exclusive resources, not to separate every story from the component it documents.

## 5. Rules for Shared and Storybook-Specific Resources

1. **Application code stays in the application layer.** Production components, business logic, and production data must not depend on Storybook-only resources.
2. **Design-system code stays in `ds/`.** Components, patterns, effects, providers, hooks, styles, and reusable design-system utilities remain within the existing design-system boundary.
3. **Storybook-only code stays in `storybook/`.** Prototypes, documentation pages, shared demo resources, and Storybook-specific helpers belong in the dedicated Storybook directory.
4. **Shared means genuinely shared.** Move a resource into `support/` only when multiple Storybook consumers need the same responsibility.
5. **Keep production data separate from demonstration data.** Sample data required by actual application screens remains application-owned, even when Storybook also consumes it.
6. **Avoid duplicated demo data.** Reuse shared fixtures when multiple stories require the same demonstration entities.
7. **Avoid unnecessary abstractions.** Do not create additional components, wrappers, utilities, or directory levels without a clear requirement.
8. **Preserve existing behavior.** Moving Storybook resources must not break application imports, component behavior, providers, themes, or tests.

## 6. Storybook Configuration and Tooling

Any folder restructuring must account for existing configuration and tooling. Review and update the following wherever required:

- `.storybook/main.ts`: Story discovery paths, static asset paths, and dependency optimization.
- `.storybook/preview.tsx`: Global decorators, providers, theme imports, and preview configuration.
- `vitest.config.ts`: Storybook test configuration and directory references.
- `vitest.shims.d.ts`: Browser testing types, if affected.
- `.eslintrc.cjs`: Storybook-specific lint rules and file matching.
- Storybook consistency tests and other folder-dependent checks.
- Existing package scripts and static asset references.

Prefer explicit Storybook story-discovery locations over unnecessarily scanning the entire `src/` directory, while ensuring every intended story and MDX page is still discovered.

Preserve existing addons, Vitest browser testing, accessibility checks, and other working configurations. Do not replace existing configuration wholesale just to implement the folder structure.

## 7. Migration Guidelines

Perform Storybook restructuring incrementally rather than moving everything in one change.

Recommended implementation order:

1. **Prepare the target directories:** Establish only the Storybook directories required by the files being migrated.
2. **Organize documentation and foundations:** Move Storybook-only MDX documentation and foundation reference pages.
3. **Consolidate screen prototypes:** Move Storybook-only prototypes into the appropriate `screens/` domain directories.
4. **Organize shared support resources:** Consolidate genuinely shared assets, fixtures, decorators, and test utilities.
5. **Update configuration and tooling:** Update story discovery, test configuration, consistency checks, lint rules, imports, and dependency optimization where required.
6. **Verify the result:** Build Storybook, run its browser tests and accessibility checks, verify sidebar organization, and build the application.

Before moving any file, inspect its imports and all existing consumers. Separate production dependencies from Storybook-only dependencies first.

Do not delete, overwrite, or silently discard existing files, uncommitted changes, or staged changes during migration. Review the Git working tree before and after each migration chunk.

## 8. Guiding Principle

**Keep application code in the application layer, design-system code in `ds/`, and Storybook-exclusive resources in `storybook/`. Keep component stories colocated with their components and centralize only genuinely shared Storybook resources.**

The objective is to maintain a clean, discoverable, scalable, and easy-to-maintain Storybook ecosystem without unnecessarily changing the existing application architecture.

The Storybook organization defined here must remain consistent with the overall WiseTech frontend architecture documented in `WISETECH_RECOMMENDED_FOLDER_STRUCTURE.md`.

---

## 9. Official References

Use the official Storybook documentation as the reference when maintaining or changing the setup:

- [Storybook configuration](https://storybook.js.org/docs/configure)
- [Main configuration and story discovery](https://storybook.js.org/docs/api/main-config/main-config-stories)
- [Writing stories](https://storybook.js.org/docs/writing-stories)
- [Component hierarchy and naming](https://storybook.js.org/docs/writing-stories/naming-components-and-hierarchy)
- [Storybook tags](https://storybook.js.org/docs/writing-stories/tags)
- [MDX documentation](https://storybook.js.org/docs/writing-docs/mdx)
- [Assets and resources](https://storybook.js.org/docs/configure/integration/images-and-assets)
- [Vitest addon](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon)
