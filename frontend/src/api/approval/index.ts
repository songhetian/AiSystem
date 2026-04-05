import { request } from '@/utils/request';

export interface ApprovalPerson {
  id: string;
  name: string;
  employeeNo: string;
  department: string;
  title: string;
}

export interface ApprovalNode {
  id: string;
  name: string;
  type: 'start' | 'approval' | 'branch' | 'copy' | 'end';
  timeoutHours: number;
  condition?: string;
  approvers: ApprovalPerson[];
  copies: ApprovalPerson[];
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
}

export interface ApprovalProgressRecord {
  id: string;
  nodeId: string;
  nodeName: string;
  action: 'submitted' | 'approved' | 'rejected' | 'transferred';
  actorId: string;
  actorName: string;
  comment?: string;
  createdAt: string;
}

export interface ApprovalRequestRecord {
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
}

interface MutationRequestOptions {
  idempotencyKey?: string;
}

function withIdempotencyKey(idempotencyKey?: string) {
  return idempotencyKey
    ? {
        headers: {
          'x-idempotency-key': idempotencyKey
        }
      }
    : undefined;
}

export const approvalApi = {
  listTemplates: () => request.get('/approval/templates'),
  listPeople: () => request.get('/approval/people'),
  getTemplate: (id: string) => request.get(`/approval/templates/${id}`),
  saveTemplate: (template: ApprovalTemplate) => request.patch(`/approval/templates/${template.id}`, template),
  listRequests: (params?: { view?: 'all' | 'my' | 'pending' | 'processed'; keyword?: string }) =>
    request.get('/approval/requests', { params }),
  approveRequest: (id: string, payload?: { comment?: string }, options?: MutationRequestOptions) =>
    request.post(`/approval/requests/${id}/approve`, payload ?? {}, withIdempotencyKey(options?.idempotencyKey)),
  rejectRequest: (id: string, payload?: { comment?: string }, options?: MutationRequestOptions) =>
    request.post(`/approval/requests/${id}/reject`, payload ?? {}, withIdempotencyKey(options?.idempotencyKey)),
  transferRequest: (id: string, payload: { assigneeId: string; comment?: string }, options?: MutationRequestOptions) =>
    request.post(`/approval/requests/${id}/transfer`, payload, withIdempotencyKey(options?.idempotencyKey))
};
