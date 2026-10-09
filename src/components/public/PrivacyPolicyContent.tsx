import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck,
  Lock,
  Database,
  UserCheck,
  Share2,
  Cpu,
  Trash2,
  Mail,
  Building2,
  FileText,
  MapPin,
  Flame,
  BarChart3,
  Globe,
  Clock,
  Server,
  AlertCircle,
  HelpCircle,
} from "lucide-react";

export default function PrivacyPolicyContent() {
  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="border-b border-border/60 pb-6">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <Badge variant="outline" className="text-primary border-primary/30 bg-primary/5">
            Official Policy
          </Badge>
          <span className="text-xs text-muted-foreground">
            Effective & Last Updated: October 2026
          </span>
        </div>
        <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm sm:text-base text-muted-foreground max-w-3xl leading-relaxed">
          This Privacy Policy describes how the Active8 Wireless Management Information System (MIS)
          and associated portals collect, use, safeguard, and manage user and employee personal
          data. It outlines your rights and our obligations in compliance with data privacy
          standards and enterprise operational requirements.
        </p>
      </div>

      {/* Point 1: App Name & Contact Information */}
      <Card className="border-primary/20 bg-primary/5 shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2.5 text-foreground">
            <Building2 className="h-5 w-5 text-primary" />
            1. App Name & Official Contact Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-foreground/90 leading-relaxed">
          <p>
            <strong>Application Name:</strong> Active8 Wireless Management Information System (MIS)
            / Techno MIS Portal (operated by Active8 Wireless LLC).
          </p>
          <p>
            If you have questions, feedback, privacy inquiries, or account management requests,
            please reach out to our official contacts:
          </p>
          <div className="grid sm:grid-cols-3 gap-3 pt-1">
            <div className="p-3 rounded-lg bg-background border border-border/60">
              <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                Administrative Inquiries
              </div>
              <a
                href="mailto:admin@techno.com"
                className="font-medium text-primary hover:underline block mt-0.5 text-sm"
              >
                admin@techno.com
              </a>
            </div>
            <div className="p-3 rounded-lg bg-background border border-border/60">
              <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                Technical Support
              </div>
              <a
                href="mailto:reporting@texasmobilepcs.com"
                className="font-medium text-primary hover:underline block mt-0.5 text-sm"
              >
                reporting@texasmobilepcs.com
              </a>
            </div>
            <div className="p-3 rounded-lg bg-background border border-border/60">
              <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                Support Telephone
              </div>
              <div className="font-medium text-foreground mt-0.5 text-sm">+92 (335) 8914611</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Point 2: What User Data You Collect */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2.5 text-foreground">
            <Database className="h-5 w-5 text-blue-500" />
            2. What User Data We Collect
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            To provide enterprise management tools, organizational hierarchy routing, and portal
            features, we collect the following categories of data:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-foreground/90">
            <li>
              <strong>Personal & Identity Information:</strong> Full name, employee ID / NTID, work
              email address, contact telephone number, and job designation.
            </li>
            <li>
              <strong>Organizational & Hierarchy Details:</strong> Department assignment, reporting
              structure, state, market, district, and retail store location assignments.
            </li>
            <li>
              <strong>Authentication & Security Credentials:</strong> Cryptographically hashed
              passwords, Two-Factor Authentication (2FA / TOTP) setup secrets, session JSON Web
              Tokens (JWT), login history, and IP address.
            </li>
            <li>
              <strong>Operational & Workflow Records:</strong> Employee attendance records, leave
              requests and approvals, commission tier performance metrics, store leasing and rent
              records, internal support tickets, and team chat communications.
            </li>
            <li>
              <strong>Technical & Device Diagnostics:</strong> Browser type, operating system,
              device characteristics, anonymized diagnostic crash logs, and portal feature access
              timestamps.
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Point 3: Why You Collect It */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2.5 text-foreground">
            <UserCheck className="h-5 w-5 text-emerald-500" />
            3. Why We Collect It (Purpose of Data Processing)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            We process collected data exclusively for authorized business and operational needs:
          </p>
          <div className="grid sm:grid-cols-2 gap-3 pt-1">
            <div className="p-3.5 rounded-lg border border-border/80 bg-muted/20">
              <div className="font-semibold text-foreground text-sm flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-500" /> Identity & Access Control
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Authenticating legitimate users, verifying 2FA credentials, and enforcing Role-Based
                Access Control (RBAC) across departments and portals.
              </p>
            </div>
            <div className="p-3.5 rounded-lg border border-border/80 bg-muted/20">
              <div className="font-semibold text-foreground text-sm flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-500" /> Operational Workflows
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Processing leave approvals, calculating monthly commissions, tracking lease
                contracts, and routing internal IT support tickets to the appropriate manager.
              </p>
            </div>
            <div className="p-3.5 rounded-lg border border-border/80 bg-muted/20">
              <div className="font-semibold text-foreground text-sm flex items-center gap-2">
                <MapPin className="h-4 w-4 text-amber-500" /> Hierarchy & Store Operations
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Aligning personnel with retail stores, district managers, and market performance
                rankings to maintain accurate business hierarchies.
              </p>
            </div>
            <div className="p-3.5 rounded-lg border border-border/80 bg-muted/20">
              <div className="font-semibold text-foreground text-sm flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-rose-500" /> Security & Compliance Auditing
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Monitoring system health, detecting unauthorized access attempts, preventing fraud,
                and maintaining non-repudiation audit trails for sensitive corporate actions.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Point 4: Whether You Share Data with Third Parties */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2.5 text-foreground">
            <Share2 className="h-5 w-5 text-indigo-500" />
            4. Whether We Share Data with Third Parties
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <div className="p-3 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 text-emerald-950 dark:text-emerald-100 font-medium">
            We do NOT sell, rent, monetize, trade, or share your personal data with third-party
            advertisers, data brokers, or marketing networks under any circumstances.
          </div>
          <p>
            Data is strictly shared only with authorized and vetted infrastructure service providers
            who support our enterprise operations (such as secure cloud servers and database
            hosting). All such providers are bound by strict non-disclosure, confidentiality, and
            data protection agreements.
          </p>
          <p>
            We may disclose information if required to do so by applicable law, enforceable
            governmental request, court order, or to protect the vital security and legal rights of
            the organization and its personnel.
          </p>
        </CardContent>
      </Card>

      {/* Point 5: Third-Party Services / SDKs */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2.5 text-foreground">
            <Cpu className="h-5 w-5 text-violet-500" />
            5. Third-Party Services & SDKs (Firebase, Google Analytics, Maps, etc.)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            Our application incorporates standard industry-grade enterprise software development
            kits (SDKs) and cloud integrations to provide seamless functionality:
          </p>
          <div className="space-y-3 pt-1">
            <div className="flex items-start gap-3 p-3 rounded-lg border border-border/80 bg-card">
              <Flame className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-foreground text-sm">Firebase (Google LLC)</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Used for real-time cloud data synchronization, secure push notifications,
                  serverless application hosting, and authentication infrastructure resilience.
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg border border-border/80 bg-card">
              <BarChart3 className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-foreground text-sm">
                  Google Analytics & Cloud Monitoring
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Employed for aggregated, anonymized usage telemetry, server error tracking,
                  latency monitoring, and platform stability diagnostics without personal profiling.
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg border border-border/80 bg-card">
              <Globe className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-foreground text-sm">Google Maps Platform</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Used in store manager and regional hierarchy tools to render retail store
                  locations, verify postal addresses, and display geographical territory boundaries
                  for districts and markets.
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg border border-border/80 bg-card">
              <Server className="h-5 w-5 text-slate-500 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-foreground text-sm">
                  Enterprise Cloud Infrastructure & Relational Databases
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Hosted on secure high-availability cloud servers with automated daily snapshots,
                  geo-redundant backups, and encrypted hardware security modules (HSM).
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Point 6: How Data is Secured */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2.5 text-foreground">
            <Lock className="h-5 w-5 text-amber-500" />
            6. How Data is Secured
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            We implement comprehensive technical and organizational safeguards to ensure data
            confidentiality, integrity, and availability:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-foreground/90">
            <li>
              <strong>Encryption in Transit:</strong> All HTTP traffic and API communications are
              strictly enforced over TLS 1.3 / HTTPS using modern cipher suites.
            </li>
            <li>
              <strong>Encryption at Rest:</strong> Internal databases, backup snapshots, and
              sensitive records are encrypted with AES-256 standard encryption.
            </li>
            <li>
              <strong>Multi-Factor Authentication (2FA):</strong> Time-based One-Time Password
              (TOTP) authenticator verification protects against credential exposure.
            </li>
            <li>
              <strong>Granular Role-Based Access Control (RBAC):</strong> Strict permission keys and
              geographical boundaries prevent unauthorized staff from reading cross-department
              records.
            </li>
            <li>
              <strong>Session Security & Inactivity Timeouts:</strong> Automatic inactivity timeout
              modals and short-lived JWT session expiration mitigate unattended terminal risks.
            </li>
            <li>
              <strong>Continuous Auditing:</strong> Routine vulnerability scans, penetration
              testing, and tamper-evident administrative audit logs.
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Point 7: Data Retention & Deletion */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2.5 text-foreground">
            <Clock className="h-5 w-5 text-teal-500" />
            7. Data Retention & Deletion Policy
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            We retain personal data only for as long as necessary to fulfill the business,
            operational, and legal purposes for which it was originally collected:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-foreground/90">
            <li>
              <strong>Active Accounts:</strong> User profile and hierarchy associations are retained
              throughout the duration of the employee's active relationship with the organization.
            </li>
            <li>
              <strong>Deactivated & Inactive Accounts:</strong> Once an employee leaves or their
              account is terminated, personal profiles are archived and queued for permanent
              deletion after the standard retention lifecycle (typically 30–90 days).
            </li>
            <li>
              <strong>Statutory & Regulatory Records:</strong> Certain financial audit, wage
              compensation, and commission tax records may be retained longer solely where required
              by prevailing labor and fiscal statutes.
            </li>
            <li>
              <strong>Transient Logs & Cache:</strong> Diagnostic server logs and temporary session
              tokens are purged automatically on rolling 30-day schedules.
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Point 8: How Users Can Request Deletion of Their Data / Account */}
      <Card className="border-rose-300 dark:border-rose-900/60 bg-rose-50/60 dark:bg-rose-950/20 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2.5 text-rose-950 dark:text-rose-100">
            <Trash2 className="h-5 w-5 text-rose-600 dark:text-rose-400" />
            8. How Users Can Request Deletion of Their Data / Account
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-rose-950/90 dark:text-rose-200/90 leading-relaxed">
          <div className="p-3.5 rounded-lg bg-background/80 border border-rose-200 dark:border-rose-900/50">
            <div className="font-semibold text-base text-foreground flex items-center gap-2">
              <Mail className="h-4 w-4 text-rose-600 dark:text-rose-400" />
              Direct Request Procedure:
            </div>
            <p className="mt-1 text-sm text-foreground">
              Users can request the complete deletion of their account and all associated personal
              data{" "}
              <strong>
                by contacting{" "}
                <a href="mailto:admin@techno.com" className="text-primary underline font-bold">
                  admin@techno.com
                </a>
              </strong>
              .
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-foreground text-sm mb-1.5">
              Step-by-Step Deletion Process:
            </h4>
            <ol className="list-decimal pl-5 space-y-1.5 text-xs sm:text-sm">
              <li>
                <strong>Compose an Email:</strong> Send a message from your registered company email
                address to{" "}
                <a href="mailto:admin@techno.com" className="font-semibold text-primary underline">
                  admin@techno.com
                </a>{" "}
                with the subject line: <em>&quot;Account Deletion Request&quot;</em> or{" "}
                <em>&quot;Personal Data Deletion Request&quot;</em>.
              </li>
              <li>
                <strong>Provide Necessary Verification:</strong> Include your full name, employee ID
                / NTID, assigned store/department, and contact phone number to enable identity
                validation.
              </li>
              <li>
                <strong>Verification & Processing:</strong> Our system administration team will
                verify your identity within <strong>5 business days</strong> to ensure unauthorized
                parties cannot compromise your profile.
              </li>
              <li>
                <strong>Permanent Removal:</strong> Upon verification, your account credentials,
                login tokens, contact info, and personal identifiers will be permanently expunged or
                anonymized from all production systems and databases within{" "}
                <strong>30 calendar days</strong>.
              </li>
              <li>
                <strong>Confirmation Notice:</strong> An official confirmation notification will be
                sent to you once the account and data deletion process has completed.
              </li>
            </ol>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
            <HelpCircle className="h-4 w-4 text-primary shrink-0" />
            <span>
              For urgent account lockouts or security-related deletion requests, you may also
              contact our administrative hotline at <strong>+92 (335) 8914611</strong>.
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
