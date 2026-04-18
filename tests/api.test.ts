import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/server.js';

describe('🛡️ Motor de Risco API', () => {
  
  it('Deve retornar status healthy no Healthcheck', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('healthy');
  });

  it('Deve rejeitar transações sem campos obrigatórios (400)', async () => {
    const response = await request(app)
      .post('/api/v1/analyze-risk')
      .send({ amount: 500 }); 

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Campos obrigatórios ausentes');
  });

});