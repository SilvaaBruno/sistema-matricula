export type Role = 'SECRETARY' | 'STUDENT';

export interface User {
  id: number;
  username: string;
  name: string;
  role: Role;
  courseId: number | null;
}

export interface Page<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
}
