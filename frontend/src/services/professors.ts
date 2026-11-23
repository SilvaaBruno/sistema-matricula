import type { Page } from '../types';
import { api } from './api';
import { listQuery, type ListParams } from './query';

export interface Professor {
  id: number;
  name: string;
  email: string;
}

export const listProfessors = (params: ListParams, signal?: AbortSignal) => api<Page<Professor>>(`/professors?${listQuery(params)}`, { signal });
export const createProfessor = (input: Omit<Professor, 'id'>) => api<Professor>('/professors', { method: 'POST', body: input });
