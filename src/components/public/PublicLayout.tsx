import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck,
  Moon,
  Sun,
  ArrowRight,
  LayoutDashboard,
  Mail,
  Phone,
  Lock,
} from "lucide-react";

interface PublicLayoutProps {
  children: ReactNode;
}

export default function PublicLayout({ children }: PublicLayoutProps) {
  const { user } = useAuth();
  const { theme, setTheme, palette } = useTheme();
  const isDark = theme === "dark";

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors duration-300">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 w-full border-b border-border/80 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="max-w-6xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
          {/* Logo and Brand */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-sm transition-transform group-hover:scale-105"
              style={{
                backgroundImage:
                  palette.primaryGradient ||
                  `linear-gradient(135deg, ${palette.primary} 0%, ${palette.primaryGlow} 100%)`,
              }}
            >
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="font-display text-base font-bold tracking-tight text-foreground flex items-center gap-1.5">
                Active8 Wireless
                <span className="text-xs px-1.5 py-0.2 rounded-md bg-primary/10 text-primary font-semibold">
                  MIS
                </span>
              </div>
              <div className="text-[10px] text-muted-foreground hidden sm:block">
                Management Information System
              </div>
            </div>
          </Link>

          {/* Links & CTA */}
          <nav className="flex items-center gap-2 sm:gap-4">
            <Link
              to="/privacy"
              className="text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md"
            >
              Privacy Policy
            </Link>
            <Link
              to="/contact-us"
              className="text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md"
            >
              Contact Us
            </Link>

            {/* Dark / Light Mode Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => setTheme(isDark ? "light" : "dark")}
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            {/* Login or Dashboard Button */}
            {user ? (
              <Button asChild size="sm" className="gap-1.5 text-xs sm:text-sm">
                <Link to="/ai-chat">
                  <LayoutDashboard className="h-3.5 w-3.5" />
                  <span>Dashboard</span>
                </Link>
              </Button>
            ) : (
              <Button
                asChild
                size="sm"
                className="gap-1.5 text-xs sm:text-sm text-white font-medium"
                style={{
                  backgroundImage:
                    palette.primaryGradient ||
                    `linear-gradient(90deg, ${palette.primary} 0%, ${palette.primaryGlow} 100%)`,
                }}
              >
                <Link to="/login">
                  <span>Sign In</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            )}
          </nav>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">{children}</main>

      {/* Public Footer */}
      <footer className="border-t border-border/80 bg-muted/30 py-8 px-4 sm:px-6 text-xs text-muted-foreground transition-colors">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-center sm:text-left">
            <div className="font-semibold text-foreground flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-primary" />
              Active8 Wireless MIS &middot; T-Communications LLC
            </div>
            <span className="hidden sm:inline text-muted-foreground/50">&bull;</span>
            <div className="flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" />
              <span>Contact: admin@techno.com</span>
            </div>
            <span className="hidden sm:inline text-muted-foreground/50">&bull;</span>
            <div className="flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5" />
              <span>+92 (335) 8914611</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Link to="/privacy" className="hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
            <span>&bull;</span>
            <Link to="/contact-us" className="hover:text-foreground transition-colors">
              Contact Us / Support
            </Link>
            <span>&bull;</span>
            <Link to="/login" className="hover:text-foreground transition-colors">
              Sign In
            </Link>
          </div>
        </div>

        <div className="max-w-6xl mx-auto mt-4 pt-4 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between text-[11px] text-muted-foreground/80 gap-2">
          <p>&copy; {new Date().getFullYear()} Active8 Wireless MIS. All rights reserved.</p>
          <p>
            To request account or data deletion, email{" "}
            <a href="mailto:admin@techno.com" className="text-primary underline font-medium">
              admin@techno.com
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
