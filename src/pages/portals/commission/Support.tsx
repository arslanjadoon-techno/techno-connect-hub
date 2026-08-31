import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { LifeBuoy, Mail, Phone, MessageSquare, Clock } from "lucide-react";
import { toast } from "sonner";
import { FormEvent } from "react";

const faqs = [
  {
    q: "When is commission paid out?",
    a: "Commissions are calculated at the end of each month and disbursed with your next payroll cycle after review and approval by your market manager.",
  },
  {
    q: "Why don't I see my latest sales on the dashboard?",
    a: "Sales sync from the source system once daily. If a recent activation is missing after 24 hours, please contact support with your NTID and activation date.",
  },
  {
    q: "How do I dispute a chargeback?",
    a: "Open a support ticket below with the customer NTID, activation date, and a brief reason. Your manager will review the dispute within 3-5 business days.",
  },
  {
    q: "How do I apply for leave?",
    a: "Go to Leave Management from the sidebar, click 'Apply Leave', fill in the dates and reason, and submit for manager approval.",
  },
  {
    q: "I forgot my password. What should I do?",
    a: "Password resets are handled by IT. Please email reporting@texasmobilepcs.com from your registered work email.",
  },
];

export default function Support() {
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    (e.currentTarget as HTMLFormElement).reset();
    toast.success("Support ticket submitted. We'll get back to you shortly.");
  };

  return (
    <div className="space-y-6 max-w-6xl animate-fade-in">
      <div>
        <h1 className="font-display text-2xl font-semibold">Support & Help Desk</h1>
        <p className="text-sm text-muted-foreground">
          Find quick answers or reach out to the T-Communications support team.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="transition-all hover:shadow-md">
          <CardContent className="pt-6 flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                Email
              </div>
              <div className="font-semibold text-sm mt-0.5">reporting@texasmobilepcs.com</div>
            </div>
          </CardContent>
        </Card>
        <Card className="transition-all hover:shadow-md">
          <CardContent className="pt-6 flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Phone className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                Phone
              </div>
              <div className="font-semibold text-sm mt-0.5">+92 (335) 8914611</div>
            </div>
          </CardContent>
        </Card>
        <Card className="transition-all hover:shadow-md">
          <CardContent className="pt-6 flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                Hours
              </div>
              <div className="font-semibold text-sm mt-0.5">Mon - Fri, 9:00 AM - 6:00 PM CST</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Frequently Asked Questions</CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((f, i) => (
                <AccordionItem key={i} value={`item-${i}`}>
                  <AccordionTrigger className="text-left font-medium">{f.q}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed">
                    {f.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageSquare className="h-5 w-5 text-primary" />
              Submit a Ticket
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" required placeholder="Your name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" required placeholder="you@t-communications.com" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input id="subject" required placeholder="Brief summary of your issue" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  required
                  rows={5}
                  placeholder="Describe your issue in detail..."
                />
              </div>
              <Button type="submit" className="w-full font-semibold">
                Submit Ticket
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
