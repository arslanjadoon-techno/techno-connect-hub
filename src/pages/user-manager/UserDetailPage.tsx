import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { usersApi } from "@/lib/api/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft, Loader2, Trash2, Mail, Phone, Building2, Shield,
  MapPin, Map as MapIcon, Store, Home, CheckCircle2, XCircle, Layers,
} from "lucide-react";
import { getUserAvatarColor } from "./user-colors";

function Section({ icon: Icon, title, children, empty }: any) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-200">
          <Icon className="h-4 w-4 text-primary" /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {Array.isArray(children) && children.length === 0
          ? <p className="text-xs italic text-muted-foreground">{empty ?? "Nothing assigned"}</p>
          : <div className="flex flex-wrap gap-1.5">{children}</div>}
      </CardContent>
    </Card>
  );
}

function chip(label: string, key: string | number) {
  return (
    <Badge key={key} variant="outline" className="text-[12px] px-2.5 py-1 rounded-md font-medium">
      {label}
    </Badge>
  );
}

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const fetchUser = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await usersApi.get(id);
      if (res.success) setUser(res.data);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load user");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUser(); }, [id]);

  const handleDelete = async () => {
    if (!user) return;
    try {
      setDeleting(true);
      const res = await usersApi.delete(Number(user.id));
      if (res.success) {
        toast.success("User deleted");
        navigate("/admin/users");
      }
    } catch (e: any) {
      toast.error(e?.message || "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm">Loading user details...</p>
      </div>
    );
  }
  if (!user) {
    return (
      <div className="py-20 text-center text-muted-foreground">User not found.</div>
    );
  }

  const initials = (user.fullName || "?").split(/\s+/).map((p: string) => p[0]).slice(0, 2).join("").toUpperCase();
  const avatarBg = getUserAvatarColor(user.id);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" onClick={() => navigate("/admin/users")} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to users
        </Button>
        <div className="flex gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="gap-2" disabled={deleting}>
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Delete user
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this user?</AlertDialogTitle>
                <AlertDialogDescription>This permanently removes {user.fullName}.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Header card */}
      <Card>
        <CardContent className="p-6 flex flex-col md:flex-row md:items-center gap-6">
          <div
            className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl text-2xl font-semibold text-white uppercase shadow-md"
            style={{ backgroundColor: avatarBg }}
          >
            {initials}
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-display text-2xl font-semibold">{user.fullName}</h1>
              {user.active ? (
                <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Active
                </Badge>
              ) : (
                <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Inactive</Badge>
              )}
              {user.allowedUserManagement && (
                <Badge variant="outline" className="gap-1 text-indigo-600 border-indigo-300">
                  <Shield className="h-3 w-3" /> User Manager
                </Badge>
              )}
              {user.isTwoFactorEnabled && (
                <Badge variant="outline" className="gap-1">2FA Enabled</Badge>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4" /> <span className="text-foreground">{user.email}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4" /> <span className="text-foreground">{user.phone || "—"}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Building2 className="h-4 w-4" />
                <span className="text-foreground">{user.department?.name || user.department || "—"}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Portal access */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Layers className="h-4 w-4 text-primary" /> Portal Access
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {Array.isArray(user.portalAccess) && user.portalAccess.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {user.portalAccess.map((pa: any) => (
                <div key={pa.portalId} className="rounded-lg border p-3 bg-card hover:bg-accent/30 transition">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">{pa.portalName}</div>
                  <div className="font-semibold capitalize">{pa.roleName}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs italic text-muted-foreground">No portal access assigned</p>
          )}
        </CardContent>
      </Card>

      {/* Hierarchy sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Section icon={MapPin} title="States">
          {(user.states ?? []).map((s: any) => chip(s.name, s.id))}
        </Section>
        <Section icon={MapIcon} title="Districts">
          {(user.districts ?? []).map((s: any) => chip(s.name, s.id))}
        </Section>
        <Section icon={Store} title="Markets">
          {(user.markets ?? []).map((s: any) => chip(s.name, s.id))}
        </Section>
        <Section icon={Store} title="Stores">
          {(user.stores ?? []).map((s: any) => chip(s.name, s.id))}
        </Section>
        <Section icon={Home} title="Houses">
          {(user.houses ?? []).map((s: any) => chip(s.name, s.id))}
        </Section>
      </div>
    </div>
  );
}
