import { request } from '@/utils/request';

export const personnelApi = {
  listDepartments: () => request.get('/personnel/departments'),
  listPositions: () => request.get('/personnel/positions'),
  createPosition: (payload: Record<string, unknown>) => request.post('/personnel/positions', payload),
  updatePosition: (id: string, payload: Record<string, unknown>) => request.patch(`/personnel/positions/${id}`, payload),
  deletePosition: (id: string) => request.delete(`/personnel/positions/${id}`),
  listEmployees: () => request.get('/personnel/employees'),
  createEmployee: (payload: Record<string, unknown>) => request.post('/personnel/employees', payload),
  updateEmployee: (id: string, payload: Record<string, unknown>) => request.patch(`/personnel/employees/${id}`, payload),
  deleteEmployee: (id: string) => request.delete(`/personnel/employees/${id}`),
  uploadEmployeeIdCard: (id: string, side: 'front' | 'back', file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return request.post(`/personnel/employees/${id}/id-card/${side}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  }
};
