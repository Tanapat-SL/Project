import { z } from 'zod';
export const studentSchema = z.object({ body: z.object({ firstName: z.string(), lastName: z.string(), email: z.string().email(), major: z.string().optional() }) });