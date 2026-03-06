import { useState } from "react";
import { Link } from "@/lib/router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, ExternalLink, Wrench, CalendarClock } from "lucide-react";
import { useCompany } from "../context/CompanyContext";
import { toolsApi, type CompanyTool } from "../api/tools";
import { queryKeys } from "../lib/queryKeys";
import { Button } from "@/components/ui/button";
import { cn } from "../lib/utils";
import { AddToolDialog } from "../components/AddToolDialog";

export function Tools() {
  const { selectedCompanyId } = useCompany();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTool, setEditingTool] = useState<CompanyTool | null>(null);

  const { data: tools, isLoading } = useQuery({
    queryKey: queryKeys.tools.list(selectedCompanyId!),
    queryFn: () => toolsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const deleteTool = useMutation({
    mutationFn: (id: string) => toolsApi.remove(selectedCompanyId!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tools.list(selectedCompanyId!) });
    },
  });

  function handleEdit(tool: CompanyTool) {
    setEditingTool(tool);
    setDialogOpen(true);
  }

  function handleAdd() {
    setEditingTool(null);
    setDialogOpen(true);
  }

  function handleDialogClose() {
    setDialogOpen(false);
    setEditingTool(null);
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold">Internal Tools</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Register tools that agents and team members can use.
            </p>
          </div>
          <Button size="sm" onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-1.5" />
            Add Tool
          </Button>
        </div>

        <div className="rounded-lg border border-border p-4 mb-6 bg-card">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">Social Timeline</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Internal post workflow for draft, review, edit, publish, and schedule on X/Farcaster.
              </p>
            </div>
            <Link
              to="/tools/social-timeline"
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent"
            >
              <CalendarClock className="h-3.5 w-3.5" />
              Open
            </Link>
          </div>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Loading tools...</div>
        ) : !tools?.length ? (
          <div className="rounded-lg border border-dashed border-border p-12 text-center">
            <Wrench className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No tools registered yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Add an internal tool to make it discoverable by your agents.
            </p>
            <Button size="sm" variant="outline" className="mt-4" onClick={handleAdd}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Add your first tool
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {tools.map((tool) => (
              <div
                key={tool.id}
                className="group flex items-center gap-4 rounded-lg border border-border p-4 hover:bg-accent/30 transition-colors"
              >
                <div className="flex items-center justify-center h-10 w-10 rounded-md bg-muted shrink-0">
                  <Wrench className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{tool.name}</span>
                    <span
                      className={cn(
                        "text-[10px] font-medium uppercase px-1.5 py-0.5 rounded",
                        tool.status === "active"
                          ? "bg-green-500/10 text-green-600 dark:text-green-400"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {tool.status}
                    </span>
                  </div>
                  {tool.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {tool.description}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground/60 mt-0.5 truncate font-mono">
                    {tool.url}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => window.open(tool.url, "_blank")}
                    title="Open tool"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => handleEdit(tool)}
                    title="Edit tool"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="text-destructive hover:text-destructive"
                    onClick={() => {
                      if (confirm(`Delete "${tool.name}"?`)) {
                        deleteTool.mutate(tool.id);
                      }
                    }}
                    title="Delete tool"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AddToolDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        editingTool={editingTool}
      />
    </div>
  );
}
