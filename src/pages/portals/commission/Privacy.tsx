import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, Lock, Database, UserCheck, Cookie, Mail } from "lucide-react";

const sections = [
  {
    icon: Database,
    title: "Information We Collect",
    body: "We collect information you provide directly, such as your name, work email, NTID, and role, as well as commission and leave data generated through your use of the Commission Portal.",
  },
  {
    icon: UserCheck,
    title: "How We Use Your Information",
    body: "Your information is used to authenticate access, calculate commissions, process leave requests, and provide reporting to your market managers and administrators.",
  },
  {
    icon: Lock,
    title: "Data Security",
    body: "Access is protected via secure authentication tokens and role-based access controls. Data is transmitted over HTTPS and access to sensitive records is restricted to authorized personnel only.",
  },
  {
    icon: Cookie,
    title: "Cookies & Local Storage",
    body: "The portal uses browser local storage to keep you signed in and to remember your theme preference. No third-party advertising cookies are used.",
  },
  {
    icon: ShieldCheck,
    title: "Your Rights",
    body: "You may request access to, correction of, or deletion of your personal data by contacting your manager or the support team. Certain data may be retained where required for legal or business purposes.",
  },
  {
    icon: Mail,
    title: "Contact Us",
    body: "For any privacy-related questions, please email reporting@texasmobilepcs.com. We aim to respond within 5 business days.",
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
          <Card key={s.title} className="transition-all hover:shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-3 text-base font-semibold">
                <span className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <s.icon className="h-5 w-5" />
                </span>
                {s.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground leading-relaxed">
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
