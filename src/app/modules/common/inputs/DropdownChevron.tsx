import { components } from "react-select";

/**
 * Shared animated chevron for every react-select dropdown in the app — points down when
 * closed, flips 180° the moment the menu opens, and eases back when it closes. Pass `color`
 * to match a variant's existing stroke color (e.g. the colored/avatar dropdown options);
 * omit it to inherit the surrounding text color.
 */
function DropdownChevron({ color, ...props }: any) {
    return (
        <components.DropdownIndicator {...props}>
            <svg
                width="16"
                height="16"
                viewBox="0 0 20 20"
                fill="none"
                style={{
                    transform: props.selectProps?.menuIsOpen ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.2s ease",
                }}
            >
                <path
                    d="M5 7.5L10 12.5L15 7.5"
                    stroke={color || "currentColor"}
                    strokeWidth="1.67"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
        </components.DropdownIndicator>
    );
}

export default DropdownChevron;
