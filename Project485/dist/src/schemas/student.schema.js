"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.studentSchema = void 0;
const zod_1 = require("zod");
exports.studentSchema = zod_1.z.object({ body: zod_1.z.object({ firstName: zod_1.z.string(), lastName: zod_1.z.string(), email: zod_1.z.string().email(), major: zod_1.z.string().optional() }) });
