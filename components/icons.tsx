import {
  Archive,
  BarChart3,
  BrainCircuit,
  Building2,
  Database,
  Gauge,
  GitMerge,
  Home,
  LayoutGrid,
  LineChart,
  ListChecks,
  Network,
  Radar,
  Settings,
  UploadCloud,
  UsersRound,
  Workflow
} from "lucide-react";

export const iconMap = {
  Archive,
  BarChart3,
  BrainCircuit,
  Building2,
  Database,
  Gauge,
  GitMerge,
  Home,
  LayoutGrid,
  LineChart,
  ListChecks,
  Network,
  Radar,
  Settings,
  UploadCloud,
  UsersRound,
  Workflow
};

export function WorkspaceIcon({ name, className }: { name: string; className?: string }) {
  const Icon = iconMap[name as keyof typeof iconMap] ?? Database;
  return <Icon className={className} aria-hidden="true" />;
}

