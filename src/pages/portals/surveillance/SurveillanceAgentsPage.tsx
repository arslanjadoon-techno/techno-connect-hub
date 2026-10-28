import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { DataTable, type Column } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FilterReset } from "@/components/filter-reset";
import { ArrowLeft } from "lucide-react";
import { getStaticAssignableAgents, getStaticValidationQueue } from "./surveillance-data";
import {
  canValidateSurveillance,
  getSurveillanceDefaultRoute,
  getSurveillanceRole,
  type SurveillanceAssignableAgent,
  type SurveillanceValidationItem,
} from "@/services/portals/surveillance/types";

type AgentAvailabilityStatus = "Available" | "Occupied";

interface EnrichedSurveillanceAgent extends SurveillanceAssignableAgent {
  availabilityStatus: AgentAvailabilityStatus;
  assignedRequests: SurveillanceValidationItem[];
}

const AVAILABILITY_STATUS_TONES: Record<AgentAvailabilityStatus, string> = {
  Available: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-400",
  Occupied: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400",
};

export default function SurveillanceAgentsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const role = getSurveillanceRole(user);
  const canAccessValidatePage = canValidateSurveillance(role);

  const initialStatusParam = searchParams.get("status")?.toLowerCase();
  const initialStatusFilter =
    initialStatusParam === "available"
      ? "Available"
      : initialStatusParam === "occupied"
        ? "Occupied"
        : "all";

  const [rawAgents, setRawAgents] = useState<SurveillanceAssignableAgent[]>(() =>
    getStaticAssignableAgents(),
  );
  const [validationQueue, setValidationQueue] = useState<SurveillanceValidationItem[]>(() =>
    getStaticValidationQueue(),
  );
  const [statusFilter, setStatusFilter] = useState<string>(initialStatusFilter);

  const loadData = useCallback(() => {
    setRawAgents(getStaticAssignableAgents());
    setValidationQueue(getStaticValidationQueue());
  }, []);

  useEffect(() => {
    if (canAccessValidatePage) {
      loadData();
    }
  }, [canAccessValidatePage, loadData]);

  const enrichedAgents = useMemo<EnrichedSurveillanceAgent[]>(() => {
    return rawAgents.map((agent) => {
      const assignedRequests = validationQueue.filter(
        (item) => item.assignedAgentId === agent.id && item.validationStatus === "Assigned",
      );
      const activeCount = assignedRequests.length;
      return {
        ...agent,
        activeAssignments: activeCount,
        availabilityStatus: activeCount === 0 ? "Available" : "Occupied",
        assignedRequests,
      };
    });
  }, [rawAgents, validationQueue]);

  const metrics = useMemo(() => {
    const total = enrichedAgents.length;
    const available = enrichedAgents.filter((a) => a.availabilityStatus === "Available").length;
    const occupied = total - available;
    return { total, available, occupied };
  }, [enrichedAgents]);

  const filteredAgents = useMemo(() => {
    return enrichedAgents.filter((agent) => {
      if (statusFilter !== "all" && agent.availabilityStatus !== statusFilter) return false;
      return true;
    });
  }, [enrichedAgents, statusFilter]);

  const hasActiveFilters = statusFilter !== "all";

  const columns: Column<EnrichedSurveillanceAgent>[] = useMemo(
    () => [
      {
        key: "agentName",
        header: "Agent Name",
        searchValue: (a) => a.fullName,
        accessor: (a) => (
          <span className="font-medium text-sm text-foreground whitespace-nowrap">
            {a.fullName}
          </span>
        ),
      },
      {
        key: "email",
        header: "Email",
        searchValue: (a) => a.email,
        accessor: (a) => (
          <span className="text-sm text-foreground whitespace-nowrap">{a.email}</span>
        ),
      },
      {
        key: "phone",
        header: "Phone",
        searchValue: (a) => a.phone,
        accessor: (a) => (
          <span className="text-sm text-foreground tabular-nums whitespace-nowrap">{a.phone}</span>
        ),
      },
      {
        key: "status",
        header: "Status",
        searchValue: (a) => a.availabilityStatus,
        accessor: (a) => (
          <Badge
            variant="outline"
            className={`text-xs font-semibold whitespace-nowrap ${AVAILABILITY_STATUS_TONES[a.availabilityStatus]}`}
          >
            {a.availabilityStatus}
          </Badge>
        ),
      },
    ],
    [],
  );

  if (!canAccessValidatePage) {
    return <Navigate to={getSurveillanceDefaultRoute(user)} replace />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header with Back Navigation */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
        <div className="flex flex-wrap items-center gap-3.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/surveillance/validate-and-assign")}
            className="h-9 gap-1.5 rounded-xl px-3.5 text-xs font-medium bg-background shadow-xs whitespace-nowrap shrink-0"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Validate & Assign
          </Button>
          <div>
            <p className="text-[11px] font-medium text-muted-foreground leading-tight">
              Validate and Assign
            </p>
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground leading-tight">
              Surveillance Agents
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Review agent availability to see which surveillance agents are currently available for
              new assignments and which agents are occupied with active reports.
            </p>
          </div>
        </div>
      </div>

      {/* 3 Clickable KPI Summary Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {/* 1. Total Agents */}
        <Card
          role="button"
          tabIndex={0}
          onClick={() => setStatusFilter("all")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") setStatusFilter("all");
          }}
          className={`p-4 cursor-pointer transition-all border-blue-200 bg-blue-50/50 hover:bg-blue-50/80 dark:bg-blue-950/20 dark:border-blue-900/50 ${
            statusFilter === "all" ? "ring-2 ring-blue-500/70 shadow-xs" : ""
          }`}
        >
          <div className="text-xs text-blue-800 dark:text-blue-300 font-medium">Total Agents</div>
          <div className="mt-1 text-2xl font-bold font-display text-blue-950 dark:text-blue-100 tabular-nums">
            {metrics.total}
          </div>
        </Card>

        {/* 2. Available Agents */}
        <Card
          role="button"
          tabIndex={0}
          onClick={() => setStatusFilter("Available")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") setStatusFilter("Available");
          }}
          className={`p-4 cursor-pointer transition-all border-teal-200/90 bg-teal-50/50 hover:bg-teal-50/80 dark:bg-teal-950/20 dark:border-teal-900/50 ${
            statusFilter === "Available" ? "ring-2 ring-teal-500/70 shadow-xs" : ""
          }`}
        >
          <div className="text-xs text-teal-800 dark:text-teal-300 font-medium">Available</div>
          <div className="mt-1 text-2xl font-bold font-display text-teal-950 dark:text-teal-100 tabular-nums">
            {metrics.available}
          </div>
        </Card>

        {/* 3. Occupied Agents */}
        <Card
          role="button"
          tabIndex={0}
          onClick={() => setStatusFilter("Occupied")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") setStatusFilter("Occupied");
          }}
          className={`p-4 cursor-pointer transition-all border-amber-300/80 bg-amber-50/50 hover:bg-amber-50/80 dark:bg-amber-950/20 dark:border-amber-900/50 ${
            statusFilter === "Occupied" ? "ring-2 ring-amber-500/70 shadow-xs" : ""
          }`}
        >
          <div className="text-xs text-amber-800 dark:text-amber-300 font-medium">Occupied</div>
          <div className="mt-1 text-2xl font-bold font-display text-amber-950 dark:text-amber-100 tabular-nums">
            {metrics.occupied}
          </div>
        </Card>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-[180px]">
            <SelectValue placeholder="Availability Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="Available">Available</SelectItem>
            <SelectItem value="Occupied">Occupied</SelectItem>
          </SelectContent>
        </Select>

        <FilterReset
          active={hasActiveFilters}
          onReset={() => {
            setStatusFilter("all");
          }}
        />
      </div>

      {/* Agents Directory & Availability DataTable */}
      <DataTable
        rows={filteredAgents}
        columns={columns}
        rowKey={(a) => a.id}
        searchPlaceholder="Search by Agent Name, Email, Phone, or Status..."
      />
    </div>
  );
}
