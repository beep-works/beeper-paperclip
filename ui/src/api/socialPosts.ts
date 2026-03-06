import { api } from "./client";

export interface SocialPost {
  id: string;
  companyId: string;
  text: string;
  status: "draft" | "review" | "scheduled" | "published";
  platforms: string[];
  scheduledFor: string | null;
  publishedAt: string | null;
  createdByUserId: string | null;
  createdByAgentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSocialPostData {
  text: string;
  status?: "draft" | "review" | "scheduled" | "published";
  platforms?: string[];
  scheduledFor?: string | null;
  publishedAt?: string | null;
}

export interface UpdateSocialPostData {
  text?: string;
  status?: "draft" | "review" | "scheduled" | "published";
  platforms?: string[];
  scheduledFor?: string | null;
  publishedAt?: string | null;
}

export const socialPostsApi = {
  list: (companyId: string, status?: string) => {
    const params = status ? `?status=${encodeURIComponent(status)}` : "";
    return api.get<SocialPost[]>(`/companies/${companyId}/social-posts${params}`);
  },
  get: (companyId: string, id: string) =>
    api.get<SocialPost>(`/companies/${companyId}/social-posts/${id}`),
  create: (companyId: string, data: CreateSocialPostData) =>
    api.post<SocialPost>(`/companies/${companyId}/social-posts`, data),
  update: (companyId: string, id: string, data: UpdateSocialPostData) =>
    api.patch<SocialPost>(`/companies/${companyId}/social-posts/${id}`, data),
  remove: (companyId: string, id: string) =>
    api.delete<{ deleted: boolean }>(`/companies/${companyId}/social-posts/${id}`),
};
