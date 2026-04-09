import { Response } from 'express';

interface SuccessResponse {
  success: boolean;
  data?: any;
  message?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
    hasNext?: boolean;
    hasPrev?: boolean;
  };
}

interface ErrorResponse {
  success: boolean;
  error: {
    message: string;
    code?: string;
    statusCode: number;
    errors?: any[];
    stack?: string;
  };
}

export class ApiResponse {
  /**
   * Send success response
   */
  static success(res: Response, data: any = null, message: string = 'Success', statusCode: number = 200) {
    const response: SuccessResponse = {
      success: true,
      message,
      data,
    };

    return res.status(statusCode).json(response);
  }

  /**
   * Send paginated response
   */
  static paginated(
    res: Response,
    data: any[],
    total: number,
    page: number = 1,
    limit: number = 10,
    message: string = 'Success'
  ) {
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    const response: SuccessResponse = {
      success: true,
      message,
      data,
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNext,
        hasPrev,
      },
    };

    return res.status(200).json(response);
  }

  /**
   * Send created response
   */
  static created(res: Response, data: any = null, message: string = 'Resource created successfully') {
    return this.success(res, data, message, 201);
  }

  /**
   * Send no content response
   */
  static noContent(res: Response) {
    return res.status(204).send();
  }

  /**
   * Send error response
   */
  static error(res: Response, error: any) {
    const statusCode = error.statusCode || 500;
    const response: ErrorResponse = {
      success: false,
      error: {
        message: error.message || 'Internal Server Error',
        code: error.code,
        statusCode,
        errors: error.errors,
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
      },
    };

    return res.status(statusCode).json(response);
  }

  /**
   * Send validation error response
   */
  static validationError(res: Response, errors: any[], message: string = 'Validation failed') {
    return res.status(422).json({
      success: false,
      error: {
        message,
        code: 'VALIDATION_ERROR',
        statusCode: 422,
        errors,
      },
    });
  }
}