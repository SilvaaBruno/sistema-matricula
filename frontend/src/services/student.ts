import type { Offer, Page } from '../types';
import { api } from './api';
import { listQuery, type ListParams } from './query';

export const listOffers = (params: ListParams, signal?: AbortSignal) => api<Page<Offer>>(`/offers?${listQuery(params)}`, { signal });
