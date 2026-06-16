import type { LucideIcon } from "lucide-react";

export type WorkspaceCode =
  | "WS01"
  | "WS02"
  | "WS03"
  | "WS04"
  | "WS05"
  | "WS06"
  | "WS07"
  | "WS08"
  | "WS09"
  | "WS10"
  | "WS11"
  | "WS12";

export type WorkspaceModule = {
  label: string;
  table: string;
  description: string;
  supportsAi?: boolean;
  supportsImport?: boolean;
};

export type WorkspaceDefinition = {
  code: WorkspaceCode;
  name: string;
  shortName: string;
  purpose: string;
  iconName: string;
  modules: WorkspaceModule[];
  upstream: string[];
  downstream: string[];
};

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

