# Overview

Follow these guidelines when generating or modifying code for this project.

## Directory Structure

1. Routes are stored in `app`.
2. All components are stored in `components`.
3. Shadcn UI components are stored in `components/ui`, highly customized common components are stored in `components/common`.
4. Custom hooks are stored in `hooks`.
5. Shared utilities are stored in `lib`.
6. `lib/constants` — store application-wide constants (strings, keys, feature flags).
7. `lib/utils` — pure utility functions and helpers (no side effects).
8. `lib/api` — API clients, request builders, and network utilities.
9. Store common constants, utils, api in `common/<name>.ts` file inside the respective directory.
10. Store feature-specific constants in `<feature>/<name>.ts` file inside the respective directory.
11. Static assets are stored in `public`.
12. Global styles and SCSS modules are stored in `styles`.
13. Make sure to include index files in the leaf directories for `components`, `hooks` and `lib` .

## Naming Conventions

1. Use `PascalCase` for component, interface, type, and enum names.
2. Use `camelCase` for variables, functions, hooks, and props.
3. Use `PascalCase` for `.tsx` files.
4. Use `kebab-case` for `.ts` file.
5. Use `CONSTANT_CASE` for constants and enum keys.
6. Use `kebab-case` for all folders.

## Import Patterns

1. Use alias imports (`@/*`) for all imports except files in the same directory or a child (sub) directory.
2. Group imports into **exactly three blocks**.
3. Import order must be:
   1. Built-in packages and third-party libraries.
   2. Components.
   3. Everything else (hooks, lib, services, types, constants, styles, etc.).
4. Do not add section comments between import groups.

## Common Guidelines

1. Do **not** use `any`.
2. Use interfaces for component props.
3. Reuse existing types whenever possible.
4. Prefer type inference when it improves readability.
5. Use Tailwind CSS utility classes whenever possible.
6. Do **not** use arbitrary Tailwind values such as `text-[32px]`, `z-[100]`, `grid-cols-[1fr_2fr]`, `bg-[#fff]`, `text-[#1A1A1A]`, `border-[#E5E7EB]`, `rgb(...)`, or `hsl(...)`,etc.
7. Write self-explanatory code instead of relying on comments.
8. Keep every source code file at **600 lines or fewer**. If a file exceeds 600 lines, refactor the code where possible. If it cannot be reasonably refactored, bifurcate it into separate files.

## Utility Functions

1. Always use the existing `cn` utility whenever conditional class names are required.
2. Do not manually concatenate class names using template literals or string concatenation if `cn` can be used.
3. Reuse existing utility functions before creating new ones.

## API Interaction

1. Follow the existing API interaction pattern throughout the project.
2. Always initialize a default error message before making an API call.
3. Always initialize `isError` as `true`.
4. Use a single `message` variable for both success and error messages.
5. Assign `response.data?.message` to `message` after receiving the API response.
6. Use `response.data?.success` to determine whether the operation was successful.
7. Set `isError = false` only when `response.data?.success` is `true`.
8. Do not create a separate `successMessage` variable when the API provides `response.data?.message`.
9. Use `isAxiosError()` to safely extract error messages from API responses.
10. Display success and error toasts only inside the `finally` block.
11. Always reset loading/submitting states inside the `finally` block.
12. Use the existing toast implementation in the file/project. Do not introduce a new toast abstraction unless explicitly instructed.
13. Follow the pattern below unless explicitly instructed otherwise.

```ts
let message = "Something went wrong. Please try again.";
let isError = true;

try {
  const response = await apiCall();

  message = response.data?.message || message;

  if (response.data?.success) {
    isError = false;

    // success logic
  }
} catch (error) {
  if (isAxiosError(error)) {
    message = error.response?.data?.message || message;
  }
} finally {
  if (isError) {
    toast.error(message);
  } else {
    toast.success(message);
  }

  setIsSubmitting(false);
}
```

## Enums

1. Use enums whenever a value represents a fixed set of predefined options.
2. Avoid hardcoded string literals throughout the application.
3. Reuse existing enums before creating new ones.

## React State

1. Always explicitly specify the generic type when using React state.
2. Do not rely on implicit type inference for `useState`.

Example:

```ts
const [mobileNumber, setMobileNumber] = useState<string>("");
```

## Reusable Components

1. Always reuse existing common components before creating new ones.
2. Do not use native HTML elements if an equivalent reusable component already exists.
3. Prefer the following shared components whenever applicable:
   - `src/components/ui/button/Button.tsx`
   - `src/components/form/input/InputField.tsx`
4. Create a new reusable component only if the existing components cannot satisfy the requirement without unnecessary modifications.

## Code Reusability

1. Before creating any new component, hook, utility, enum, type, interface, or constant, always check whether an existing implementation can be reused.
2. Extend existing code whenever possible instead of creating duplicate implementations.
3. Avoid duplicating business logic, validation logic, utility functions, and UI components.
