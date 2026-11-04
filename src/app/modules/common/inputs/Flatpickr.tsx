import type { ComponentProps } from "react";
import FlatpickrModule from "react-flatpickr";
import { cjsDefault } from "@utils/cjsDefault";

// Import Flatpickr from here, not from "react-flatpickr" — see cjsDefault for why.
const BaseFlatpickr = cjsDefault(FlatpickrModule);

/**
 * With `altInput`, flatpickr shows a cloned input and sets the original to `type="hidden"`.
 * A class like `form-control` left on the original sets `display: block`, which beats the
 * browser's hidden-input rule, so the field rendered twice. The class goes to the visible
 * clone only.
 */
export default function Flatpickr({ className, options, ...rest }: ComponentProps<typeof BaseFlatpickr>) {
  if (!options?.altInput) return <BaseFlatpickr className={className} options={options} {...rest} />;
  return <BaseFlatpickr {...rest} options={className ? { altInputClass: className, ...options } : options} />;
}
