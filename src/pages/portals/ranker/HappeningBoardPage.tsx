import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CalendarDays,
  MapPin,
  UserCheck,
  Sparkles,
  Clock,
  Radio,
  PartyPopper,
} from "lucide-react";
import { ConfettiBackground } from "@/components/confetti-background";

interface EventFrame {
  id: number;
  badge: string;
  badgeColor: string;
  borderColor: string;
  accentGradient: string;
  iconColor: string;
}

const UPCOMING_EVENTS: EventFrame[] = [
  {
    id: 1,
    badge: "Quarterly Gala & Awards",
    badgeColor: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
    borderColor: "border-amber-400/60 dark:border-amber-500/40",
    accentGradient: "from-amber-500/10 via-amber-500/5 to-transparent",
    iconColor: "text-amber-500",
  },
  {
    id: 2,
    badge: "Regional Sales Summit",
    badgeColor: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30",
    borderColor: "border-indigo-400/60 dark:border-indigo-500/40",
    accentGradient: "from-indigo-500/10 via-indigo-500/5 to-transparent",
    iconColor: "text-indigo-500",
  },
  {
    id: 3,
    badge: "Champion Recognition Rally",
    badgeColor: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30",
    borderColor: "border-rose-400/60 dark:border-rose-500/40",
    accentGradient: "from-rose-500/10 via-rose-500/5 to-transparent",
    iconColor: "text-rose-500",
  },
];

export default function HappeningBoardPage() {
  return (
    <ConfettiBackground>
      <div className="space-y-8 p-4 sm:p-6 max-w-7xl mx-auto animate-fade-in relative z-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                Happening Board
              </h1>
              <Badge
                variant="outline"
                className="bg-primary/10 text-primary border-primary/30 text-xs gap-1 py-0.5"
              >
                <PartyPopper className="h-3 w-3" />
                Live Events
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Upcoming corporate events, award ceremonies, and market celebrations.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-xs font-semibold text-muted-foreground bg-muted/80 px-3 py-1.5 rounded-lg border border-border/60 flex items-center gap-1.5">
              <Radio className="h-3 w-3 text-amber-500 animate-pulse" />
              Event Calendar (3 Scheduled Slots)
            </span>
          </div>
        </div>

        {/* 3 Event Frames Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {UPCOMING_EVENTS.map((eventItem) => (
            <Card
              key={eventItem.id}
              className={`relative overflow-hidden rounded-2xl border-2 ${eventItem.borderColor} bg-card/95 backdrop-blur-md shadow-xl transition-all duration-300 hover:scale-[1.01] hover:shadow-2xl flex flex-col justify-between`}
            >
              {/* Top Accent Gradient Header */}
              <div
                className={`absolute top-0 inset-x-0 h-32 bg-gradient-to-b ${eventItem.accentGradient} pointer-events-none`}
              />

              <div>
                <CardHeader className="p-6 pb-2 relative z-10">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <Badge variant="outline" className={`text-xs font-bold ${eventItem.badgeColor}`}>
                      <Sparkles className="h-3 w-3 mr-1" />
                      {eventItem.badge}
                    </Badge>
                    <span className="text-xs font-semibold text-muted-foreground">
                      Frame #{eventItem.id}
                    </span>
                  </div>

                  {/* Main Event Title */}
                  <div className="space-y-1">
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Event:
                    </div>
                    <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground">
                      Coming Soon...
                    </h2>
                  </div>
                </CardHeader>

                <CardContent className="p-6 pt-2 space-y-6 relative z-10">
                  {/* Event Subtitle / Description */}
                  <div className="p-3.5 rounded-xl bg-muted/60 border border-border/70 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    New exciting events are being planned. Check back soon for details!
                  </div>

                  {/* Event Meta Lines */}
                  <div className="space-y-3 pt-2">
                    {/* Date: TBD */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-background/80 border border-border/80 shadow-xs">
                      <div className="flex items-center gap-2.5">
                        <div className={`p-2 rounded-lg bg-muted ${eventItem.iconColor}`}>
                          <CalendarDays className="h-4 w-4" />
                        </div>
                        <span className="text-xs font-semibold text-muted-foreground">Date</span>
                      </div>
                      <span className="text-xs sm:text-sm font-bold text-foreground">TBD</span>
                    </div>

                    {/* Venue: To Be Announced */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-background/80 border border-border/80 shadow-xs">
                      <div className="flex items-center gap-2.5">
                        <div className={`p-2 rounded-lg bg-muted ${eventItem.iconColor}`}>
                          <MapPin className="h-4 w-4" />
                        </div>
                        <span className="text-xs font-semibold text-muted-foreground">Venue</span>
                      </div>
                      <span className="text-xs sm:text-sm font-bold text-foreground">
                        To Be Announced
                      </span>
                    </div>

                    {/* Manager: TBD */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-background/80 border border-border/80 shadow-xs">
                      <div className="flex items-center gap-2.5">
                        <div className={`p-2 rounded-lg bg-muted ${eventItem.iconColor}`}>
                          <UserCheck className="h-4 w-4" />
                        </div>
                        <span className="text-xs font-semibold text-muted-foreground">Manager</span>
                      </div>
                      <span className="text-xs sm:text-sm font-bold text-foreground">TBD</span>
                    </div>
                  </div>
                </CardContent>
              </div>

              {/* Card Footer Status */}
              <div className="p-4 border-t border-border/50 bg-muted/30 text-center">
                <span className="text-[11px] font-medium text-muted-foreground flex items-center justify-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  Status: Planning & Scheduling In Progress
                </span>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </ConfettiBackground>
  );
}
