import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OffersPage } from '../src/pages/student/OffersPage';
import { DisciplinesPage } from '../src/pages/secretary/DisciplinesPage';
import { mockApi, renderApp, secretary, student } from './helpers';

const offer = (extra = {}) => ({
  id: 1, disciplineCode: 'IF700', disciplineName: 'Engenharia de Software', workload: 60, professorName: 'Prof. João Lima',
  capacity: 30, availableSeats: 5, kind: 'PROFILE', enrolled: false, approved: false,
  prerequisites: ['IF669'], missingPrerequisites: ['IF669'], ...extra,
});

describe('pré-requisitos para o aluno', () => {
  it('mostra o pré-requisito pendente e bloqueia a matrícula', async () => {
    mockApi(() => ({ body: { data: [offer()], page: 1, pageSize: 10, total: 1 } }));
    renderApp(<OffersPage />, { user: student });
    expect(await screen.findByText(/Pré-requisitos: IF669 \(falta: IF669\)/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pré-requisito pendente' })).toBeDisabled();
  });

  it('com o pré-requisito cumprido, mostra a lista e permite matricular', async () => {
    mockApi(() => ({ body: { data: [offer({ missingPrerequisites: [] })], page: 1, pageSize: 10, total: 1 } }));
    renderApp(<OffersPage />, { user: student });
    expect(await screen.findByText('Pré-requisitos: IF669')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Matricular em IF700' })).toBeEnabled();
  });

  it('mostra a mensagem da API se a matrícula for recusada por pré-requisito', async () => {
    mockApi((r) =>
      r.method === 'POST'
        ? { status: 409, body: { error: { code: 'PREREQUISITE_NOT_MET', message: 'Pré-requisito(s) pendente(s): IF669' } } }
        : { body: { data: [offer({ missingPrerequisites: [] })], page: 1, pageSize: 10, total: 1 } },
    );
    renderApp(<OffersPage />, { user: student });
    await userEvent.click(await screen.findByRole('button', { name: 'Matricular em IF700' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Pré-requisito(s) pendente(s): IF669');
  });
});

describe('pré-requisitos na secretaria', () => {
  const d = (id: number, code: string, prerequisites: unknown[] = []) => ({ id, code, name: `Disciplina ${code}`, workload: 60, prerequisites });
  const list = (data: unknown[]) => ({ body: { data, page: 1, pageSize: 100, total: data.length } });

  it('a tabela mostra os pré-requisitos de cada disciplina', async () => {
    mockApi(() => list([d(1, 'IF668'), d(2, 'IF669', [{ id: 1, code: 'IF668', name: 'x' }])]));
    renderApp(<DisciplinesPage />, { user: secretary });
    const linha = (await screen.findByText('Disciplina IF669')).closest('tr')!;
    expect(linha).toHaveTextContent('IF668');
  });

  it('envia os pré-requisitos marcados ao cadastrar', async () => {
    const spy = mockApi((r) => (r.method === 'POST' ? { status: 201, body: d(3, 'IF700') } : list([d(1, 'IF668'), d(2, 'IF669')])));
    renderApp(<DisciplinesPage />, { user: secretary });
    await screen.findByText('Disciplina IF668');
    await userEvent.click(screen.getByRole('button', { name: 'Nova disciplina' }));
    await userEvent.type(screen.getByLabelText('Código'), 'IF700');
    await userEvent.type(screen.getByLabelText('Nome'), 'Engenharia');
    await userEvent.click(await screen.findByRole('checkbox', { name: 'IF669' }));
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await screen.findByText('Disciplina cadastrada.');
    const post = spy.mock.calls.find(([, i]) => (i as RequestInit)?.method === 'POST')!;
    expect(JSON.parse((post[1] as RequestInit).body as string).prerequisiteIds).toEqual([2]);
  });

  it('ao editar, vem marcado o que já existe e a própria disciplina não aparece como opção', async () => {
    mockApi(() => list([d(1, 'IF668'), d(2, 'IF669', [{ id: 1, code: 'IF668', name: 'x' }])]));
    renderApp(<DisciplinesPage />, { user: secretary });
    await userEvent.click(await screen.findByRole('button', { name: 'Editar IF669' }));
    expect(await screen.findByRole('checkbox', { name: 'IF668' })).toBeChecked();
    expect(screen.queryByRole('checkbox', { name: 'IF669' })).not.toBeInTheDocument();
  });

  it('mostra a recusa de ciclo de pré-requisitos', async () => {
    mockApi((r) =>
      r.method === 'PUT'
        ? { status: 409, body: { error: { code: 'PREREQUISITE_CYCLE', message: 'Os pré-requisitos escolhidos criariam um ciclo entre disciplinas' } } }
        : list([d(1, 'IF668'), d(2, 'IF669')]),
    );
    renderApp(<DisciplinesPage />, { user: secretary });
    await userEvent.click(await screen.findByRole('button', { name: 'Editar IF668' }));
    await userEvent.click(await screen.findByRole('checkbox', { name: 'IF669' }));
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('ciclo');
  });
});
