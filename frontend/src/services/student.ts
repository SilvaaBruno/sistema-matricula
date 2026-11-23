import type { Enrollment, Offer, Page, Progress } from '../types';
import { api } from './api';
import { listQuery, type ListParams } from './query';

export const listOffers = (params: ListParams, signal?: AbortSignal) => api<Page<Offer>>(`/offers?${listQuery(params)}`, { signal });
export const enroll = (classId: number) => api<{ id: number }>('/enrollments', { method: 'POST', body: { classId } });
export const listEnrollments = (signal?: AbortSignal) => api<Enrollment[]>('/enrollments', { signal });
export const cancelEnrollment = (id: number) => api<void>(`/enrollments/${id}`, { method: 'DELETE' });
export const getProgress = (signal?: AbortSignal) => api<Progress>('/progress', { signal });
