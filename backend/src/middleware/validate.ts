import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export type ValidationSource = 'body' | 'query' | 'params';

/**
 * Express middleware to validate request payload against a Zod schema.
 * Replaces req[source] with parsed/sanitized data on success.
 * Returns 400 Bad Request with field-level error messages on failure.
 */
export const validate = (schema: ZodSchema, source: ValidationSource = 'body') => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = await schema.parseAsync(req[source]);
      req[source] = parsed;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        res.status(400).json({
          error: 'Validation failed',
          details: err.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        });
        return;
      }

      next(err);
    }
  };
};
