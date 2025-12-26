const createStudents = async () => {
	const studentsArray = require('./students.json');
	for (const student of studentsArray) {
		await fetch('https://lms.api.universal-uz.uz/api/users', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization:
					'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsInJvbGUiOiJzdXBlcmFkbWluIiwiaWF0IjoxNzY2NzMzNTAyLCJleHAiOjE3NjczMzgzMDJ9.4zLEnSk1stKsN0ZEVzDuDPFU9UKpfH6niTc7lwN1PCQ',
			},
			body: JSON.stringify({
				username: student.username,
				password: student.password,
				firstName: student.firstName,
				lastName: student.lastName,
				phone: student.phone,
				role: student.role,
				centerId: student.centerId,
			}),
		});
		console.log(`Student ${student.id} created`);
	}
	console.log('Students created');
};

createStudents();
