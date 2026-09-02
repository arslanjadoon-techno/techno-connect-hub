import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, Lock, Database, UserCheck, Cookie, Mail } from "lucide-react";

const sections = [
  {
    icon: Database,
    title: "Information We Collect",
    body: "We collect information you provide directly, such as your name, work email, NTID, and role, as well as commission and leave data generated through your use of the Commission Portal.",
    cardBg: "bg-blue-50/80 dark:bg-blue-950/25 border-blue-200/80 dark:border-blue-900/40",
    iconBg: "bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-300",
    titleColor: "text-blue-950 dark:text-blue-100",
    bodyColor: "text-blue-900/80 dark:text-blue-200/80",
  },
  {
    icon: UserCheck,
    title: "How We Use Your Information",
    body: "Your information is used to authenticate access, calculate commissions, process leave requests, and provide reporting to your market managers and administrators.",
    cardBg: "bg-emerald-50/80 dark:bg-emerald-950/25 border-emerald-200/80 dark:border-emerald-900/40",
    iconBg: "bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-300",
    titleColor: "text-emerald-950 dark:text-emerald-100",
    bodyColor: "text-emerald-900/80 dark:text-emerald-200/80",
  },
  {
    icon: Lock,
    title: "Data Security",
    body: "Access is protected via secure authentication tokens and role-based access controls. Data is transmitted over HTTPS and access to sensitive records is restricted to authorized personnel only.",
    cardBg: "bg-amber-50/80 dark:bg-amber-950/25 border-amber-200/80 dark:border-amber-900/40",
    iconBg: "bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-300",
    titleColor: "text-amber-950 dark:text-amber-100",
    bodyColor: "text-amber-900/80 dark:text-amber-200/80",
  },
  {
    icon: Cookie,
    title: "Cookies & Local Storage",
    body: "The portal uses browser local storage to keep you signed in and to remember your theme preference. No third-party advertising cookies are used.",
    cardBg: "bg-violet-50/80 dark:bg-violet-950/25 border-violet-200/80 dark:border-violet-900/40",
    iconBg: "bg-violet-100 dark:bg-violet-900/60 text-violet-600 dark:text-violet-300",
    titleColor: "text-violet-950 dark:text-violet-100",
    bodyColor: "text-violet-900/80 dark:text-violet-200/80",
  },
  {
    icon: ShieldCheck,
    title: "Your Rights",
    body: "You may request access to, correction of, or deletion of your personal data by contacting your manager or the support team. Certain data may be retained where required for legal or business purposes.",
    cardBg: "bg-rose-50/80 dark:bg-rose-950/25 border-rose-200/80 dark:border-rose-900/40",
    iconBg: "bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-300",
    titleColor: "text-rose-950 dark:text-rose-100",
    bodyColor: "text-rose-900/80 dark:text-rose-200/80",
  },
  {
    icon: Mail,
    title: "Contact Us",
    body: "For any privacy-related questions, please email reporting@texasmobilepcs.com. We aim to respond within 5 business days.",
    cardBg: "bg-teal-50/80 dark:bg-teal-950/25 border-teal-200/80 dark:border-teal-900/40",
    iconBg: "bg-teal-100 dark:bg-teal-900/60 text-teal-600 dark:text-teal-300",
    titleColor: "text-teal-950 dark:text-teal-100",
    bodyColor: "text-teal-900/80 dark:text-teal-200/80",
  },
];

export default function Privacy() {
  return (
    <div className="space-y-6 max-w-5xl animate-fade-in">
      <div>
        <h1 className="font-display text-2xl font-semibold">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground">
          Last updated: July 2026 &middot; T-Communications LLC
        </p>
      </div>

      <Card className="border border-border/80 bg-card">
        <CardContent className="pt-6 text-muted-foreground leading-relaxed">
          This page is maintained by T-Communications LLC to explain how the Commission Portal
          handles employee information. It applies to all users of the internal portal and should be
          read alongside your employment agreement and company policies. The content below is
          provided for informational purposes and does not constitute legal advice.
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {sections.map((s) => (
          <Card key={s.title} className={`transition-all hover:shadow-md ${s.cardBg}`}>
            <CardHeader className="pb-2">
              <CardTitle className={`flex items-center gap-3 text-base font-semibold ${s.titleColor}`}>
                <span className={`h-9 w-9 rounded-lg flex items-center justify-center shadow-xs shrink-0 ${s.iconBg}`}>
                  <s.icon className="h-5 w-5" />
                </span>
                {s.title}
              </CardTitle>
            </CardHeader>
            <CardContent className={`text-sm leading-relaxed ${s.bodyColor}`}>
              {s.body}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Policy Updates</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground leading-relaxed">
          We may update this privacy policy from time to time to reflect changes in our practices or
          legal requirements. Material changes will be communicated through the portal or via your
          registered work email.
        </CardContent>
      </Card>
    </div>
  );
}
