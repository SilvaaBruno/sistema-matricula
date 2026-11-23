import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ClassesPage } from '../src/pages/secretary/ClassesPage';
import { mockApi, renderApp, secretary } from './helpers';

const row = (extra = {}) => ({
  id: 1, capacity: 2, occupied: 2, disciplineId: 3, disciplineCode: 'IF673', disciplineName: 'Banco de Dados',
  workload: 60, professorId: 1, professorName: 'Profa. Maria Souza', ...extra,
});
const page = (data: unknown[]) => ({ body: { data, page: 1, pageSize: 10, total: data.length } });

describe('ClassesPage', () => {
  it('lista turmas com vagas ocupadas e totais', async () => {
    mockApi(() => page([row()]));
    renderApp(<ClassesPage />, { user: secretary });
    const tr = (await screen.findByText('IF673 · Banco de Dados')).closest('tr')!;
    expect(within(tr).getByText('2/2')).toBeInTheDocument();
  });

  it('sem turmas mostra o estado vazio', async () => {
    mockApi(() => page([]));
    renderApp(<ClassesPage />, { user: secretary });
    expect(await screen.findByText('Nenhuma turma aberta neste semestre.')).toBeInTheDocument();
  });

  it('abre uma turma escolhendo disciplina, professor e vagas', async () => {
    const spy = mockApi((r) => {
      if (r.path.startsWith('/disciplines')) return { body: { data: [{ id: 3, code: 'IF673', name: 'Banco de Dados', workload: 60 }], page: 1, pageSize: 100, total: 1 } };
      if (r.path.startsWith('/professors')) return { body: { data: [{ id: 1, name: 'Profa. Maria Souza', email: 'm@x' }], page: 1, pageSize: 100, total: 1 } };
      if (r.method === 'POST') return { status: 201, body: row({ id: 2, capacity: r.body.capacity, occupied: 0 }) };
      return page([row()]);
    });
    renderApp(<ClassesPage />, { user: secretary });
    await screen.findByText('IF673 · Banco de Dados');
    await userEvent.click(screen.getByRole('button', { name: 'Abrir turma' }));
    await userEvent.selectOptions(await screen.findByLabelText('Disciplina'), '3');
    await userEvent.selectOptions(screen.getByLabelText('Professor'), '1');
    await userEvent.clear(screen.getByLabelText('Vagas'));
    await userEvent.type(screen.getByLabelText('Vagas'), '25');
    await userEvent.click(within(screen.getByRole('form', { name: 'Abrir turma' })).getByRole('button', { name: 'Abrir turma' }));
    expect(await screen.findByText('Turma aberta.')).toBeInTheDocument();
    const post = spy.mock.calls.find(([, i]) => (i as RequestInit)?.method === 'POST')!;
    expect(JSON.parse((post[1] as RequestInit).body as string)).toEqual({ disciplineId: 3, professorId: 1, capacity: 25 });
  });

  it('exige ao menos 1 vaga antes de enviar', async () => {
    mockApi((r) => {
      if (r.path.startsWith('/disciplines')) return { body: { data: [{ id: 3, code: 'IF673', name: 'BD', workload: 60 }], page: 1, pageSize: 100, total: 1 } };
      if (r.path.startsWith('/professors')) return { body: { data: [{ id: 1, name: 'Maria', email: 'm@x' }], page: 1, pageSize: 100, total: 1 } };
      return page([]);
    });
    renderApp(<ClassesPage />, { user: secretary });
    await screen.findByText('Nenhuma turma aberta neste semestre.');
    await userEvent.click(screen.getByRole('button', { name: 'Abrir turma' }));
    await userEvent.selectOptions(await screen.findByLabelText('Disciplina'), '3');
    await userEvent.selectOptions(screen.getByLabelText('Professor'), '1');
    await userEvent.clear(screen.getByLabelText('Vagas'));
    await userEvent.type(screen.getByLabelText('Vagas'), '0');
    await userEvent.click(within(screen.getByRole('form', { name: 'Abrir turma' })).getByRole('button', { name: 'Abrir turma' }));
    expect(screen.getByRole('alert')).toHaveTextContent('pelo menos 1 vaga');
  });

  it('mostra a recusa ao reduzir vagas abaixo dos matriculados (regra 5)', async () => {
    mockApi((r) =>
      r.method === 'PATCH'
        ? { status: 409, body: { error: { code: 'CAPACITY_BELOW_ENROLLED', message: 'A turma já tem 2 aluno(s) matriculado(s); as vagas não podem ser menores que isso' } } }
        : page([row()]),
    );
    renderApp(<ClassesPage />, { user: secretary });
    await userEvent.click(await screen.findByRole('button', { name: 'Alterar vagas de IF673' }));
    const input = screen.getByLabelText('Vagas de IF673');
    await userEvent.clear(input);
    await userEvent.type(input, '1');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('as vagas não podem ser menores');
  });

  it('altera as vagas com sucesso', async () => {
    let cap = 2;
    const spy = mockApi((r) => {
      if (r.method === 'PATCH') {
        cap = r.body.capacity;
        return { body: row({ capacity: cap }) };
      }
      return page([row({ capacity: cap })]);
    });
    renderApp(<ClassesPage />, { user: secretary });
    await userEvent.click(await screen.findByRole('button', { name: 'Alterar vagas de IF673' }));
    const input = screen.getByLabelText('Vagas de IF673');
    await userEvent.clear(input);
    await userEvent.type(input, '5');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText('Vagas de IF673 atualizadas.')).toBeInTheDocument();
    expect(await screen.findByText('2/5')).toBeInTheDocument();
    const patch = spy.mock.calls.find(([, i]) => (i as RequestInit)?.method === 'PATCH')!;
    expect(JSON.parse((patch[1] as RequestInit).body as string)).toEqual({ capacity: 5 });
  });
});
