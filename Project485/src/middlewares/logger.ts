import { Request, Response, NextFunction } from 'express';

export const logger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    // บันทึกเฉพาะ path (ไม่รวม query string) เพื่อไม่ให้ code/state ของ OAuth ลง Log
    console.log(`${req.method} ${req.path} ${res.statusCode} ${Date.now() - start}ms`);
  });
  next();
};
