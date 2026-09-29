
import Dashboard from "./Dashboard";
import type { ReportView } from "./types";

type ReportingAppProps = {
  initialView: ReportView;
};

export default function ReportingApp({ initialView }: ReportingAppProps) {
  return <Dashboard initialView={initialView} />;
}
``
