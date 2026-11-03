"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseCookies = void 0;
/** อ่านค่า Cookie จาก header โดยไม่ต้องพึ่ง cookie-parser */
const parseCookies = (header) => {
    const result = {};
    if (!header)
        return result;
    for (const part of header.split(';')) {
        const index = part.indexOf('=');
        if (index < 0)
            continue;
        const key = part.slice(0, index).trim();
        const value = part.slice(index + 1).trim();
        if (!key)
            continue;
        try {
            result[key] = decodeURIComponent(value);
        }
        catch {
            result[key] = value;
        }
    }
    return result;
};
exports.parseCookies = parseCookies;
