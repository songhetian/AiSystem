import { request } from '@/utils/request';

export type ExamQuestionType = 'single' | 'multiple' | 'judge';

export interface ExamPaperQuestionOption {
  label: string;
  value: string;
}

export interface ExamPaperQuestion {
  id?: string;
  question_type: ExamQuestionType;
  title: string;
  options?: ExamPaperQuestionOption[];
  correct_answer: string | string[] | boolean;
  score: number;
  sort?: number;
  explanation?: string;
}

export interface ExamPaper {
  id: string;
  paper_name: string;
  description?: string;
  total_score: number;
  pass_score: number;
  duration_min: number;
  enabled: number;
  question_count?: number;
  questions: ExamPaperQuestion[];
}

export interface ExamPlan {
  id: string;
  plan_name: string;
  paper_id: string;
  paper?: ExamPaper;
  start_time: string;
  end_time: string;
  reminder_mode: 'notice' | 'force';
  force_enter: number;
  pass_score: number;
  duration_min: number;
  max_attempts?: number;
  allow_retake?: number;
  absent_mark_minutes?: number;
  allow_makeup?: number;
  makeup_limit?: number;
  target_dept_ids?: string[];
  target_employee_ids?: string[];
  target_count: number;
  submitted_count?: number;
  pending_count?: number;
  pass_count?: number;
  runtime_status?: string;
}

export interface ExamAssignment {
  id: string;
  plan_id: string;
  paper_id: string;
  status: string;
  score?: number;
  passed?: number;
  attempt_count?: number;
  remaining_attempts?: number;
  can_retake?: boolean;
  started_at?: string;
  submitted_at?: string;
  question_count: number;
  correct_count: number;
  reminder_mode: 'notice' | 'force';
  force_enter: number;
  employee_name?: string;
  employee_no?: string;
  absent_reason?: string;
  manual_absent_marked?: number;
  plan: ExamPlan;
  paper?: ExamPaper;
  answers?: Array<{
    question_id: string;
    answer: string | string[] | boolean;
    correct: boolean;
    score: number;
  }>;
  attempts_history?: Array<{
    attempt_no: number;
    submitted_at: string;
    score: number;
    passed: number;
    correct_count: number;
    question_count: number;
    answers: Array<{
      question_id: string;
      answer: string | string[] | boolean;
      correct: boolean;
      score: number;
    }>;
  }>;
  deadline_at?: string;
}

export interface ExamMyStats {
  average_score: number;
  pass_count: number;
  fail_count: number;
  absent_count: number;
  accuracy: number;
  question_type_stats: Array<{
    question_type: string;
    correct_count: number;
    total_count: number;
    accuracy: number;
  }>;
}

export interface ExamResultSummary {
  total_count: number;
  submitted_count: number;
  pending_count: number;
  absent_count: number;
  pass_count: number;
  fail_count: number;
  average_score: number;
  highest_score: number;
  lowest_score: number;
  pass_rate: number;
  absent_rate: number;
  department_stats: Array<{
    dept_id: string;
    dept_name: string;
    total_count: number;
    submitted_count: number;
    pass_count: number;
    absent_count: number;
    average_score: number;
    pass_rate: number;
    absent_rate: number;
  }>;
}

export interface SaveExamPaperPayload {
  paper_name: string;
  description?: string;
  pass_score: number;
  duration_min: number;
  enabled?: number;
  questions: ExamPaperQuestion[];
  total_score?: number;
}

export interface CreateExamPlanPayload {
  plan_name: string;
  paper_id: string;
  start_time: string;
  end_time: string;
  reminder_mode: 'notice' | 'force';
  force_enter?: number;
  pass_score: number;
  duration_min: number;
  max_attempts?: number;
  allow_retake?: number;
  absent_mark_minutes?: number;
  allow_makeup?: number;
  makeup_limit?: number;
  dept_ids?: string[];
  employee_ids?: string[];
}

export const examApi = {
  listPapers: () => request.get<ExamPaper[]>('/exam/papers'),
  getPaper: (id: string) => request.get<ExamPaper>(`/exam/papers/${id}`),
  createPaper: (payload: SaveExamPaperPayload) => request.post('/exam/papers', payload),
  updatePaper: (id: string, payload: SaveExamPaperPayload) => request.put(`/exam/papers/${id}`, payload),
  listPlans: (params?: Record<string, any>) => request.get<ExamPlan[]>('/exam/plans', { params }),
  createPlan: (payload: CreateExamPlanPayload) => request.post('/exam/plans', payload),
  listMyExams: (params?: Record<string, any>) => request.get<ExamAssignment[]>('/exam/my', { params }),
  getMyStats: () => request.get<ExamMyStats>('/exam/my/stats'),
  getMyActiveExam: () => request.get<ExamAssignment | null>('/exam/my/active'),
  getMyExamDetail: (id: string) => request.get<ExamAssignment>(`/exam/my/${id}`),
  submitMyExam: (id: string, payload: { answers: Array<{ question_id: string; answer: string | string[] | boolean }> }) =>
    request.post<ExamAssignment>(`/exam/my/${id}/submit`, payload),
  listResults: (params?: Record<string, any>) => request.get<ExamAssignment[]>('/exam/results', { params }),
  markAbsent: (id: string, payload: { reason?: string }) => request.post<ExamAssignment>(`/exam/results/${id}/mark-absent`, payload),
  getResultSummary: (params?: Record<string, any>) => request.get<ExamResultSummary>('/exam/results/summary', { params })
};
