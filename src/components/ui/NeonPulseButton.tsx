import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ReactNode,
} from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export type ButtonVariant = "neon" | "glass" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

interface BaseProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Trailing icon. Defaults to an arrow; pass `false` for none. */
  trailingIcon?: ReactNode | false;
  className?: string;
  children: ReactNode;
}

type LinkProps = BaseProps & {
  /** Router destination — renders a <Link>. */
  to: string;
} & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof BaseProps | "href">;

type ActionProps = BaseProps & {
  to?: undefined;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof BaseProps>;

export type NeonPulseButtonProps = LinkProps | ActionProps;

const VARIANT: Record<ButtonVariant, string> = {
  neon:
    "bg-gold-400 text-[#030305] shadow-[0_0_30px_rgba(0,229,255,0.2)] hover:bg-gold-300 hover:shadow-[0_0_44px_rgba(0,229,255,0.38)]",
  glass:
    "border border-white/10 bg-white/[0.04] text-ink-900 backdrop-blur-xl hover:border-gold-400/40 hover:bg-white/[0.07] hover:shadow-[0_0_30px_rgba(0,240,255,0.15)]",
  ghost: "text-ink-700 hover:bg-white/[0.05] hover:text-ink-950",
};

const SIZE: Record<ButtonSize, string> = {
  sm: "px-4 py-1.5 text-sm gap-1.5",
  md: "px-6 py-2.5 text-sm gap-2",
  lg: "px-8 py-3.5 text-base gap-2.5",
};

/**
 * Primary call-to-action. Scales up on hover, presses down on click, and the
 * trailing arrow slides — every state answers the pointer immediately.
 */
export default function NeonPulseButton(props: NeonPulseButtonProps) {
  const {
    variant = "neon",
    size = "md",
    trailingIcon,
    className = "",
    children,
  } = props;

  const classes =
    "group inline-flex items-center justify-center rounded-full font-semibold tracking-tight " +
    "transition-all duration-300 ease-snap hover:scale-[1.02] active:scale-[0.97] " +
    "focus:outline-hidden focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#030305] " +
    "disabled:pointer-events-none disabled:opacity-50 " +
    VARIANT[variant] +
    " " +
    SIZE[size] +
    (className ? " " + className : "");

  const icon =
    trailingIcon === false ? null : (
      <span className="transition-transform duration-300 ease-snap group-hover:translate-x-1" aria-hidden>
        {trailingIcon ?? <ArrowRight className="h-4 w-4" />}
      </span>
    );

  if (props.to !== undefined) {
    const {
      to,
      variant: _v,
      size: _s,
      trailingIcon: _t,
      className: _c,
      children: _ch,
      ...anchor
    } = props;
    return (
      <Link to={to} className={classes} {...anchor}>
        {children}
        {icon}
      </Link>
    );
  }

  const {
    to: _to,
    variant: _v,
    size: _s,
    trailingIcon: _t,
    className: _c,
    children: _ch,
    type,
    ...button
  } = props;
  return (
    <button type={type ?? "button"} className={classes} {...button}>
      {children}
      {icon}
    </button>
  );
}
