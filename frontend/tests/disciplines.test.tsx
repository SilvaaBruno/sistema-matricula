import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DisciplinesPage } from '../src/pages/secretary/DisciplinesPage';
import { mockApi, renderApp, secretary } from './helpers';

const d = (n: number, extra = {}) => ({ id: n, code: `IF${n}`, name: `Disciplina ${n}`, workload: 60, prerequisites: [], ...extra });
const list = (data: unknown[], total = data.length) => ({ body: { data, page: 1, pageSize: 10, total } });

describe('DisciplinesPage', () => {
  it('lista disciplinas, com estado vazio e busca sem resultado', async () => {
    mockApi(() => list([d(1), d(2)]));
    const { unmount } = renderApp(<DisciplinesPage />, { user: secretary });
    expect(await screen.findByText('IF1')).toBeInTheDocument();
    expect(screen.getByText('Disciplina 2')).toBeInTheDocument();
    unmount();
    mockApi(() => list([]));
    renderApp(<DisciplinesPage />, { user: secretary });
    expect(await screen.findByText('Nenhuma disciplina cadastrada.')).toBeInTheDocument();
  });

  it('busca e página vão para a URL', async () => {
    mockApi(() => list([d(1)], 25));
    renderApp(<DisciplinesPage />, { user: secretary });
    await screen.findByText('IF1');
    await userEvent.type(screen.getByRole('searchbox', { name: 'Buscar' }), 'redes');
    await userEvent.click(screen.getByRole('button', { name: 'Buscar' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Próxima' }));
    expect(screen.getByTestId('url')).toHaveTextContent('?search=redes&page=2');
  });

  it('cadastra uma disciplina e atualiza a lista', async () => {
    let items = [d(1)];
    const spy = mockApi((r) => {
      if (r.method === 'POST') {
        items = [...items, d(2, r.body)];
        return { status: 201, body: items[1] };
      }
      return list(items);
    });
    renderApp(<DisciplinesPage />, { user: secretary });
    await screen.findByText('IF1');
    await userEvent.click(screen.getByRole('button', { name: 'Nova disciplina' }));
    await userEvent.type(screen.getByLabelText('Código'), 'IF900');
    await userEvent.type(screen.getByLabelText('Nome'), 'Tópicos Especiais');
    await userEvent.selectOptions(screen.getByLabelText('Carga horária'), '90');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText('Disciplina cadastrada.')).toBeInTheDocument();
    expect(await screen.findByText('Tópicos Especiais')).toBeInTheDocument();
    const post = spy.mock.calls.find(([, i]) => (i as RequestInit)?.method === 'POST')!;
    expect(JSON.parse((post[1] as RequestInit).body as string)).toEqual({ code: 'IF900', name: 'Tópicos Especiais', workload: 90, prerequisiteIds: [] });
  });

  it('mostra a recusa de código duplicado sem fechar o formulário', async () => {
    mockApi((r) =>
      r.method === 'POST'
        ? { status: 409, body: { error: { code: 'DISCIPLINE_CODE_TAKEN', message: 'Já existe uma disciplina com o código IF1' } } }
        : list([d(1)]),
    );
    renderApp(<DisciplinesPage />, { user: secretary });
    await screen.findByText('Disciplina 1');
    await userEvent.click(screen.getByRole('button', { name: 'Nova disciplina' }));
    await userEvent.type(screen.getByLabelText('Código'), 'IF1');
    await userEvent.type(screen.getByLabelText('Nome'), 'Outra');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Já existe uma disciplina com o código IF1');
    expect(screen.getByLabelText('Código')).toHaveValue('IF1');
  });

  it('não envia o formulário incompleto', async () => {
    const spy = mockApi(() => list([d(1)]));
    renderApp(<DisciplinesPage />, { user: secretary });
    await screen.findByText('IF1');
    await userEvent.click(screen.getByRole('button', { name: 'Nova disciplina' }));
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Preencha o código e o nome');
    expect(spy.mock.calls.every(([, i]) => (i as RequestInit)?.method !== 'POST')).toBe(true);
  });

  it('edita uma disciplina existente', async () => {
    const spy = mockApi((r) => (r.method === 'PUT' ? { body: { id: 1, ...r.body } } : list([d(1)])));
    renderApp(<DisciplinesPage />, { user: secretary });
    await userEvent.click(await screen.findByRole('button', { name: 'Editar IF1' }));
    const nome = screen.getByLabelText('Nome');
    await userEvent.clear(nome);
    await userEvent.type(nome, 'Nome novo');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText('Disciplina atualizada.')).toBeInTheDocument();
    const put = spy.mock.calls.find(([, i]) => (i as RequestInit)?.method === 'PUT')!;
    expect(String(put[0])).toBe('/api/disciplines/1');
    expect(JSON.parse((put[1] as RequestInit).body as string)).toMatchObject({ name: 'Nome novo' });
  });
});
