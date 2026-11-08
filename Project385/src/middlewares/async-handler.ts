import { Request, Response, NextFunction, RequestHandler } from 'express';

/** ห่อ async route handler เพื่อส่ง error ไปยัง errorHandler อัตโนมัติ */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
