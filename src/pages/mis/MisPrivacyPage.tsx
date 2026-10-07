import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, Lock, Database, UserCheck, Cookie, Mail, Server, Eye } from "lucide-react";

const sections = [
  {
    icon: Database,
    title: "Information We Collect",
    body: "We collect organizational and employee data including user names, enterprise emails, employee IDs, department assignments, phone numbers, and operational activity logs generated across the Management Information System (MIS).",
    cardBg: "bg-blue-50/80 dark:bg-blue-950/25 border-blue-200/80 dark:border-blue-900/40",
    iconBg: "bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-300",
    titleColor: "text-blue-950 dark:text-blue-100",
    bodyColor: "text-blue-900/80 dark:text-blue-200/80",
  },
  {
    icon: UserCheck,
    title: "How We Use Information",
    body: "Data is utilized for enterprise identity verification, portal authorization, department and hierarchy routing, support ticket management, operational reporting, and organizational analytics.",
    cardBg:
      "bg-emerald-50/80 dark:bg-emerald-950/25 border-emerald-200/80 dark:border-emerald-900/40",
    iconBg: "bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-300",
    titleColor: "text-emerald-950 dark:text-emerald-100",
    bodyColor: "text-emerald-900/80 dark:text-emerald-200/80",
  },
  {
    icon: Lock,
    title: "Data Security & Access Controls",
    body: "Enterprise authentication is enforced via JWT session tokens and Two-Factor Authentication (2FA). Granular role-based access control (RBAC) restricts internal records strictly to verified personnel.",
    cardBg: "bg-amber-50/80 dark:bg-amber-950/25 border-amber-200/80 dark:border-amber-900/40",
    iconBg: "bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-300",
    titleColor: "text-amber-950 dark:text-amber-100",
    bodyColor: "text-amber-900/80 dark:text-amber-200/80",
  },
  {
    icon: Cookie,
    title: "Session Storage & Preferences",
    body: "The MIS platform employs browser local storage exclusively for active session management, user credentials cache, and UI preferences (such as light/dark mode). No third-party ad tracking or external telemetry cookies are utilized.",
    cardBg: "bg-violet-50/80 dark:bg-violet-950/25 border-violet-200/80 dark:border-violet-900/40",
    iconBg: "bg-violet-100 dark:bg-violet-900/60 text-violet-600 dark:text-violet-300",
    titleColor: "text-violet-950 dark:text-violet-100",
    bodyColor: "text-violet-900/80 dark:text-violet-200/80",
  },
  {
    icon: ShieldCheck,
    title: "Employee Rights & Record Auditing",
    body: "Authorized personnel may review, audit, or request updates to their departmental profile data through their department manager or the MIS administrative portal in accordance with corporate data retention protocols.",
    cardBg: "bg-rose-50/80 dark:bg-rose-950/25 border-rose-200/80 dark:border-rose-900/40",
    iconBg: "bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-300",
    titleColor: "text-rose-950 dark:text-rose-100",
    bodyColor: "text-rose-900/80 dark:text-rose-200/80",
  },
  {
    icon: Mail,
    title: "Contact System Administration",
    body: "For questions regarding internal data handling, permissions adjustment, or security inquiries, contact the MIS administrative team at support@active8wireless.com or via the internal ticketing module.",
    cardBg: "bg-teal-50/80 dark:bg-teal-950/25 border-teal-200/80 dark:border-teal-900/40",
    iconBg: "bg-teal-100 dark:bg-teal-900/60 text-teal-600 dark:text-teal-300",
    titleColor: "text-teal-950 dark:text-teal-100",
    bodyColor: "text-teal-900/80 dark:text-teal-200/80",
  },
];

export default function MisPrivacyPage() {
  return (
    <div className="space-y-6 max-w-5xl animate-fade-in pb-10">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">MIS Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Last updated: October 2026 &middot; Active8 Wireless Management Information System (MIS)
        </p>
      </div>

      <Card className="border border-border/80 bg-card">
        <CardContent className="pt-6 text-muted-foreground leading-relaxed text-sm">
          This policy applies to all internal users, store managers, district directors, and
          administrators accessing the Active8 Wireless Management Information System (MIS). It
          governs how enterprise operational data, department rosters, user identities, and system
          records are gathered, processed, and safeguarded. This platform is strictly for authorized
          business operations and personnel management.
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {sections.map((s) => (
          <Card key={s.title} className={`transition-all hover:shadow-md ${s.cardBg}`}>
            <CardHeader className="pb-2">
              <CardTitle
                className={`flex items-center gap-3 text-base font-semibold ${s.titleColor}`}
              >
                <span
                  className={`h-9 w-9 rounded-lg flex items-center justify-center shadow-xs shrink-0 ${s.iconBg}`}
                >
                  <s.icon className="h-5 w-5" />
                </span>
                {s.title}
              </CardTitle>
            </CardHeader>
            <CardContent className={`text-sm leading-relaxed ${s.bodyColor}`}>{s.body}</CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Server className="h-4 w-4 text-primary" />
              Enterprise Infrastructure & Compliance
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground leading-relaxed">
            All server transactions and database queries are hosted within dedicated enterprise
            cloud environments with continuous threat monitoring, regular backups, and strict
            separation between operational portals.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Eye className="h-4 w-4 text-primary" />
              Policy Review & Revisions
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground leading-relaxed">
            We regularly update system protocols to reflect organizational changes and technological
            upgrades. Any substantive policy adjustments are notified directly via portal
            announcements or corporate administrative updates.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
