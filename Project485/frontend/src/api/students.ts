import { apiClient } from './client';
import { Student } from '../types/student';
export const getStudents = async (): Promise<Student[]> => {
  const response = await apiClient.get('/students');
  return response.data;
};