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

export type Kind = 'MANDATORY' | 'PROFILE' | 'FREE';

export interface Offer {
  id: number;
  disciplineCode: string;
  disciplineName: string;
  workload: number;
  professorName: string;
  capacity: number;
  availableSeats: number;
  kind: Kind;
  enrolled: boolean;
  approved: boolean;
}
