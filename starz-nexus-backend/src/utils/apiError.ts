export class ApiError extends Error {
  statusCode: number;
  isOperational: boolean;
  errors?: any[];
  code?: string;

  constructor(
    message: string,
    statusCode: number,
    code?: string,
    isOperational: boolean = true,
    errors?: any[]
  ) {
    super(message);
    
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.errors = errors;
    this.code = code;
    
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string = 'Bad Request', errors?: any[]) {
    return new ApiError(message, 400, 'BAD_REQUEST', true, errors);
  }

  static unauthorized(message: string = 'Unauthorized') {
    return new ApiError(message, 401, 'UNAUTHORIZED');
  }

  static forbidden(message: string = 'Forbidden') {
    return new ApiError(message, 403, 'FORBIDDEN');
  }

  static notFound(message: string = 'Not Found') {
    return new ApiError(message, 404, 'NOT_FOUND');
  }

  static conflict(message: string = 'Conflict') {
    return new ApiError(message, 409, 'CONFLICT');
  }

  static validationError(message: string = 'Validation Error', errors?: any[]) {
    return new ApiError(message, 422, 'VALIDATION_ERROR', true, errors);
  }

  static internal(message: string = 'Internal Server Error') {
    return new ApiError(message, 500, 'INTERNAL_ERROR');
  }

  static serviceUnavailable(message: string = 'Service Unavailable') {
    return new ApiError(message, 503, 'SERVICE_UNAVAILABLE');
  }

  toJSON() {
    return {
      success: false,
      error: {
        message: this.message,
        code: this.code,
        statusCode: this.statusCode,
        errors: this.errors,
        ...(process.env.NODE_ENV === 'development' && { stack: this.stack }),
      },
    };
  }
}