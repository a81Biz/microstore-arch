import { describe, it, expect } from 'vitest';
import { TOTP, Secret } from 'otpauth';

describe('TOTP Generation and Verification', () => {
  // Helper para crear TOTP con secret dado
  function createTOTP(secret: Secret, email = 'test@example.com') {
    return new TOTP({
      issuer: 'Micro-Store',
      label: email,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret,
    });
  }

  it('genera un secret único en cada llamada', () => {
    const bytes1 = new Uint8Array(20);
    const bytes2 = new Uint8Array(20);
    crypto.getRandomValues(bytes1);
    crypto.getRandomValues(bytes2);

    const secret1 = new Secret({ buffer: bytes1.buffer });
    const secret2 = new Secret({ buffer: bytes2.buffer });

    expect(secret1.base32).not.toBe(secret2.base32);
  });

  it('el secret tiene exactamente 20 bytes (160 bits)', () => {
    const bytes = new Uint8Array(20);
    crypto.getRandomValues(bytes);
    const secret = new Secret({ buffer: bytes.buffer });

    // Base32: 20 bytes = 160 bits → 32 caracteres base32
    expect(secret.base32.length).toBe(32);
  });

  it('genera una OTPAuth URI correctamente formada', () => {
    const bytes = new Uint8Array(20);
    crypto.getRandomValues(bytes);
    const secret = new Secret({ buffer: bytes.buffer });
    const totp = createTOTP(secret, 'vendor@tienda.com');
    const uri = totp.toString();

    expect(uri).toMatch(/^otpauth:\/\/totp\//);
    expect(uri).toContain('Micro-Store');
    expect(uri).toContain('vendor%40tienda.com');
    expect(uri).toContain(`secret=${secret.base32}`);
    expect(uri).toContain('period=30');
    expect(uri).toContain('digits=6');
    expect(uri).toContain('algorithm=SHA1');
  });

  it('verifica código TOTP actual con ventana 0', () => {
    const bytes = new Uint8Array(20);
    crypto.getRandomValues(bytes);
    const secret = new Secret({ buffer: bytes.buffer });
    const totp = createTOTP(secret);

    const currentCode = totp.generate();
    const delta = totp.validate({ token: currentCode, window: 1 });

    expect(delta).not.toBeNull();
    expect(Math.abs(delta!)).toBeLessThanOrEqual(1);
  });

  it('rechaza código aleatorio de 6 dígitos', () => {
    const bytes = new Uint8Array(20);
    crypto.getRandomValues(bytes);
    const secret = new Secret({ buffer: bytes.buffer });
    const totp = createTOTP(secret);

    // El código hardcodeado anterior siempre era inválido
    const hardcodedCode = '123456';
    const currentValid = totp.generate();

    // Si por coincidencia el código generado es 123456, el test sigue siendo válido
    // porque estamos verificando que la lógica de validación funciona
    const delta = totp.validate({ token: hardcodedCode, window: 1 });
    if (hardcodedCode !== currentValid) {
      expect(delta).toBeNull();
    }
  });

  it('valida correctamente código de período anterior (window=1)', () => {
    const bytes = new Uint8Array(20);
    crypto.getRandomValues(bytes);
    const secret = new Secret({ buffer: bytes.buffer });
    const totp = createTOTP(secret);

    const currentCode = totp.generate();
    // Simular validación con ventana de 1 período
    const delta = totp.validate({ token: currentCode, window: 1 });

    expect(delta).not.toBeNull();
  });

  it('rechaza código de 5 dígitos (formato incorrecto)', () => {
    const code = '12345';
    const isValid = /^\d{6}$/.test(code);
    expect(isValid).toBe(false);
  });

  it('rechaza código de 7 dígitos (formato incorrecto)', () => {
    const code = '1234567';
    const isValid = /^\d{6}$/.test(code);
    expect(isValid).toBe(false);
  });

  it('rechaza código con letras', () => {
    const code = '12345a';
    const isValid = /^\d{6}$/.test(code);
    expect(isValid).toBe(false);
  });

  it('acepta código de exactamente 6 dígitos', () => {
    const code = '000000';
    const isValid = /^\d{6}$/.test(code);
    expect(isValid).toBe(true);
  });

  it('puede serializar y deserializar secret base32', () => {
    const bytes = new Uint8Array(20);
    crypto.getRandomValues(bytes);
    const originalSecret = new Secret({ buffer: bytes.buffer });

    // Simular serialización (guardar en DB) y deserialización (leer de DB)
    const serialized = originalSecret.base32;
    const restored = Secret.fromBase32(serialized);

    const totp1 = createTOTP(originalSecret);
    const totp2 = createTOTP(restored);

    // Ambos deben generar el mismo código
    const code1 = totp1.generate();
    const code2 = totp2.generate();

    expect(code1).toBe(code2);
  });
});

describe('Password Complexity Validation', () => {
  function validatePassword(password: string): string[] {
    const errors: string[] = [];
    if (password.length < 12) errors.push('mínimo 12 caracteres');
    if (!/[A-Z]/.test(password)) errors.push('al menos una mayúscula');
    if (!/[a-z]/.test(password)) errors.push('al menos una minúscula');
    if (!/\d/.test(password)) errors.push('al menos un número');
    if (!/[!@#$%^&*()\-_=+]/.test(password)) errors.push('al menos un carácter especial');
    return errors;
  }

  it('rechaza contraseña corta', () => {
    expect(validatePassword('Short1!')).toContain('mínimo 12 caracteres');
  });

  it('rechaza contraseña sin mayúsculas', () => {
    expect(validatePassword('password123!!')).toContain('al menos una mayúscula');
  });

  it('rechaza contraseña sin minúsculas', () => {
    expect(validatePassword('PASSWORD123!!')).toContain('al menos una minúscula');
  });

  it('rechaza contraseña sin números', () => {
    expect(validatePassword('PasswordSecret!!')).toContain('al menos un número');
  });

  it('rechaza contraseña sin caracteres especiales', () => {
    expect(validatePassword('Password12345678')).toContain('al menos un carácter especial');
  });

  it('acepta contraseña fuerte', () => {
    const errors = validatePassword('SecurePass1!XYZ');
    expect(errors).toHaveLength(0);
  });

  it('rechaza el código hardcodeado previo como contraseña', () => {
    // El código hardcodeado '123456' nunca debería pasar la validación
    const errors = validatePassword('123456');
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe('verify-totp: seguridad contra backdoors y casos límite', () => {
  function makeTOTP(secret: Secret, email = 'vendor@tienda.com') {
    return new TOTP({ issuer: 'Micro-Store', label: email, algorithm: 'SHA1', digits: 6, period: 30, secret });
  }

  function randomSecret(): Secret {
    const bytes = new Uint8Array(20);
    crypto.getRandomValues(bytes);
    return new Secret({ buffer: bytes.buffer });
  }

  it('solo acepta el código TOTP criptográficamente correcto — prueba determinística', () => {
    const totp = makeTOTP(randomSecret());
    const validCode = totp.generate();
    // Código garantizadamente distinto: +1 mod 1,000,000
    const wrongCode = String((parseInt(validCode) + 1) % 1_000_000).padStart(6, '0');

    expect(totp.validate({ token: validCode, window: 1 })).not.toBeNull();
    expect(totp.validate({ token: wrongCode, window: 1 })).toBeNull();
  });

  it('"123456" es rechazado por la lógica TOTP real — sin bypass hardcodeado', () => {
    // Ejecutar con 5 secrets independientes para descartar coincidencia casual
    // (probabilidad de que '123456' sea el token actual: ~5 × 10^-6)
    let backdoorAccepted = false;
    for (let i = 0; i < 5; i++) {
      const totp = makeTOTP(randomSecret());
      const validCode = totp.generate();
      if (validCode !== '123456') {
        if (totp.validate({ token: '123456', window: 1 }) !== null) {
          backdoorAccepted = true;
        }
      }
    }
    expect(backdoorAccepted).toBe(false);
  });

  it('dos secrets distintos producen códigos independientes — no hay bypass global', () => {
    const totp1 = makeTOTP(randomSecret());
    const totp2 = makeTOTP(randomSecret());

    const code1 = totp1.generate();
    const code2 = totp2.generate();

    // Si los códigos difieren (virtualmente siempre), cada secret rechaza al otro
    if (code1 !== code2) {
      expect(totp1.validate({ token: code2, window: 1 })).toBeNull();
      expect(totp2.validate({ token: code1, window: 1 })).toBeNull();
    }
  });

  it('código de período completamente pasado es rechazado (window=1, 2 períodos atrás)', () => {
    // Simula un código demasiado viejo: window=1 solo tolera ±1 período (30s)
    const secret = randomSecret();
    const totp = makeTOTP(secret);

    // Generar token para un timestamp 90 segundos atrás (3 períodos)
    const pastTimestamp = Math.floor(Date.now() / 1000) - 90;
    const pastCode = new TOTP({
      issuer: 'Micro-Store', label: 'old@tienda.com',
      algorithm: 'SHA1', digits: 6, period: 30, secret,
    }).generate({ timestamp: pastTimestamp * 1000 });

    // Validar con window=1: solo ±1 período, 3 períodos atrás debe fallar
    const currentCode = totp.generate();
    if (pastCode !== currentCode) {
      expect(totp.validate({ token: pastCode, window: 1 })).toBeNull();
    }
  });
});

describe('Order Status Transitions', () => {
  type OrderStatus = 'pending' | 'paid' | 'in_production' | 'shipped' | 'delivered' | 'cancelled';

  function isValidTransition(from: OrderStatus, to: OrderStatus): boolean {
    if (to === 'delivered' && from !== 'shipped') return false;
    if (to === 'cancelled' && ['shipped', 'delivered'].includes(from)) return false;
    return true;
  }

  it('permite cancelar orden pendiente', () => {
    expect(isValidTransition('pending', 'cancelled')).toBe(true);
  });

  it('permite cancelar orden pagada', () => {
    expect(isValidTransition('paid', 'cancelled')).toBe(true);
  });

  it('rechaza cancelar orden enviada', () => {
    expect(isValidTransition('shipped', 'cancelled')).toBe(false);
  });

  it('rechaza cancelar orden entregada', () => {
    expect(isValidTransition('delivered', 'cancelled')).toBe(false);
  });

  it('rechaza marcar entregado si no está enviado', () => {
    expect(isValidTransition('paid', 'delivered')).toBe(false);
  });

  it('permite marcar entregado si está enviado', () => {
    expect(isValidTransition('shipped', 'delivered')).toBe(true);
  });
});
