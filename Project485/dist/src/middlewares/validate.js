"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.idParam = exports.validate = void 0;
const zod_1 = require("zod");
/**
 * ตรวจสอบ request ด้วย Zod และแทนค่าด้วยข้อมูลที่ parse แล้ว (ตัด field ที่ไม่รู้จักออก / แปลงชนิดข้อมูล)
 * ผลลัพธ์ของ query จะเก็บไว้ที่ res.locals.query เพราะ req.query เป็น getter
 */
const validate = (schemas) => (req, res, next) => {
    try {
        if (schemas.params)
            req.params = schemas.params.parse(req.params);
        if (schemas.query)
            res.locals.query = schemas.query.parse(req.query);
        if (schemas.body)
            req.body = schemas.body.parse(req.body);
        next();
    }
    catch (error) {
        next(error);
    }
};
exports.validate = validate;
exports.idParam = zod_1.z.object({ id: zod_1.z.coerce.number().int().positive() });
