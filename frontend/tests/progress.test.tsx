import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProgressPage } from '../src/pages/student/ProgressPage';
import { mockApi, renderApp, student } from './helpers';

const progress = {
  mandatory: { required: 180, completed: 120, inProgress: 30, remaining: 60, percent: 67 },
  profile: { required: 120, completed: 120, inProgress: 0, remaining: 0, percent: 100 },
  free: { required: 60, completed: 60, inProgress: 0, remaining: 0, percent: 100 },
};

describe('ProgressPage', () => {
  it('mostra, para cada grupo, a CH exigida, integralizada, em curso e o que falta', async () => {
    mockApi(() => ({ body: progress }));
    renderApp(<ProgressPage />, { user: student });
    const card = await screen.findByRole('listitem', { name: 'Obrigatórias' });
    const values = (label: string) => within(card).getByText(label).nextElementSibling;
    expect(values('Exigida')).toHaveTextContent('180h');
    expect(values('Integralizada')).toHaveTextContent('120h');
    expect(values('Em curso')).toHaveTextContent('30h');
    expect(values('Falta')).toHaveTextContent('60h');
    expect(within(card).getByRole('progressbar')).toHaveAttribute('value', '67');
    expect(screen.getByRole('listitem', { name: 'Eletivas de perfil' })).toHaveTextContent('100% concluído');
  });

  it('carregando e erro com nova tentativa', async () => {
    let calls = 0;
    mockApi(() => (++calls === 1 ? { status: 500, body: { error: { code: 'INTERNAL_ERROR', message: 'Erro interno do servidor' } } } : { body: progress }));
    renderApp(<ProgressPage />, { user: student });
    expect(screen.getByText('Carregando…')).toBeInTheDocument();
    await userEvent.click(await screen.findByRole('button', { name: 'Tentar de novo' }));
    expect(await screen.findByRole('listitem', { name: 'Eletivas livres' })).toBeInTheDocument();
  });
});
