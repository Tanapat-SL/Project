import { prisma } from '../lib/prisma';
export const getAllStudents = async () => await prisma.student.findMany();
export const createStudent = async (data: any) => await prisma.student.create({ data });