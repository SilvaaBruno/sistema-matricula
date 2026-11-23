import type { Page } from '../types';
import { api } from './api';
import { listQuery, type ListParams } from './query';

export interface Discipline {
  id: number;
  code: string;
  name: string;
  workload: number;
  prerequisites: { id: number; code: string; name: string }[];
}
export type DisciplineInput = Omit<Discipline, 'id' | 'prerequisites'> & { prerequisiteIds: number[] };

export const listDisciplines = (params: ListParams, signal?: AbortSignal) => api<Page<Discipline>>(`/disciplines?${listQuery(params)}`, { signal });
export const createDiscipline = (input: DisciplineInput) => api<Discipline>('/disciplines', { method: 'POST', body: input });
export const updateDiscipline = (id: number, input: DisciplineInput) => api<Discipline>(`/disciplines/${id}`, { method: 'PUT', body: input });
