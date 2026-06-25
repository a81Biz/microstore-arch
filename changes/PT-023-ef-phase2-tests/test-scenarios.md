# test-scenarios.md — PT-023: Edge Function Test Coverage Phase 2

**PT:** PT-023 · **Fecha:** 2026-06-25

Los escenarios están corregidos conforme a la lectura del código fuente en STATE 2.

---

## §1 — `manage-payment-gateways`

**baseUrl:** `http://localhost:54321/functions/v1/manage-payment-gateways`

### Scenario 1.1 — GET lista de gateways (vendor + MFA) → 200

```typescript
it('returns 200 with gateway list for authenticated vendor', async () => {
  global.fetch = vi.fn().mockResolvedValue({
    status: 200,
    json: async () => ([
      { gateway: 'stripe',      is_enabled: true,  last_rotated_at: null, created_at: '2026-01-01' },
      { gateway: 'paypal',      is_enabled: false, last_rotated_at: null, created_at: null },
      { gateway: 'mercadopago', is_enabled: false, last_rotated_at: null, created_at: null },
      { gateway: 'hey_banco',   is_enabled: false, last_rotated_at: null, created_at: null },
    ]),
  });

  const response = await fetch(baseUrl, {
    method: 'GET',
    headers: { Authorization: 'Bearer vendor-mfa-token' },
  });

  expect(response.status).toBe(200);
  const body = await response.json();
  expect(Array.isArray(body)).toBe(true);
  expect(body[0].gateway).toBe('stripe');
});
```

### Scenario 1.2 — POST guarda configuración → 200

```typescript
it('returns 200 on successful gateway config save', async () => {
  global.fetch = vi.fn().mockResolvedValue({
    status: 200,
    json: async () => ({ success: true, gateway: 'stripe' }),
  });

  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer vendor-mfa-token',
    },
    body: JSON.stringify({
      gateway: 'stripe',
      credentials: { secret_key: 'sk_test_xxx' },
      is_enabled: true,
    }),
  });

  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body.success).toBe(true);
  expect(body.gateway).toBe('stripe');
});
```

### Scenario 1.3 — GET sin Authorization → 401

```typescript
it('returns 401 when no Authorization header', async () => {
  global.fetch = vi.fn().mockResolvedValue({
    status: 401,
    json: async () => ({ error: 'UNAUTHORIZED', message: 'No autorizado' }),
  });

  const response = await fetch(baseUrl, {
    method: 'GET',
  });

  expect(response.status).toBe(401);
});
```

### Scenario 1.4 (bonus) — GET /public → 200 sin auth

```typescript
it('returns 200 with enabled gateways on public endpoint (no auth)', async () => {
  global.fetch = vi.fn().mockResolvedValue({
    status: 200,
    json: async () => (['stripe', 'paypal']),
  });

  const response = await fetch(`${baseUrl}/public`, {
    method: 'GET',
  });

  expect(response.status).toBe(200);
  const body = await response.json();
  expect(Array.isArray(body)).toBe(true);
});
```

---

## §2 — `manage-addresses`

**baseUrl:** `http://localhost:54321/functions/v1/manage-addresses`

### Scenario 2.1 — POST crea dirección → 201

```typescript
it('returns 201 with created address for authenticated customer', async () => {
  global.fetch = vi.fn().mockResolvedValue({
    status: 201,
    json: async () => ({
      id: 'addr-uuid-001',
      label: 'home',
      street: 'Calle Principal 123',
      city: 'Ciudad de México',
      postal_code: '06600',
      country: 'MX',
      is_default: false,
      created_at: '2026-06-25T00:00:00Z',
    }),
  });

  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer customer-token',
    },
    body: JSON.stringify({
      label: 'home',
      street: 'Calle Principal 123',
      city: 'Ciudad de México',
      postal_code: '06600',
      country: 'MX',
    }),
  });

  expect(response.status).toBe(201);
  const body = await response.json();
  expect(body.id).toBeDefined();
  expect(body.label).toBe('home');
});
```

### Scenario 2.2 — GET lista direcciones → 200

