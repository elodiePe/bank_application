export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message?: string,
  ) {
    super(message ?? code);
    this.name = 'AppError';
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Ressource introuvable') {
    super(404, 'NOT_FOUND', message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Accès refusé') {
    super(403, 'FORBIDDEN', message);
  }
}

export class InsufficientFundsError extends AppError {
  constructor(message = 'Solde insuffisant') {
    super(422, 'INSUFFICIENT_FUNDS', message);
  }
}

export class AlreadyReversedError extends AppError {
  constructor(message = 'Cette opération a déjà été corrigée') {
    super(409, 'ALREADY_REVERSED', message);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Requête invalide') {
    super(400, 'INVALID_INPUT', message);
  }
}

export class InvalidRequestStateError extends AppError {
  constructor(message = "Cette demande n'est plus en attente") {
    super(409, 'INVALID_REQUEST_STATE', message);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflit avec une ressource existante') {
    super(409, 'CONFLICT', message);
  }
}

export class ExternalServiceError extends AppError {
  constructor(message = 'Service externe indisponible') {
    super(502, 'EXTERNAL_SERVICE_ERROR', message);
  }
}
