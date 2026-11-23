import { api, ApiError, session } from '../src/services/api';
import { mockApi, student } from './helpers';

describe('cliente da API', () => {
  it('envia o token da sessão no cabeçalho Authorization', async () => {
    session.set({ token: 'abc', user: student });
    const spy = mockApi(() => ({ body: { ok: true } }));
    await api('/offers');
    const init = spy.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer abc');
  });

  it('converte o erro padrão da API em ApiError com código e mensagem', async () => {
    mockApi(() => ({ status: 409, body: { error: { code: 'CLASS_FULL', message: 'A turma está lotada' } } }));
    await expect(api('/enrollments', { method: 'POST', body: { classId: 1 } })).rejects.toMatchObject({
      status: 409,
      code: 'CLASS_FULL',
      message: 'A turma está lotada',
    });
  });

  it('falha de rede vira ApiError amigável', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const err = (await api('/offers').catch((e) => e)) as ApiError;
    expect(err).toBeInstanceOf(ApiError);
    expect(err.code).toBe('NETWORK_ERROR');
  });

  it('204 devolve undefined', async () => {
    mockApi(() => ({ status: 204 }));
    await expect(api('/enrollments/1', { method: 'DELETE' })).resolves.toBeUndefined();
  });
});