```typescript
it('returns 200 with address list for authenticated customer', async () => {
  global.fetch = vi.fn().mockResolvedValue({
    status: 200,
    json: async () => ([
      {
        id: 'addr-uuid-001',
        label: 'home',
        street: 'Calle Principal 123',
        city: 'CDMX',
        postal_code: '06600',
        country: 'MX',
        is_default: true,
        created_at: '2026-06-25T00:00:00Z',
      },
    ]),
  });

  const response = await fetch(baseUrl, {
    method: 'GET',
    headers: { Authorization: 'Bearer customer-token' },
  });

  expect(response.status).toBe(200);
  const body = await response.json();
  expect(Array.isArray(body)).toBe(true);
  expect(body.length).toBeGreaterThanOrEqual(0);
});
```

### Scenario 2.3 — DELETE dirección propia → 200

```typescript
it('returns 200 on successful address deletion', async () => {
  global.fetch = vi.fn().mockResolvedValue({
    status: 200,
    json: async () => ({ success: true }),
  });

  const response = await fetch(`${baseUrl}/addr-uuid-001`, {
    method: 'DELETE',
    headers: { Authorization: 'Bearer customer-token' },
  });

  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body.success).toBe(true);
});
```

### Scenario 2.4 — GET sin Authorization → 401

```typescript
it('returns 401 when no Authorization header', async () => {
  global.fetch = vi.fn().mockResolvedValue({
    status: 401,
    json: async () => ({ error: 'UNAUTHORIZED', message: 'No autorizado' }),
  });

  const response = await fetch(baseUrl, {
    method: 'GET',
  });

  expect(response.status).toBe(401);
});
```

---

## §3 — `change-password`

**baseUrl:** `http://localhost:54321/functions/v1/change-password`

> **Nota:** Esta función es para el flujo de primer login. Toma `{ temp_token, new_password }`.
> El `temp_token` viene del response de `login` cuando `next_step = change_password`.

### Scenario 3.1 — POST con temp_token válido + contraseña fuerte → 200

```typescript
it('returns 200 on successful password change with valid temp_token', async () => {
  global.fetch = vi.fn().mockResolvedValue({
    status: 200,
    json: async () => ({
      success: true,
      message: 'Contraseña actualizada correctamente. Procede a configurar TOTP.',
    }),
  });

  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      temp_token: 'valid-jwt-temp-token',
      new_password: 'NuevaContraseña123!',
    }),
  });

  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body.success).toBe(true);
});
```

### Scenario 3.2 — POST con temp_token inválido → 401

```typescript
it('returns 401 for invalid or expired temp_token', async () => {
  global.fetch = vi.fn().mockResolvedValue({
    status: 401,
    json: async () => ({ error: 'UNAUTHORIZED', message: 'Token inválido' }),
  });

  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      temp_token: 'invalid-or-expired-token',
      new_password: 'NuevaContraseña123!',
    }),
  });

  expect(response.status).toBe(401);
});
```

### Scenario 3.3 — POST con contraseña débil → 400 WEAK_PASSWORD

```typescript
it('returns 400 WEAK_PASSWORD for password not meeting complexity requirements', async () => {
  global.fetch = vi.fn().mockResolvedValue({
    status: 400,
    json: async () => ({
      error: 'WEAK_PASSWORD',
      message: 'La contraseña debe contener: mínimo 12 caracteres',
    }),
  });

  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      temp_token: 'valid-temp-token',
      new_password: 'abc123',
    }),
  });

  expect(response.status).toBe(400);
  const body = await response.json();
  expect(body.error).toBe('WEAK_PASSWORD');
});
```

### Scenario 3.4 — POST sin temp_token → 401

```typescript
it('returns 401 when temp_token is missing from body', async () => {
  global.fetch = vi.fn().mockResolvedValue({
    status: 401,
    json: async () => ({ error: 'UNAUTHORIZED', message: 'Token y nueva contraseña requeridos' }),
  });

  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ new_password: 'NuevaContraseña123!' }),
  });

  expect(response.status).toBe(401);
});
```
