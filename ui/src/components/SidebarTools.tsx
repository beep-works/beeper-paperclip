import { useState } from "react";
import { NavLink } from "@/lib/router";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, ChevronRight, Plus, Wrench } from "lucide-react";
import { useCompany } from "../context/CompanyContext";
import { useSidebar } from "../context/SidebarContext";
import { toolsApi } from "../api/tools";
import { queryKeys } from "../lib/queryKeys";
import { cn } from "../lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { AddToolDialog } from "./AddToolDialog";

export function SidebarTools() {
  const [open, setOpen] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { selectedCompanyId } = useCompany();
  const { isMobile, setSidebarOpen } = useSidebar();

  const { data: tools } = useQuery({
    queryKey: queryKeys.tools.list(selectedCompanyId!),
    queryFn: () => toolsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const activeTools = (tools ?? []).filter((t) => t.status === "active");

  return (
    <>
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="group">
          <div className="flex items-center px-3 py-1.5">
            <CollapsibleTrigger className="flex items-center gap-1 flex-1 min-w-0">
              <ChevronRight
                className={cn(
                  "h-3 w-3 text-muted-foreground/60 transition-transform opacity-0 group-hover:opacity-100",
                  open && "rotate-90"
                )}
              />
              <span className="text-[10px] font-medium uppercase tracking-widest font-mono text-muted-foreground/60">
                Internal Tools
              </span>
            </CollapsibleTrigger>
            <button
              className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground/60 hover:text-foreground"
              onClick={(e) => {
                e.stopPropagation();
                setDialogOpen(true);
              }}
              title="Add tool"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <CollapsibleContent>
          <div className="flex flex-col gap-0.5 mt-0.5">
            {/* All tools link */}
            <NavLink
              to="/tools"
              onClick={() => {
                if (isMobile) setSidebarOpen(false);
              }}
              className={({ isActive }: { isActive: boolean }) =>
                cn(
                  "flex items-center gap-2.5 px-3 py-1.5 text-[13px] font-medium transition-colors",
                  isActive
                    ? "bg-accent text-foreground"
                    : "text-foreground/80 hover:bg-accent/50 hover:text-foreground"
                )
              }
            >
              <Wrench className="shrink-0 h-3.5 w-3.5 text-muted-foreground" />
              <span className="flex-1 truncate">All Tools</span>
              {activeTools.length > 0 && (
                <span className="text-[11px] text-muted-foreground/60">
                  {activeTools.length}
                </span>
              )}
            </NavLink>

            <NavLink
              to="/tools/social-timeline"
              onClick={() => {
                if (isMobile) setSidebarOpen(false);
              }}
              className={({ isActive }: { isActive: boolean }) =>
                cn(
                  "flex items-center gap-2.5 px-3 py-1.5 text-[13px] font-medium transition-colors",
                  isActive
                    ? "bg-accent text-foreground"
                    : "text-foreground/80 hover:bg-accent/50 hover:text-foreground"
                )
              }
            >
              <CalendarClock className="shrink-0 h-3.5 w-3.5 text-muted-foreground" />
              <span className="flex-1 truncate">Social Timeline</span>
            </NavLink>

            {/* Individual tools */}
            {activeTools.map((tool) => (
              <a
                key={tool.id}
                href={tool.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 px-3 py-1.5 text-[13px] font-medium text-foreground/80 hover:bg-accent/50 hover:text-foreground transition-colors"
              >
                <Wrench className="shrink-0 h-3.5 w-3.5 text-muted-foreground" />
                <span className="flex-1 truncate">{tool.name}</span>
              </a>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>

      <AddToolDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        editingTool={null}
      />
    </>
  );
}
