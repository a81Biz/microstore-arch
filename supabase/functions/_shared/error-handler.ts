export class AppError extends Error {
  constructor(
    public message: string,
    public status: number = 400,
    public code: string = 'BAD_REQUEST'
  ) {
    super(message);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'No autorizado') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class BusinessError extends AppError {}

export const handleError = (error: unknown): Response => {
  if (error instanceof AppError) {
    // Solo registrar errores de servidor (5xx); los errores de cliente (4xx) son ruido esperado
    if (error.status >= 500) {
      console.error(`[${error.code}]`, error.message);
    }
    return new Response(
      JSON.stringify({ error: error.code, message: error.message }),
      { status: error.status, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Error inesperado — registrar el tipo pero nunca el stack trace completo en producción
  const errType = error instanceof Error ? error.constructor.name : typeof error;
  const errMsg = error instanceof Error ? error.message : 'Unknown error';
  console.error(`[INTERNAL_SERVER_ERROR] ${errType}: ${errMsg}`);

  return new Response(
    JSON.stringify({ error: 'INTERNAL_SERVER_ERROR', message: 'Ha ocurrido un error inesperado' }),
    { status: 500, headers: { 'Content-Type': 'application/json' } }
  );
};
