export class AppError extends Error {
  constructor(public message: string, public status: number = 400, public code: string = 'BAD_REQUEST') {
    super(message);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'No autorizado') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class BusinessError extends AppError {}

export const handleError = (error: any) => {
  console.error(error);
  
  if (error instanceof AppError) {
    return new Response(
      JSON.stringify({ error: error.code, message: error.message }),
      { status: error.status, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ error: 'INTERNAL_SERVER_ERROR', message: 'Ha ocurrido un error inesperado' }),
    { status: 500, headers: { 'Content-Type': 'application/json' } }
  );
};
