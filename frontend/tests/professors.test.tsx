import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProfessorsPage } from '../src/pages/secretary/ProfessorsPage';
import { mockApi, renderApp, secretary } from './helpers';

const p = (n: number) => ({ id: n, name: `Prof. ${n}`, email: `p${n}@cin.ufpe.br` });
const list = (data: unknown[]) => ({ body: { data, page: 1, pageSize: 10, total: data.length } });

describe('ProfessorsPage', () => {
  it('lista professores e mostra o estado vazio', async () => {
    mockApi(() => list([p(1)]));
    const { unmount } = renderApp(<ProfessorsPage />, { user: secretary });
    expect(await screen.findByText('p1@cin.ufpe.br')).toBeInTheDocument();
    unmount();
    mockApi(() => list([]));
    renderApp(<ProfessorsPage />, { user: secretary });
    expect(await screen.findByText('Nenhum professor cadastrado.')).toBeInTheDocument();
  });

  it('cadastra professor e recarrega a lista', async () => {
    let items = [p(1)];
    mockApi((r) => {
      if (r.method === 'POST') {
        items = [...items, { id: 2, ...r.body }];
        return { status: 201, body: items[1] };
      }
      return list(items);
    });
    renderApp(<ProfessorsPage />, { user: secretary });
    await screen.findByText('Prof. 1');
    await userEvent.click(screen.getByRole('button', { name: 'Novo professor' }));
    await userEvent.type(screen.getByLabelText('Nome'), 'Profa. Nova');
    await userEvent.type(screen.getByLabelText('E-mail'), 'nova@cin.ufpe.br');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText('Professor cadastrado.')).toBeInTheDocument();
    expect(await screen.findByText('nova@cin.ufpe.br')).toBeInTheDocument();
  });

  it('mostra a recusa de e-mail duplicado', async () => {
    mockApi((r) =>
      r.method === 'POST'
        ? { status: 409, body: { error: { code: 'PROFESSOR_EMAIL_TAKEN', message: 'Já existe um professor com esse e-mail' } } }
        : list([p(1)]),
    );
    renderApp(<ProfessorsPage />, { user: secretary });
    await screen.findByText('Prof. 1');
    await userEvent.click(screen.getByRole('button', { name: 'Novo professor' }));
    await userEvent.type(screen.getByLabelText('Nome'), 'Outro');
    await userEvent.type(screen.getByLabelText('E-mail'), 'p1@cin.ufpe.br');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Já existe um professor com esse e-mail');
  });

  it('falha de comunicação oferece tentar de novo', async () => {
    let calls = 0;
    mockApi(() => (++calls === 1 ? { status: 500, body: { error: { code: 'INTERNAL_ERROR', message: 'Erro interno do servidor' } } } : list([p(1)])));
    renderApp(<ProfessorsPage />, { user: secretary });
    await userEvent.click(await screen.findByRole('button', { name: 'Tentar de novo' }));
    expect(await screen.findByText('Prof. 1')).toBeInTheDocument();
  });
});
