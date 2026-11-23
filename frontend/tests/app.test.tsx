import { render, screen } from '@testing-library/react';
import { App } from '../src/App';

it('renderiza o título da aplicação', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: 'Sistema de Matrícula' })).toBeInTheDocument();
});
