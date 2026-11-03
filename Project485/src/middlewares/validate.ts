import { Request, Response, NextFunction } from 'express';
import { ZodTypeAny, z } from 'zod';

type Schemas = {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
};

/**
 * ตรวจสอบ request ด้วย Zod และแทนค่าด้วยข้อมูลที่ parse แล้ว (ตัด field ที่ไม่รู้จักออก / แปลงชนิดข้อมูล)
 * ผลลัพธ์ของ query จะเก็บไว้ที่ res.locals.query เพราะ req.query เป็น getter
 */
export const validate = (schemas: Schemas) => (req: Request, res: Response, next: NextFunction) => {
  try {
    if (schemas.params) req.params = schemas.params.parse(req.params);
    if (schemas.query) res.locals.query = schemas.query.parse(req.query);
    if (schemas.body) req.body = schemas.body.parse(req.body);
    next();
  } catch (error) {
    next(error);
  }
};

export const idParam = z.object({ id: z.coerce.number().int().positive() });
