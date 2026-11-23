import { render, screen } from '@testing-library/react';
import { App } from '../src/App';

it('sem sessão, a aplicação abre na tela de login', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: 'Sistema de Matrícula' })).toBeInTheDocument();
  expect(screen.getByLabelText('Nome de usuário')).toBeInTheDocument();
});
