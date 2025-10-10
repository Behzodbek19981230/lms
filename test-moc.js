const fs = require('fs');

// 🧠 Fetch orqali POST funksiyasi
const postData = async (url, data) => {
    const response = await fetch(`http://localhost:3003/api/${url}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjI1LCJ1c2VybmFtZSI6InRlYWNoZXIiLCJyb2xlIjoidGVhY2hlciIsImlhdCI6MTc2MDA5NzkwOCwiZXhwIjoxNzYwNzAyNzA4fQ.0oSlMotGrfqA0HC07aB0nZMguH7BAi9Bdpod4N_kSWM"
        },
        body: JSON.stringify(data)
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text}`);
    }

    return response.json();
};

// 🧩 JSON fayldan savollarni o‘qish
const questions = require('./2.2_latex.json');

// 🧠 Test yaratish
const getTestId = async () => {
    const topic = "Atom tarkibi va izozarrachalar";
    const createdTest = await postData('tests', {
        title: topic,
        description: `Avtomatik yuklangan test: ${topic}`,
        type: 'open',
        duration: 0,
        shuffleQuestions: true,
        showResults: true,
        subjectid: 11
    });

    console.log('✅ Test yaratildi:', createdTest);
    return createdTest.id;
};

// 🧩 Testga savollarni qo‘shish
const addQuestionsToTest = async (testId, questions) => {
    for (const [index, q] of questions.entries()) {
        try {
            // Variantlarni tayyorlash
            const answers = ['A', 'B', 'C', 'D']
                .filter((key) => !!q[key])
                .map((key, idx) => ({
                    text: q[key] + `\n\n ${q[`${key}_rasmlar`] || ''}`,
                    isCorrect: key === q.togri_javob,
                    order: idx,
                    hasFormula: /\$/.test(q.savol_matni),
                }));

            const createdQuestion = await postData('questions', {
                text: q.savol_matni+ `\n\n ${q.rasmlar}`,
                explanation: undefined,
                type: 'multiple_choice',
                points: 1,
                order: index,
                hasFormula: /\$/.test(q.savol_matni),
                testid: Number(testId),
                answers
            });

            console.log(`   ➕ Savol ${index + 1}/${questions.length} qo‘shildi (${q.savol_raqami})`);
        } catch (err) {
            console.error(`❌ Savolda xato (${q.savol_raqami}):`, err.message);
        }
    }
};

// 🚀 Ishga tushirish
(async () => {
    try {
        const testId = await getTestId();
        await addQuestionsToTest(testId, questions);
        console.log('🎯 Barcha savollar muvaffaqiyatli qo‘shildi!');
    } catch (e) {
        console.error('❌ Umumiy xatolik:', e.message);
    }
})();
