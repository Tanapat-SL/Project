/**
 * Express 4 ไม่ส่ง error จาก async handler ไปที่ errorHandler ให้เอง
 * (ถ้า Promise reject จะกลายเป็น unhandled rejection และ request ค้าง)
 * ไฟล์นี้แพตช์ Layer.handle_request ให้ส่ง rejection ไปที่ next() อัตโนมัติ
 * ต้อง import ก่อนสร้าง route ใดๆ
 */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Layer = require('express/lib/router/layer');

Layer.prototype.handle_request = function handleRequest(req: any, res: any, next: any) {
  const fn = this.handle;
  if (fn.length > 3) return next(); // error-handling middleware
  try {
    const result = fn(req, res, next);
    if (result && typeof result.catch === 'function') result.catch(next);
  } catch (error) {
    next(error);
  }
};

export {};
