import { request } from '@/utils/request';

export interface ApprovalPerson {
  id: string;
  name: string;
  employeeNo: string;
  department: string;
  title: string;
  [key: string]: any;
}

export interface ApprovalNode {
  id: string;
  name: string;
  type: 'start' | 'approval' | 'branch' | 'copy' | 'end';
  timeoutHours: number;
  condition?: string;
  approvers: ApprovalPerson[];
  copies: ApprovalPerson[];
  [key: string]: any;
}

export interface ApprovalProgressRecord {
  id?: string;
  nodeId: string;
  nodeName: string;
  action: 'submitted' | 'approved' | 'rejected' | 'transferred';
  actorId: string;
  actorName: string;
  comment?: string;
  createdAt: string;
  [key: string]: any;
}

export interface ApprovalTemplate {
  id: string;
  name: string;
  type: string;
  platformName: string;
  departmentName: string;
  status: 'enabled' | 'disabled';
  description: string;
  updatedAt: string;
  nodes: ApprovalNode[];
  [key: string]: any;
}

export interface ApprovalRequest {
  id: string;
  requestNo: string;
  templateId: string;
  templateName: string;
  bizType?: string;
  bizId?: string;
  type: string;
  applicantId: string;
  applicantName: string;
  currentApproverId?: string;
  currentApproverName?: string;
  status: 'pending' | 'approved' | 'rejected' | 'transferred';
  amount?: number;
  platformName: string;
  departmentName: string;
  summary: string;
  createdAt: string;
  updatedAt: string;
  progress: ApprovalProgressRecord[];
  [key: string]: any;
}

export const approvalApi = {
  listTemplates: () => request.get<ApprovalTemplate[]>('/approval/templates'),
  createTemplate: (payload: ApprovalTemplate) => request.post<ApprovalTemplate>('/approval/templates', payload),
  saveTemplate: (id: string, payload: ApprovalTemplate) => request.patch<ApprovalTemplate>(`/approval/templates/${id}`, payload),
  deleteTemplate: (id: string) => request.delete(`/approval/templates/${id}`),
  listMyRequests: (params?: any) => request.get<ApprovalRequest[]>('/approval/requests', { params: { ...params, view: 'my' } }),
  listPendingApprovals: (params?: any) => request.get<ApprovalRequest[]>('/approval/requests', { params: { ...params, view: 'pending' } }),
  listDoneApprovals: (params?: any) => request.get<ApprovalRequest[]>('/approval/requests', { params: { ...params, view: 'processed' } }),
  approveRequest: (id: string, payload: { comment?: string }) => request.post(`/approval/requests/${id}/approve`, payload),
  rejectRequest: (id: string, payload: { comment?: string }) => request.post(`/approval/requests/${id}/reject`, payload),
  transferRequest: (id: string, payload: { comment?: string; assigneeId: string }) =>
    request.post(`/approval/requests/${id}/transfer`, payload),
  requestStats: () => request.get<any>('/approval/requests/stats'),
  listPeople: () => request.get<ApprovalPerson[]>('/approval/people'),
};
