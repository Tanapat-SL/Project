"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const logger = (req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        // บันทึกเฉพาะ path (ไม่รวม query string) เพื่อไม่ให้ code/state ของ OAuth ลง Log
        console.log(`${req.method} ${req.path} ${res.statusCode} ${Date.now() - start}ms`);
    });
    next();
};
exports.logger = logger;
