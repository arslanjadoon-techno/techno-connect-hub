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
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="rounded-2xl bg-gradient-hero p-6 md:p-8 text-primary-foreground shadow-elegant">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-white/15 flex items-center justify-center">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Privacy Policy</h1>
            <p className="text-sm md:text-base opacity-90">
              Last updated: July 2026 &middot; T-Communications LLC
            </p>
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6 text-muted-foreground leading-relaxed">
          This page is maintained by T-Communications LLC to explain how the Commission Portal
          handles employee information. It applies to all users of the internal portal and should be
          read alongside your employment agreement and company policies. The content below is
          provided for informational purposes and does not constitute legal advice.
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {sections.map((s) => (
          <Card key={s.title} className="transition-smooth hover:shadow-elegant">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <span className="h-9 w-9 rounded-lg bg-gradient-primary text-primary-foreground flex items-center justify-center shadow-glow">
                  <s.icon className="h-4 w-4" />
                </span>
                {s.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground leading-relaxed">{s.body}</CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Policy Updates</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground leading-relaxed">
          We may update this privacy policy from time to time to reflect changes in our practices or
          legal requirements. Material changes will be communicated through the portal or via your
          registered work email.
        </CardContent>
      </Card>
    </div>
  );
}
