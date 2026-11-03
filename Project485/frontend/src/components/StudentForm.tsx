import React, { useState } from 'react';
import { apiClient } from '../api/client';

const StudentForm = () => {
  const [formData, setFormData] = useState({ firstName: '', lastName: '', email: '', major: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await apiClient.post('/students', formData);
      setFormData({ firstName: '', lastName: '', email: '', major: '' });
      window.location.reload(); // Refresh table
    } catch (error) {
      console.error(error);
      alert('Failed to add student. Ensure backend is running and data is valid.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white shadow rounded-lg border border-gray-200">
      <div className="px-6 py-5 border-b border-gray-200 bg-gray-50">
        <h3 className="text-lg font-semibold leading-6 text-gray-900">Add New Student</h3>
      </div>
      <div className="p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">First Name</label>
              <input type="text" name="firstName" id="firstName" required value={formData.firstName} onChange={handleChange} 
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border outline-none transition" placeholder="John" />
            </div>
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">Last Name</label>
              <input type="text" name="lastName" id="lastName" required value={formData.lastName} onChange={handleChange} 
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border outline-none transition" placeholder="Doe" />
            </div>
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email Address</label>
            <input type="email" name="email" id="email" required value={formData.email} onChange={handleChange} 
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border outline-none transition" placeholder="john.doe@example.com" />
          </div>
          <div>
            <label htmlFor="major" className="block text-sm font-medium text-gray-700">Major (Optional)</label>
            <input type="text" name="major" id="major" value={formData.major} onChange={handleChange} 
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border outline-none transition" placeholder="e.g. Computer Engineering" />
          </div>
          <div className="pt-2">
            <button type="submit" disabled={isSubmitting} 
              className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-70">
              {isSubmitting ? 'Saving...' : 'Register Student'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
export default StudentForm;
