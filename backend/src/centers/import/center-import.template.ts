import * as XLSX from 'xlsx';

export function buildCenterImportTemplateXlsx(): Buffer {
  const wb = XLSX.utils.book_new();

  const groups = [
    {
      name: 'G1 Matematika',
      description: '',
      subjectName: 'Matematika',
      teacherUsername: 'teacher1',
      daysOfWeek: 'monday,wednesday,friday',
      startTime: '14:00',
      endTime: '16:00',
    },
  ];

  const students = [
    {
      username: 'student1',
      password: 'lms1234',
      firstName: 'Ali',
      lastName: 'Valiyev',
      phone: '+998901234567',
      groupName: 'G1 Matematika',
    },
  ];

  const payments = [
    {
      studentUsername: 'student1',
      groupName: 'G1 Matematika',
      amount: 300000,
      dueDate: '2026-01-10',
      status: 'pending',
      paidDate: '',
      description: "Yanvar oylik to'lovi",
    },
  ];

  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(groups), 'Groups');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(students), 'Students');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(payments), 'Payments');

  const out = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  return out;
}
