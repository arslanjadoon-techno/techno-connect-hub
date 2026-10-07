import { useState, FormEvent } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Mail,
  Phone,
  Clock,
  MessageSquare,
  HelpCircle,
  Send,
  CheckCircle2,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

const misFaqs = [
  {
    q: "How do I request access to an additional portal or feature?",
    a: "Portal access is governed by enterprise role-based permissions. Contact your department manager or submit a ticket specifying the requested portal (e.g., Commission, Leasing, Scheduling, or Ranker) along with your business justification.",
  },
  {
    q: "What should I do if my store, district, or market details are incorrect?",
    a: "Organizational hierarchy changes (such as store assignments or district alignments) can be updated by department managers or system administrators via the User Manager module. Submit an administrative ticket with the correct hierarchy details.",
  },
  {
    q: "How do I reset my password or configure Two-Factor Authentication (2FA)?",
    a: "Password resets can be initiated from the login screen using the 'Forgot Password' link. To reconfigure your 2FA authenticator app, contact the IT helpdesk with verification from your supervisor.",
  },
  {
    q: "Why do certain portals or options not appear in my sidebar?",
    a: "The navigation sidebar dynamically filters portals and administrative items based on your assigned enterprise roles and specific permission keys. If a critical tool is missing, submit an access request ticket.",
  },
  {
    q: "How frequently does MIS synchronize operational metrics and store records?",
    a: "Core personnel, store catalogs, and organizational hierarchies are synchronized in real time. Operational and performance feeds (e.g., sales activations, commission runs) refresh on automated daily batch cycles.",
  },
  {
    q: "How do I report an unexpected technical error or system glitch?",
    a: "Please fill out the ticket form below. Include the exact URL where the error occurred, the steps taken prior to the issue, and any displayed error notification so our development team can resolve it promptly.",
  },
];

export default function MisSupportPage() {
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState(user?.fullName || "");
  const [email, setEmail] = useState(user?.email || "");
  const [category, setCategory] = useState("general");
  const [priority, setPriority] = useState("normal");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);

    setTimeout(() => {
      setSubmitting(false);
      setSubject("");
      setMessage("");
      toast.success("Support ticket submitted. The MIS helpdesk will follow up shortly.");
    }, 600);
  };

  return (
    <div className="space-y-6 max-w-6xl animate-fade-in pb-10">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          MIS Support & Help Desk
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Get assistance with Active8 Wireless MIS, portal access, system troubleshooting, or
          account management.
        </p>
      </div>

      {/* Top 3 Highlights / Quick Contacts */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="transition-all hover:shadow-md bg-sky-50/80 dark:bg-sky-950/20 border-sky-200/80 dark:border-sky-900/40">
          <CardContent className="pt-6 flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-sky-100 dark:bg-sky-900/50 text-sky-600 dark:text-sky-300 flex items-center justify-center shrink-0 shadow-xs">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs text-sky-700/80 dark:text-sky-400 font-semibold uppercase tracking-wide">
                MIS Helpdesk Email
              </div>
              <div className="font-semibold text-sm mt-0.5 text-sky-950 dark:text-sky-100">
                support@active8wireless.com
              </div>
              <div className="text-xs text-sky-800/70 dark:text-sky-300/70 mt-0.5">
                Avg. response: &lt; 2 business hours
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="transition-all hover:shadow-md bg-emerald-50/80 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-900/40">
          <CardContent className="pt-6 flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-300 flex items-center justify-center shrink-0 shadow-xs">
              <Phone className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs text-emerald-700/80 dark:text-emerald-400 font-semibold uppercase tracking-wide">
                Direct Hotline
              </div>
              <div className="font-semibold text-sm mt-0.5 text-emerald-950 dark:text-emerald-100">
                +1 (800) 555-MIS8 &middot; ext. 104
              </div>
              <div className="text-xs text-emerald-800/70 dark:text-emerald-300/70 mt-0.5">
                Toll-free internal support
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="transition-all hover:shadow-md bg-amber-50/80 dark:bg-amber-950/20 border-amber-200/80 dark:border-amber-900/40">
          <CardContent className="pt-6 flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-300 flex items-center justify-center shrink-0 shadow-xs">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs text-amber-700/80 dark:text-amber-400 font-semibold uppercase tracking-wide">
                Operating Schedule
              </div>
              <div className="font-semibold text-sm mt-0.5 text-amber-950 dark:text-amber-100">
                Mon - Fri, 8:00 AM - 7:00 PM CST
              </div>
              <div className="text-xs text-amber-800/70 dark:text-amber-300/70 mt-0.5">
                24/7 on-call for critical incidents
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid: FAQs & Ticket Submission */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* FAQs */}
        <Card className="border border-border/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-primary" />
              Frequently Asked Questions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {misFaqs.map((f, i) => (
                <AccordionItem key={i} value={`item-${i}`}>
                  <AccordionTrigger className="text-left font-medium text-sm hover:no-underline">
                    {f.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed text-xs">
                    {f.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>

        {/* Submit Ticket Form */}
        <Card className="border border-border/80">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageSquare className="h-5 w-5 text-primary" />
              Submit an MIS Support Ticket
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="support-name">Your Name</Label>
                  <Input
                    id="support-name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Full name"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="support-email">Work Email</Label>
                  <Input
                    id="support-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@active8wireless.com"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Inquiry Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General MIS Inquiry</SelectItem>
                      <SelectItem value="permissions">User Roles & Permissions</SelectItem>
                      <SelectItem value="hierarchy">Store / District Hierarchy</SelectItem>
                      <SelectItem value="portal">Portal Access & Auth</SelectItem>
                      <SelectItem value="bug">Bug or Technical Error</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Priority</Label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low (General Inquiry)</SelectItem>
                      <SelectItem value="normal">Normal (Standard Request)</SelectItem>
                      <SelectItem value="high">High (Workflow Impaired)</SelectItem>
                      <SelectItem value="urgent">Urgent (System Blocker)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="support-subject">Subject</Label>
                <Input
                  id="support-subject"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Summary of the request or issue"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="support-message">Message Details</Label>
                <Textarea
                  id="support-message"
                  required
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Provide comprehensive details, relevant URLs, or steps to reproduce..."
                />
              </div>

              <Button type="submit" disabled={submitting} className="w-full font-semibold">
                {submitting ? (
                  "Submitting Ticket..."
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" /> Submit Ticket
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
