import { useMemo, useState } from "react";
import { CalendarClock, CheckCircle2, Clock3, FilePenLine, Loader2, Send, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCompany } from "../context/CompanyContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { useEffect } from "react";
import { socialPostsApi } from "../api/socialPosts";
import type { SocialPost } from "../api/socialPosts";
import { queryKeys } from "../lib/queryKeys";

type Platform = "x" | "farcaster";
type PostStatus = "draft" | "review" | "scheduled" | "published";

const DEFAULT_PLATFORMS: Platform[] = ["x", "farcaster"];

function toLocalInputValue(dateIso?: string | null) {
  if (!dateIso) return "";
  const date = new Date(dateIso);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

function formatDate(dateIso?: string | null) {
  if (!dateIso) return "Not set";
  return new Date(dateIso).toLocaleString();
}

function statusTone(status: PostStatus): "secondary" | "default" | "outline" {
  if (status === "published") return "default";
  if (status === "scheduled") return "secondary";
  return "outline";
}

export function SocialTimelineTool() {
  const { selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const queryClient = useQueryClient();

  const [draftText, setDraftText] = useState("");
  const [composePlatforms, setComposePlatforms] = useState<Platform[]>(["x"]);
  const [statusFilter, setStatusFilter] = useState<PostStatus | "all">("all");
  const [scheduleInputs, setScheduleInputs] = useState<Record<string, string>>({});

  useEffect(() => {
    setBreadcrumbs([{ label: "Internal Tools", href: "/tools" }, { label: "Social Timeline" }]);
  }, [setBreadcrumbs]);

  const { data: posts = [], isLoading } = useQuery({
    queryKey: queryKeys.socialPosts.list(selectedCompanyId!),
    queryFn: () => socialPostsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.socialPosts.list(selectedCompanyId!) });
  };

  const createPost = useMutation({
    mutationFn: (data: { text: string; platforms: string[] }) =>
      socialPostsApi.create(selectedCompanyId!, { text: data.text, status: "draft", platforms: data.platforms }),
    onSuccess: invalidate,
  });

  const updatePost = useMutation({
    mutationFn: (data: { id: string; patch: Record<string, unknown> }) =>
      socialPostsApi.update(selectedCompanyId!, data.id, data.patch),
    onSuccess: invalidate,
  });

  const deletePost = useMutation({
    mutationFn: (id: string) => socialPostsApi.remove(selectedCompanyId!, id),
    onSuccess: invalidate,
  });

  const filteredPosts = useMemo(() => {
    const sorted = [...posts].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (statusFilter === "all") return sorted;
    return sorted.filter((post) => post.status === statusFilter);
  }, [posts, statusFilter]);

  const reviewQueue = useMemo(
    () => posts.filter((post) => post.status === "review"),
    [posts],
  );

  function handleCreateDraft() {
    if (!draftText.trim()) return;
    createPost.mutate({ text: draftText.trim(), platforms: [...composePlatforms] });
    setDraftText("");
  }

  function patchPost(id: string, patch: Record<string, unknown>) {
    updatePost.mutate({ id, patch });
  }

  function removePost(id: string) {
    deletePost.mutate(id);
  }

  function toggleComposePlatform(platform: Platform) {
    setComposePlatforms((current) =>
      current.includes(platform)
        ? current.filter((item) => item !== platform)
        : [...current, platform],
    );
  }

  function togglePostPlatform(post: SocialPost, platform: Platform) {
    const nextPlatforms = post.platforms.includes(platform)
      ? post.platforms.filter((item) => item !== platform)
      : [...post.platforms, platform];
    patchPost(post.id, { platforms: nextPlatforms });
  }

  function schedulePost(id: string) {
    const localValue = scheduleInputs[id];
    if (!localValue) return;
    patchPost(id, {
      status: "scheduled",
      scheduledFor: new Date(localValue).toISOString(),
      publishedAt: null,
    });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Social Timeline Tool</CardTitle>
          <CardDescription>
            Internal workflow for writing drafts, human review, editing, publishing, and scheduling posts for X and Farcaster.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Compose Draft</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={draftText}
              onChange={(event) => setDraftText(event.target.value)}
              placeholder="Write a post draft..."
              className="min-h-32"
            />
            <div className="flex flex-wrap gap-2">
              {DEFAULT_PLATFORMS.map((platform) => {
                const active = composePlatforms.includes(platform);
                return (
                  <Button
                    key={platform}
                    type="button"
                    variant={active ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleComposePlatform(platform)}
                  >
                    {platform.toUpperCase()}
                  </Button>
                );
              })}
            </div>
            <Button type="button" onClick={handleCreateDraft} disabled={!draftText.trim() || createPost.isPending}>
              {createPost.isPending ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <FilePenLine className="mr-1 h-4 w-4" />
              )}
              Save Draft
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Review Queue</CardTitle>
            <CardDescription>
              {reviewQueue.length} post(s) waiting for human review.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {reviewQueue.length === 0 && (
              <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                Queue is clear.
              </div>
            )}
            {reviewQueue.map((post) => (
              <div key={post.id} className="rounded-md border p-3">
                <p className="text-sm">{post.text}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Platforms: {post.platforms.join(", ")}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="gap-3">
          <CardTitle className="text-base">Timeline</CardTitle>
          <div className="flex flex-wrap gap-2">
            {(["all", "draft", "review", "scheduled", "published"] as const).map((status) => (
              <Button
                key={status}
                type="button"
                size="sm"
                variant={statusFilter === status ? "default" : "outline"}
                onClick={() => setStatusFilter(status)}
              >
                {status}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {filteredPosts.length === 0 && (
            <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
              No posts yet. Start with a draft.
            </div>
          )}
          {filteredPosts.map((post) => (
            <div key={post.id} className="rounded-md border p-3 space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge variant={statusTone(post.status)}>{post.status}</Badge>
                <span>Created: {formatDate(post.createdAt)}</span>
                <span>Updated: {formatDate(post.updatedAt)}</span>
              </div>

              <Textarea
                value={post.text}
                onChange={(event) => patchPost(post.id, { text: event.target.value })}
                disabled={post.status === "published"}
              />

              <div className="flex flex-wrap gap-2">
                {DEFAULT_PLATFORMS.map((platform) => {
                  const active = post.platforms.includes(platform);
                  return (
                    <Button
                      key={`${post.id}-${platform}`}
                      type="button"
                      size="sm"
                      variant={active ? "default" : "outline"}
                      onClick={() => togglePostPlatform(post, platform)}
                      disabled={post.status === "published"}
                    >
                      {platform.toUpperCase()}
                    </Button>
                  );
                })}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => patchPost(post.id, { status: "review" })}
                  disabled={post.status === "published"}
                >
                  <Send className="mr-1 h-4 w-4" />
                  Send to Review
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => patchPost(post.id, { status: "draft", scheduledFor: null })}
                  disabled={post.status === "published"}
                >
                  <FilePenLine className="mr-1 h-4 w-4" />
                  Move to Draft
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() =>
                    patchPost(post.id, {
                      status: "published",
                      publishedAt: new Date().toISOString(),
                      scheduledFor: null,
                    })
                  }
                >
                  <CheckCircle2 className="mr-1 h-4 w-4" />
                  Publish Now
                </Button>
                <Button type="button" size="sm" variant="destructive" onClick={() => removePost(post.id)}>
                  <Trash2 className="mr-1 h-4 w-4" />
                  Delete
                </Button>
              </div>

              <div className="grid gap-2 md:grid-cols-[240px_1fr_auto] md:items-center">
                <Input
                  type="datetime-local"
                  value={scheduleInputs[post.id] ?? toLocalInputValue(post.scheduledFor)}
                  onChange={(event) =>
                    setScheduleInputs((current) => ({ ...current, [post.id]: event.target.value }))
                  }
                  disabled={post.status === "published"}
                />
                <p className="text-xs text-muted-foreground">
                  Scheduled: {formatDate(post.scheduledFor)} | Published: {formatDate(post.publishedAt)}
                </p>
                <Button type="button" size="sm" variant="secondary" onClick={() => schedulePost(post.id)}>
                  <CalendarClock className="mr-1 h-4 w-4" />
                  Schedule
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="text-xs text-muted-foreground flex items-center gap-1">
        <Clock3 className="h-3.5 w-3.5" />
        Timeline data is stored server-side and accessible to all agents.
      </div>
    </div>
  );
}
