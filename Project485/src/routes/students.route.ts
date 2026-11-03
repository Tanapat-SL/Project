import { Router } from 'express';
import * as studentService from '../services/student.service';
const router = Router();
router.get('/', async (req, res) => {
  const students = await studentService.getAllStudents();
  res.json(students);
});
router.post('/', async (req, res) => {
  const newStudent = await studentService.createStudent(req.body);
  res.status(201).json(newStudent);
});
export default router;