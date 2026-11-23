import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppRoutes } from '../src/routes/AppRoutes';
import { api, session } from '../src/services/api';
import { mockApi, renderApp, secretary, student } from './helpers';

const loginHandler = (req: { method: string; path: string; body: any }) => {
  if (req.path !== '/auth/login') return undefined;
  if (req.body.username === 'ana') return { body: { token: 't1', user: student } };
  if (req.body.username === 'secretaria') return { body: { token: 't2', user: secretary } };
  return { status: 401, body: { error: { code: 'INVALID_CREDENTIALS', message: 'Usuário não encontrado' } } };
};

describe('login', () => {
  it('aluno entra e vai para a área do aluno', async () => {
    mockApi(loginHandler);
    renderApp(<AppRoutes />, { route: '/login' });
    await userEvent.type(screen.getByLabelText('Nome de usuário'), 'ana');
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    await waitFor(() => expect(screen.getByTestId('url')).toHaveTextContent('/aluno'));
    expect(screen.getByText('Ana Silva')).toBeInTheDocument();
  });

  it('secretaria entra e vai para a área da secretaria', async () => {
    mockApi(loginHandler);
    renderApp(<AppRoutes />, { route: '/login' });
    await userEvent.type(screen.getByLabelText('Nome de usuário'), 'secretaria');
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    await waitFor(() => expect(screen.getByTestId('url')).toHaveTextContent('/secretaria'));
  });

  it('usuário inexistente mostra a mensagem da API e continua no login', async () => {
    mockApi(loginHandler);
    renderApp(<AppRoutes />, { route: '/login' });
    await userEvent.type(screen.getByLabelText('Nome de usuário'), 'fantasma');
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Usuário não encontrado');
    expect(screen.getByTestId('url')).toHaveTextContent('/login');
  });

  it('não envia o formulário vazio', async () => {
    const fetchSpy = mockApi(loginHandler);
    renderApp(<AppRoutes />, { route: '/login' });
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Informe seu nome de usuário');
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe('guarda de rotas por perfil', () => {
  it('sem sessão, qualquer área manda para o login', () => {
    renderApp(<AppRoutes />, { route: '/aluno' });
    expect(screen.getByTestId('url')).toHaveTextContent('/login');
  });

  it('aluno não acessa a área da secretaria', () => {
    renderApp(<AppRoutes />, { route: '/secretaria', user: student });
    expect(screen.getByTestId('url')).toHaveTextContent('/aluno');
  });

  it('secretaria não acessa a área do aluno', () => {
    renderApp(<AppRoutes />, { route: '/aluno', user: secretary });
    expect(screen.getByTestId('url')).toHaveTextContent('/secretaria');
  });

  it('sair encerra a sessão e volta ao login', async () => {
    renderApp(<AppRoutes />, { route: '/aluno', user: student });
    await userEvent.click(screen.getByRole('button', { name: 'Sair' }));
    expect(screen.getByTestId('url')).toHaveTextContent('/login');
    expect(session.get()).toBeNull();
  });
});

describe('sessão expirada', () => {
  it('um 401 em chamada autenticada leva ao login com aviso', async () => {
    mockApi(() => ({ status: 401, body: { error: { code: 'UNAUTHENTICATED', message: 'Sessão ausente ou expirada' } } }));
    renderApp(<AppRoutes />, { route: '/aluno', user: student });
    await api('/offers').catch(() => undefined);
    await waitFor(() => expect(screen.getByTestId('url')).toHaveTextContent('/login'));
    expect(screen.getByRole('alert')).toHaveTextContent('Sua sessão expirou');
    expect(session.get()).toBeNull();
  });
});
