const createStudents = async () => {
    const students = await fs.readFile('students.json', 'utf8');
    const studentsArray = JSON.parse(students);
    for (const student of studentsArray) {
        const student = await fetch('http://localhost:3000/students', {
            method: 'POST',
            body: JSON.stringify(student),
        });
        if (student.ok) {
            console.log(`Student ${student.id} created`);
        } else {
            console.log(`Student ${student.id} not created`);
        }
    }
}