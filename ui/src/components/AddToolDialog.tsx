import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCompany } from "../context/CompanyContext";
import { toolsApi, type CompanyTool } from "../api/tools";
import { queryKeys } from "../lib/queryKeys";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface AddToolDialogProps {
  open: boolean;
  onClose: () => void;
  editingTool: CompanyTool | null;
}

export function AddToolDialog({ open, onClose, editingTool }: AddToolDialogProps) {
  const { selectedCompanyId } = useCompany();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [icon, setIcon] = useState("wrench");

  useEffect(() => {
    if (editingTool) {
      setName(editingTool.name);
      setDescription(editingTool.description ?? "");
      setUrl(editingTool.url);
      setIcon(editingTool.icon);
    } else {
      setName("");
      setDescription("");
      setUrl("");
      setIcon("wrench");
    }
  }, [editingTool, open]);

  const createTool = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      toolsApi.create(selectedCompanyId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tools.list(selectedCompanyId!) });
      handleClose();
    },
  });

  const updateTool = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      toolsApi.update(selectedCompanyId!, editingTool!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tools.list(selectedCompanyId!) });
      handleClose();
    },
  });

  function handleClose() {
    setName("");
    setDescription("");
    setUrl("");
    setIcon("wrench");
    onClose();
  }

  async function handleSubmit() {
    if (!selectedCompanyId || !name.trim() || !url.trim()) return;
    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      url: url.trim(),
      icon: icon.trim() || "wrench",
    };
    if (editingTool) {
      updateTool.mutate(payload);
    } else {
      createTool.mutate(payload);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  }

  const isPending = createTool.isPending || updateTool.isPending;
  const isError = createTool.isError || updateTool.isError;
  const isEditing = !!editingTool;

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) handleClose();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-md p-0 gap-0"
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
          <span className="text-sm text-muted-foreground">
            {isEditing ? "Edit tool" : "Add internal tool"}
          </span>
          <button
            className="text-muted-foreground hover:text-foreground text-lg leading-none"
            onClick={handleClose}
          >
            &times;
          </button>
        </div>

        {/* Form */}
        <div className="px-4 py-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Tool name
            </label>
            <input
              className="w-full rounded border border-border bg-transparent px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
              placeholder="e.g. Social Media Tool"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Description
            </label>
            <textarea
              className="w-full rounded border border-border bg-transparent px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring resize-none"
              rows={2}
              placeholder="What does this tool do?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              URL
            </label>
            <input
              className="w-full rounded border border-border bg-transparent px-3 py-2 text-sm font-mono outline-none focus:ring-1 focus:ring-ring"
              placeholder="https://tool.example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Icon (lucide icon name)
            </label>
            <input
              className="w-full rounded border border-border bg-transparent px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
              placeholder="wrench"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-border">
          {isError ? (
            <p className="text-xs text-destructive">
              Failed to {isEditing ? "update" : "create"} tool.
            </p>
          ) : (
            <span />
          )}
          <Button
            size="sm"
            disabled={!name.trim() || !url.trim() || isPending}
            onClick={handleSubmit}
          >
            {isPending
              ? isEditing
                ? "Saving..."
                : "Adding..."
              : isEditing
                ? "Save changes"
                : "Add tool"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
