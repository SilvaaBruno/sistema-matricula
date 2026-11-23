import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EnrollmentsPage } from '../src/pages/student/EnrollmentsPage';
import { OffersPage } from '../src/pages/student/OffersPage';
import { mockApi, renderApp, student } from './helpers';

const offer = (n: number, extra = {}) => ({
  id: n, disciplineCode: `IF${n}`, disciplineName: `Disciplina ${n}`, workload: 60, professorName: 'Prof. João Lima',
  capacity: 30, availableSeats: 5, kind: 'MANDATORY', enrolled: false, approved: false, prerequisites: [], missingPrerequisites: [], ...extra,
});
const offersBody = (data: unknown[]) => ({ body: { data, page: 1, pageSize: 10, total: data.length } });

describe('matrícula na tela de ofertas', () => {
  it('matricula, avisa o sucesso e recarrega as ofertas', async () => {
    let enrolled = false;
    const spy = mockApi((r) => {
      if (r.method === 'POST' && r.path === '/enrollments') {
        enrolled = true;
        return { status: 201, body: { id: 9, classId: r.body.classId, status: 'ACTIVE' } };
      }
      return offersBody([offer(1, { enrolled, availableSeats: enrolled ? 4 : 5 })]);
    });
    renderApp(<OffersPage />, { user: student });
    await userEvent.click(await screen.findByRole('button', { name: 'Matricular em IF1' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Matrícula realizada em IF1.');
    expect(await screen.findByRole('button', { name: 'Matriculado' })).toBeDisabled();
    const post = spy.mock.calls.find(([, init]) => (init as RequestInit)?.method === 'POST')!;
    expect(JSON.parse((post[1] as RequestInit).body as string)).toEqual({ classId: 1 });
  });

  it('mostra a mensagem quando a regra de negócio recusa a matrícula', async () => {
    mockApi((r) =>
      r.method === 'POST'
        ? { status: 409, body: { error: { code: 'CLASS_FULL', message: 'A turma está lotada' } } }
        : offersBody([offer(1)]),
    );
    renderApp(<OffersPage />, { user: student });
    await userEvent.click(await screen.findByRole('button', { name: 'Matricular em IF1' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('A turma está lotada');
  });

  it('só permite matricular quando é possível (aprovada, matriculada e lotada ficam desabilitadas)', async () => {
    mockApi(() => offersBody([offer(1, { approved: true }), offer(2, { enrolled: true }), offer(3, { availableSeats: 0 }), offer(4)]));
    renderApp(<OffersPage />, { user: student });
    expect(await screen.findByRole('button', { name: 'Já aprovado' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Matriculado' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Lotada' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Matricular em IF4' })).toBeEnabled();
  });
});

describe('minhas matrículas', () => {
  const item = { id: 7, classId: 3, disciplineCode: 'IF673', disciplineName: 'Banco de Dados', workload: 60, professorName: 'Profa. Maria Souza' };

  it('lista as matrículas ativas', async () => {
    mockApi(() => ({ body: [item] }));
    renderApp(<EnrollmentsPage />, { user: student });
    expect(await screen.findByText('IF673 · Banco de Dados')).toBeInTheDocument();
  });

  it('sem matrículas mostra o estado vazio', async () => {
    mockApi(() => ({ body: [] }));
    renderApp(<EnrollmentsPage />, { user: student });
    expect(await screen.findByText('Você não tem matrículas ativas.')).toBeInTheDocument();
  });

  it('cancela a matrícula e a remove da lista', async () => {
    let list = [item];
    const spy = mockApi((r) => {
      if (r.method === 'DELETE' && r.path === '/enrollments/7') {
        list = [];
        return { status: 204 };
      }
      return { body: list };
    });
    renderApp(<EnrollmentsPage />, { user: student });
    await userEvent.click(await screen.findByRole('button', { name: 'Cancelar matrícula em IF673' }));
    expect(await screen.findByText('Você não tem matrículas ativas.')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('cancelada');
    expect(spy.mock.calls.some(([u, i]) => String(u) === '/api/enrollments/7' && (i as RequestInit).method === 'DELETE')).toBe(true);
  });

  it('falha de comunicação oferece tentar de novo', async () => {
    let calls = 0;
    mockApi(() => (++calls === 1 ? { status: 500, body: { error: { code: 'INTERNAL_ERROR', message: 'Erro interno do servidor' } } } : { body: [item] }));
    renderApp(<EnrollmentsPage />, { user: student });
    await userEvent.click(await screen.findByRole('button', { name: 'Tentar de novo' }));
    expect(await screen.findByText('IF673 · Banco de Dados')).toBeInTheDocument();
  });
});
