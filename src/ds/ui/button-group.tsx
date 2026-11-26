import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { Separator } from "./separator"

import { cn } from "cn"

/** `JOINED`: outlined buttons fused into one pill. `TRAY`: one outline around ghost buttons that keep their shape. */
export enum ButtonGroupVariant {
  JOINED = "joined",
  TRAY = "tray",
}

export enum ButtonGroupOrientation {
  HORIZONTAL = "horizontal",
  VERTICAL = "vertical",
}

const buttonGroupVariants = cva(
  "flex w-fit items-stretch *:focus-visible:relative *:focus-visible:z-10 has-[>[data-slot=button-group]]:gap-2 has-[select[aria-hidden=true]:last-child]:[&>[data-slot=select-trigger]:last-of-type]:rounded-r-4xl [&>[data-slot=select-trigger]:not([class*='w-'])]:w-fit [&>input]:flex-1",
  {
    variants: {
      variant: {
        [ButtonGroupVariant.JOINED]: "",
        [ButtonGroupVariant.TRAY]: "rounded-4xl ring-1 ring-border",
      },
      orientation: {
        [ButtonGroupOrientation.HORIZONTAL]: "",
        [ButtonGroupOrientation.VERTICAL]: "flex-col",
      },
    },
    compoundVariants: [
      {
        variant: ButtonGroupVariant.JOINED,
        orientation: ButtonGroupOrientation.HORIZONTAL,
        className:
          "*:data-slot:rounded-r-none [&>[data-slot]:not(:has(~[data-slot]))]:rounded-r-4xl! [&>[data-slot]~[data-slot]]:rounded-l-none [&>[data-slot]~[data-slot]]:border-l-0",
      },
      {
        variant: ButtonGroupVariant.JOINED,
        orientation: ButtonGroupOrientation.VERTICAL,
        className:
          "*:data-slot:rounded-b-none [&>[data-slot]:not(:has(~[data-slot]))]:rounded-b-4xl! [&>[data-slot]~[data-slot]]:rounded-t-none [&>[data-slot]~[data-slot]]:border-t-0",
      },
    ],
    defaultVariants: {
      variant: ButtonGroupVariant.JOINED,
      orientation: ButtonGroupOrientation.HORIZONTAL,
    },
  }
)

interface ButtonGroupProps extends React.ComponentProps<"div">, VariantProps<typeof buttonGroupVariants> {}

function ButtonGroup({ className, variant, orientation, ...props }: ButtonGroupProps) {
  return (
    <div
      role="group"
      data-slot="button-group"
      data-variant={variant}
      data-orientation={orientation}
      className={cn(buttonGroupVariants({ variant, orientation }), className)}
      {...props}
    />
  )
}

function ButtonGroupText({
  className,
  render,
  ...props
}: useRender.ComponentProps<"div">) {
  return useRender({
    defaultTagName: "div",
    props: mergeProps<"div">(
      {
        className: cn(
          "flex items-center gap-2 rounded-4xl border bg-muted px-2.5 text-sm font-medium [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4",
          className
        ),
      },
      props
    ),
    render,
    state: {
      slot: "button-group-text",
    },
  })
}

function ButtonGroupSeparator({
  className,
  orientation = ButtonGroupOrientation.VERTICAL,
  ...props
}: React.ComponentProps<typeof Separator>) {
  return (
    <Separator
      data-slot="button-group-separator"
      orientation={orientation}
      className={cn(
        "relative self-stretch bg-input data-horizontal:mx-px data-horizontal:w-auto data-vertical:my-px data-vertical:h-auto",
        className
      )}
      {...props}
    />
  )
}

export {
  ButtonGroup,
  ButtonGroupSeparator,
  ButtonGroupText,
  buttonGroupVariants,
}
