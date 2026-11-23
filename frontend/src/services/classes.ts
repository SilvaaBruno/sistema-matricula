import type { Page } from '../types';
import { api } from './api';
import { listQuery } from './query';

export interface ClassRow {
  id: number;
  capacity: number;
  occupied: number;
  disciplineId: number;
  disciplineCode: string;
  disciplineName: string;
  workload: number;
  professorId: number;
  professorName: string;
}

export const listClasses = (page: number, signal?: AbortSignal) => api<Page<ClassRow>>(`/classes?${listQuery({ page, search: '' })}`, { signal });
export const createClass = (input: { disciplineId: number; professorId: number; capacity: number }) => api<ClassRow>('/classes', { method: 'POST', body: input });
export const updateCapacity = (id: number, capacity: number) => api<ClassRow>(`/classes/${id}`, { method: 'PATCH', body: { capacity } });
