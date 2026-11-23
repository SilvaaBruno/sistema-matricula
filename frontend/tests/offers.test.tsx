import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OffersPage } from '../src/pages/student/OffersPage';
import { mockApi, renderApp, student } from './helpers';

const offer = (n: number, extra = {}) => ({
  id: n, disciplineCode: `IF${n}`, disciplineName: `Disciplina ${n}`, workload: 60, professorName: 'Profa. Maria Souza',
  capacity: 30, availableSeats: 12, kind: 'MANDATORY', enrolled: false, approved: false, ...extra,
});
const pageOf = (data: unknown[], page = 1, total = data.length) => ({ body: { data, page, pageSize: 10, total } });

describe('OffersPage', () => {
  it('mostra carregamento e depois as turmas com vagas e classificação', async () => {
    mockApi(() => pageOf([offer(1), offer(2, { kind: 'PROFILE', availableSeats: 1 }), offer(3, { kind: 'FREE', availableSeats: 0 })]));
    renderApp(<OffersPage />, { user: student });
    expect(screen.getByText('Carregando…')).toBeInTheDocument();
    expect(await screen.findByText('IF1 · Disciplina 1')).toBeInTheDocument();
    expect(screen.getByText('Obrigatória')).toBeInTheDocument();
    expect(screen.getByText('Eletiva de perfil')).toBeInTheDocument();
    expect(screen.getByText('Eletiva livre')).toBeInTheDocument();
    expect(screen.getByText('12 vagas disponíveis de 30')).toBeInTheDocument();
    expect(screen.getByText('1 vaga disponível de 30')).toBeInTheDocument();
    expect(screen.getByText('Turma lotada')).toBeInTheDocument();
  });

  it('lista vazia mostra mensagem própria', async () => {
    mockApi(() => pageOf([]));
    renderApp(<OffersPage />, { user: student });
    expect(await screen.findByText('Nenhuma turma aberta neste semestre.')).toBeInTheDocument();
  });

  it('busca sem resultado mostra o termo buscado', async () => {
    mockApi(() => pageOf([]));
    renderApp(<OffersPage />, { user: student, route: '/?search=zzz' });
    expect(await screen.findByText('Nenhum resultado para "zzz".')).toBeInTheDocument();
  });

  it('falha de comunicação oferece tentar de novo', async () => {
    let calls = 0;
    mockApi(() => (++calls === 1 ? { status: 500, body: { error: { code: 'INTERNAL_ERROR', message: 'Erro interno do servidor' } } } : pageOf([offer(1)])));
    renderApp(<OffersPage />, { user: student });
    expect(await screen.findByRole('alert')).toHaveTextContent('Erro interno do servidor');
    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(await screen.findByText('IF1 · Disciplina 1')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('busca e página são refletidas na URL e enviadas à API', async () => {
    const spy = mockApi(() => pageOf([offer(1)], 1, 25));
    renderApp(<OffersPage />, { user: student });
    await screen.findByText('IF1 · Disciplina 1');
    await userEvent.type(screen.getByRole('searchbox', { name: 'Buscar' }), 'banco');
    await userEvent.click(screen.getByRole('button', { name: 'Buscar' }));
    expect(screen.getByTestId('url')).toHaveTextContent('?search=banco');
    await screen.findByText('IF1 · Disciplina 1');
    await userEvent.click(screen.getByRole('button', { name: 'Próxima' }));
    expect(screen.getByTestId('url')).toHaveTextContent('?search=banco&page=2');
    const last = spy.mock.calls.at(-1)![0] as string;
    expect(last).toContain('page=2');
    expect(last).toContain('search=banco');
  });

  it('abre direto na página e busca indicadas pela URL', async () => {
    const spy = mockApi(() => pageOf([offer(1)], 3, 25));
    renderApp(<OffersPage />, { user: student, route: '/?page=3&search=ba' });
    expect(await screen.findByText('Página 3 de 3')).toBeInTheDocument();
    expect(spy.mock.calls[0][0]).toContain('page=3');
    expect(screen.getByRole('button', { name: 'Próxima' })).toBeDisabled();
  });

  it('página fora do intervalo oferece voltar à primeira', async () => {
    mockApi(() => pageOf([], 9, 5));
    renderApp(<OffersPage />, { user: student, route: '/?page=9' });
    await userEvent.click(await screen.findByRole('button', { name: 'Ir para a primeira página' }));
    expect(screen.getByTestId('url')).not.toHaveTextContent('page=');
  });
});
