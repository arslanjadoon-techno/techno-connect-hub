import { useState, FormEvent } from "react";
import PublicLayout from "@/components/public/PublicLayout";
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
import { Badge } from "@/components/ui/badge";
import {
  Mail,
  Phone,
  Clock,
  MapPin,
  Send,
  Trash2,
  HelpCircle,
  Building2,
  CheckCircle2,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

const contactFaqs = [
  {
    q: "How can I request deletion of my user account or personal data?",
    a: "You can request full account and data deletion by sending an email directly to admin@techno.com. Include your full name, employee ID, and registered work email. Our administration team processes verified deletion requests within 30 calendar days.",
  },
  {
    q: "What should I do if I am locked out of my MIS account or lost 2FA access?",
    a: "If you cannot access your 2FA authenticator app, use the 'Forgot password?' option on the login page or contact the IT Helpdesk at reporting@texasmobilepcs.com or +92 (335) 8914611 with supervisor verification.",
  },
  {
    q: "Who do I contact regarding payroll, commission calculations, or store disputes?",
    a: "Commission inquiries should be directed to your market manager or submitted via your internal Commission Portal. For general MIS operational routing questions, email reporting@texasmobilepcs.com.",
  },
  {
    q: "How do I report technical errors or bugs on the portal?",
    a: "You can fill out the contact form below with the Category set to 'Technical Issue / Bug', or email reporting@texasmobilepcs.com with screenshots and the exact page URL.",
  },
];

export default function PublicContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState("general");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
      toast.success("Thank you! Your message has been sent to our administrative team.");
    }, 700);
  };

  return (
    <PublicLayout>
      <div className="max-w-5xl mx-auto space-y-10">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <Badge variant="outline" className="text-primary border-primary/30 bg-primary/5">
            Support & Helpdesk
          </Badge>
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            Contact Us & Help Center
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            Have questions regarding Active8 Wireless MIS, portal access, security policies, or
            account data? We&apos;re here to assist you.
          </p>
        </div>

        {/* Highlight Banner: Account & Data Deletion */}
        <Card className="border-rose-200 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/25 shadow-xs">
          <CardContent className="p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="h-10 w-10 rounded-xl bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-300 flex items-center justify-center shrink-0">
                <Trash2 className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-sm sm:text-base text-rose-950 dark:text-rose-100">
                  Need to Request Account or Personal Data Deletion?
                </h3>
                <p className="text-xs sm:text-sm text-rose-900/80 dark:text-rose-200/80 leading-relaxed">
                  As detailed in our Privacy Policy, you can request permanent deletion of your
                  account and personal records by emailing{" "}
                  <strong className="text-foreground">admin@techno.com</strong>.
                </p>
              </div>
            </div>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="shrink-0 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-100 hover:bg-rose-100 dark:hover:bg-rose-900/50"
            >
              <a href="mailto:admin@techno.com?subject=Account%20Deletion%20Request">
                <Mail className="h-3.5 w-3.5 mr-1.5" />
                Email admin@techno.com
              </a>
            </Button>
          </CardContent>
        </Card>

        {/* Contact Info Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-card border-border/80">
            <CardContent className="pt-6 space-y-2">
              <div className="h-9 w-9 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 flex items-center justify-center">
                <Mail className="h-5 w-5" />
              </div>
              <div className="text-xs text-muted-foreground uppercase font-semibold">
                Admin & Privacy
              </div>
              <a
                href="mailto:admin@techno.com"
                className="text-sm font-semibold text-primary hover:underline block truncate"
              >
                admin@techno.com
              </a>
              <div className="text-[11px] text-muted-foreground">Account deletion & security</div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border/80">
            <CardContent className="pt-6 space-y-2">
              <div className="h-9 w-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-300 flex items-center justify-center">
                <Mail className="h-5 w-5" />
              </div>
              <div className="text-xs text-muted-foreground uppercase font-semibold">
                Technical Support
              </div>
              <a
                href="mailto:reporting@texasmobilepcs.com"
                className="text-sm font-semibold text-primary hover:underline block truncate"
              >
                reporting@texasmobilepcs.com
              </a>
              <div className="text-[11px] text-muted-foreground">Avg. response &lt; 2 hrs</div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border/80">
            <CardContent className="pt-6 space-y-2">
              <div className="h-9 w-9 rounded-lg bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-300 flex items-center justify-center">
                <Phone className="h-5 w-5" />
              </div>
              <div className="text-xs text-muted-foreground uppercase font-semibold">
                Support Hotline
              </div>
              <div className="text-sm font-semibold text-foreground">+92 (335) 8914611</div>
              <div className="text-[11px] text-muted-foreground">
                Direct Line &middot; MIS Support
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border/80">
            <CardContent className="pt-6 space-y-2">
              <div className="h-9 w-9 rounded-lg bg-violet-100 dark:bg-violet-900/50 text-violet-600 dark:text-violet-300 flex items-center justify-center">
                <Clock className="h-5 w-5" />
              </div>
              <div className="text-xs text-muted-foreground uppercase font-semibold">
                Operating Hours
              </div>
              <div className="text-sm font-semibold text-foreground">Mon - Fri: 8am - 7pm</div>
              <div className="text-[11px] text-muted-foreground">Central Standard Time (CST)</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Grid: Contact Form + FAQs */}
        <div className="grid gap-8 lg:grid-cols-12 items-start">
          {/* Form */}
          <div className="lg:col-span-7">
            <Card className="border-border/80 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  Send Us a Direct Message
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Complete this form to submit an inquiry, request, or assistance from our support
                  team.
                </p>
              </CardHeader>
              <CardContent>
                {submitted ? (
                  <div className="p-8 text-center space-y-3 bg-muted/30 rounded-xl border border-border/60 animate-fade-in">
                    <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                      <CheckCircle2 className="h-6 w-6" />
                    </div>
                    <h3 className="font-semibold text-lg text-foreground">
                      Message Sent Successfully!
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
                      Our administration team has received your inquiry. We will contact you at{" "}
                      <span className="font-medium text-foreground">{email}</span> within 1-2
                      business days.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSubmitted(false);
                        setSubject("");
                        setMessage("");
                      }}
                      className="mt-2"
                    >
                      Send Another Message
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="contact-name">
                          Your Name <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="contact-name"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="e.g. John Doe"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="contact-email">
                          Email Address <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="contact-email"
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="e.g. john@company.com"
                        />
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="contact-category">Inquiry Category</Label>
                        <Select value={category} onValueChange={setCategory}>
                          <SelectTrigger id="contact-category">
                            <SelectValue placeholder="Select Category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="general">General Inquiry</SelectItem>
                            <SelectItem value="deletion">
                              Account / Data Deletion Request
                            </SelectItem>
                            <SelectItem value="access">Portal Access & Permissions</SelectItem>
                            <SelectItem value="technical">Technical Issue / Bug</SelectItem>
                            <SelectItem value="security">Security & Privacy Inquiry</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="contact-subject">Subject</Label>
                        <Input
                          id="contact-subject"
                          value={subject}
                          onChange={(e) => setSubject(e.target.value)}
                          placeholder="Brief topic summary"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="contact-message">
                        Message / Request Details <span className="text-destructive">*</span>
                      </Label>
                      <Textarea
                        id="contact-message"
                        required
                        rows={4}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Please describe your inquiry, question, or request in detail..."
                      />
                    </div>

                    <Button type="submit" disabled={submitting} className="w-full gap-2">
                      <Send className="h-4 w-4" />
                      <span>{submitting ? "Sending message..." : "Submit Message"}</span>
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column: FAQs & Links */}
          <div className="lg:col-span-5 space-y-6">
            <Card className="border-border/80 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <HelpCircle className="h-4 w-4 text-primary" />
                  Frequently Asked Questions
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <Accordion type="single" collapsible className="w-full">
                  {contactFaqs.map((faq, idx) => (
                    <AccordionItem key={idx} value={`faq-${idx}`}>
                      <AccordionTrigger className="text-left text-xs sm:text-sm font-medium hover:no-underline">
                        {faq.q}
                      </AccordionTrigger>
                      <AccordionContent className="text-xs text-muted-foreground leading-relaxed">
                        {faq.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>

            <Card className="border-border/80 bg-muted/20">
              <CardContent className="p-4 space-y-2 text-xs text-muted-foreground">
                <div className="font-semibold text-foreground flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  Headquarters & Operations Center
                </div>
                <p>Active8 Wireless LLC</p>
                <p className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  Karachi, Pakistan
                </p>
                <div className="pt-2 border-t border-border/40 flex items-center justify-between">
                  <Link to="/privacy" className="text-primary hover:underline font-medium">
                    Read Privacy Policy &rarr;
                  </Link>
                  <Link to="/login" className="text-muted-foreground hover:underline">
                    Sign in to Portal
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
