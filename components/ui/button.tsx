import type { ButtonHTMLAttributes, AnchorHTMLAttributes } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-primary-btn bg-primary text-white border-primary-strong shadow-primary hover:bg-primary-hover active:translate-y-px",
  secondary: "bg-white text-text border-border shadow-xs hover:bg-surface-muted hover:border-border-strong",
  ghost: "bg-transparent text-text-muted border-transparent hover:bg-surface-muted hover:text-text",
  danger: "bg-danger text-white border-danger shadow-primary hover:bg-red-800 active:translate-y-px"
};

const base =
  "inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-md border px-3.5 py-2 text-sm font-semibold tracking-tight transition duration-200 disabled:cursor-not-allowed disabled:opacity-50";

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button className={cn(base, variants[variant], className)} {...props} />
  );
}

export function ButtonLink({
  className,
  variant = "primary",
  href,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & { variant?: ButtonVariant; href: string }) {
  return (
    <Link href={href} className={cn(base, variants[variant], className)} {...props} />
  );
}

