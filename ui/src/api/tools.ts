import { api } from "./client";

export interface CompanyTool {
  id: string;
  companyId: string;
  name: string;
  description: string | null;
  url: string;
  icon: string;
  status: string;
  sortOrder: number;
  docsFilePath: string | null;
  createdByUserId: string | null;
  createdByAgentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export const toolsApi = {
  list: (companyId: string) =>
    api.get<CompanyTool[]>(`/companies/${companyId}/tools`),
  create: (companyId: string, data: Record<string, unknown>) =>
    api.post<CompanyTool>(`/companies/${companyId}/tools`, data),
  update: (companyId: string, id: string, data: Record<string, unknown>) =>
    api.patch<CompanyTool>(`/companies/${companyId}/tools/${id}`, data),
  remove: (companyId: string, id: string) =>
    api.delete<CompanyTool>(`/companies/${companyId}/tools/${id}`),
};
