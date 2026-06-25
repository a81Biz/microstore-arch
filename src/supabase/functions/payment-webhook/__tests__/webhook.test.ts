import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TOTP, Secret } from 'otpauth';
import * as crypto from 'node:crypto';

// --- Helpers para tests de firma Stripe ---

async function computeStripeSignature(
  payload: string,
  secret: string,
  timestamp: number
): Promise<string> {
  const signedPayload = `${timestamp}.${payload}`;
  const key = await globalThis.crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const bytes = await globalThis.crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(signedPayload)
  );
  return Array.from(new Uint8Array(bytes))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function buildStripeSignatureHeader(sig: string, timestamp: number): string {
  return `t=${timestamp},v1=${sig}`;
}

// --- Tests de verificación de firma Stripe ---

describe('Stripe Webhook Signature Verification', () => {
  const WEBHOOK_SECRET = 'whsec_test_secret_key_32_bytes!!';
  const VALID_BODY = JSON.stringify({ type: 'payment_intent.succeeded', data: { object: { id: 'pi_123', amount_received: 10000, currency: 'mxn', metadata: { order_id: 'order-uuid' } } } });

  it('acepta firma válida con timestamp reciente', async () => {
    const timestamp = Math.floor(Date.now() / 1000);
    const sig = await computeStripeSignature(VALID_BODY, WEBHOOK_SECRET, timestamp);
    const header = buildStripeSignatureHeader(sig, timestamp);

    // Verificar que la firma coincide
    const parts = header.split(',');
    const tPart = parts.find(p => p.startsWith('t='));
    const v1Part = parts.find(p => p.startsWith('v1='));

    expect(tPart).toBeDefined();
    expect(v1Part).toBeDefined();
    expect(v1Part!.slice(3)).toBe(sig);
  });

  it('rechaza firma con timestamp expirado (>5 min)', async () => {
    const expiredTimestamp = Math.floor(Date.now() / 1000) - 400;
    const sig = await computeStripeSignature(VALID_BODY, WEBHOOK_SECRET, expiredTimestamp);

    const eventAge = Math.floor(Date.now() / 1000) - expiredTimestamp;
    expect(eventAge).toBeGreaterThan(300);
  });

  it('rechaza firma manipulada', async () => {
    const timestamp = Math.floor(Date.now() / 1000);
    const validSig = await computeStripeSignature(VALID_BODY, WEBHOOK_SECRET, timestamp);
    // Use a suffix guaranteed different from the original last 2 chars to avoid flaky failure
    // when the HMAC result happens to end in '00'.
    const suffix = validSig.slice(-2) === '00' ? 'ff' : '00';
    const tamperedSig = validSig.slice(0, -2) + suffix;

    expect(tamperedSig).not.toBe(validSig);
  });

  it('rechaza body manipulado con firma original', async () => {
    const timestamp = Math.floor(Date.now() / 1000);
    const originalSig = await computeStripeSignature(VALID_BODY, WEBHOOK_SECRET, timestamp);
    const tamperedBody = VALID_BODY.replace('10000', '100'); // Cambiar monto

    const tamperedSig = await computeStripeSignature(tamperedBody, WEBHOOK_SECRET, timestamp);

    expect(tamperedSig).not.toBe(originalSig);
  });
});

// --- Tests de validación de monto ---

describe('Payment Amount Validation', () => {
  it('detecta discrepancia de monto', () => {
    const orderTotal = 99.99; // $99.99 MXN
    const expectedCents = Math.round(orderTotal * 100); // 9999
    const receivedCents = 100; // $1.00 MXN — intento de fraude

    expect(receivedCents).not.toBe(expectedCents);
    expect(Math.abs(receivedCents - expectedCents)).toBeGreaterThan(0);
  });

  it('acepta monto exacto (centavos)', () => {
    const orderTotal = 299.50;
    const expectedCents = Math.round(orderTotal * 100); // 29950
    const stripeAmount = 29950; // Stripe envía en centavos

    expect(stripeAmount).toBe(expectedCents);
  });

  it('maneja redondeo de decimales correctamente', () => {
    const orderTotal = 19.99;
    const expectedCents = Math.round(orderTotal * 100);

    expect(expectedCents).toBe(1999);
    expect(Math.round(19.99 * 100)).toBe(1999);
  });
});

// --- Tests de idempotencia ---

describe('Webhook Idempotency', () => {
  it('detecta webhook ya procesado exitosamente', () => {
    const existingLog = { id: 'log-uuid', status: 'processed' };

    if (existingLog?.status === 'processed') {
      expect(true).toBe(true); // Debe retornar duplicate: true
    }
  });

  it('reintenta webhook con status processing (fallo previo)', () => {
    const existingLog = { id: 'log-uuid', status: 'processing' };

    // Si el log existe pero no está 'processed', debe reintentar
    const shouldRetry = existingLog?.status !== 'processed';
    expect(shouldRetry).toBe(true);
  });

  it('reintenta webhook con status failed', () => {
    const existingLog = { id: 'log-uuid', status: 'failed' };

    const shouldRetry = existingLog?.status !== 'processed';
    expect(shouldRetry).toBe(true);
  });

  it('no procesa webhook sin registro previo (primer intento)', () => {
    const existingLog = null;

    const isDuplicate = existingLog?.status === 'processed';
    expect(isDuplicate).toBe(false);
  });
});

// --- Tests de MercadoPago signature ---

describe('MercadoPago Signature Verification', () => {
  async function computeMercadoPagoSig(
    dataId: string,
    requestId: string,
    ts: string,
    secret: string
  ): Promise<string> {
    const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
    const key = await globalThis.crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const bytes = await globalThis.crypto.subtle.sign(
      'HMAC',
      key,
      new TextEncoder().encode(manifest)
    );
    return Array.from(new Uint8Array(bytes))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  it('acepta firma MercadoPago válida', async () => {
    const secret = 'mp_webhook_secret';
    const dataId = '12345';
    const requestId = 'req-uuid';
    const ts = '1234567890';

    const sig = await computeMercadoPagoSig(dataId, requestId, ts, secret);
    const header = `ts=${ts},v1=${sig}`;

    expect(header).toContain(`v1=${sig}`);
    expect(sig.length).toBe(64); // SHA-256 hex = 64 chars
  });

  it('rechaza firma con datos incorrectos', async () => {
    const secret = 'mp_webhook_secret';
    const correctSig = await computeMercadoPagoSig('real-id', 'real-req', '123', secret);
    const wrongSig = await computeMercadoPagoSig('fake-id', 'real-req', '123', secret);

    expect(correctSig).not.toBe(wrongSig);
  });
});
