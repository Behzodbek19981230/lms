const fs = require('fs');

// Config
const API_BASE = 'https://lms.api.universal-uz.uz/api';
const TOKEN =
    process.env.TOKEN ||
    // Teacher token placeholder; replace or export TOKEN env var
    'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjQsInVzZXJuYW1lIjoidGVhY2hlciIsInJvbGUiOiJ0ZWFjaGVyIiwiaWF0IjoxNzYxMjAyODc0LCJleHAiOjE3NjE4MDc2NzR9.E-fCHcNoBgbYGbY-RjOBPmpJC1DzFzMBd1BQ-2tiV2w';

// Determine file to import (default: 2.6_latex.json)
const CLI_FILE = process.argv.find((a) => a.endsWith('.json'));
const FILE_TO_IMPORT =  '4.7_latex.json';

// 🧠 Fetch orqali POST funksiyasi
const postData = async (url, data) => {
    const response = await fetch(`${API_BASE}/${url}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: TOKEN,
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
const indexList = JSON.parse(fs.readFileSync('./index.json', 'utf-8'));
const indexItem = indexList.find((it) => it.file === FILE_TO_IMPORT);
if (!indexItem) {
    console.error(`index.json ichida '${FILE_TO_IMPORT}' topilmadi.`);
    process.exit(1);
}
const questions = JSON.parse(fs.readFileSync(`./${FILE_TO_IMPORT}`, 'utf-8'));

// 🧠 Test yaratish
const getTestId = async () => {
    const topic = indexItem.title || FILE_TO_IMPORT;
    const subjectId = 1;
    const createdTest = await postData('tests', {
        title: topic,
        description: `Avtomatik yuklangan test: ${topic} [${indexItem.key}]`,
        type: 'open',
        duration: 60,
        shuffleQuestions: true,
        showResults: true,
        subjectid: Number(subjectId),
    });

    console.log('✅ Test yaratildi:', { id: createdTest.id, title: createdTest.title });
    return createdTest.id;
};

// 🧩 Testga savollarni qo‘shish
const toDataUri = (img) => {
    if (!img || !img.data) return undefined;
    const mime = img.contentType || 'image/png';
    return `data:${mime};base64,${img.data}`;
};

const buildGalleryHtml = (imgs) => {
    if (!Array.isArray(imgs) || imgs.length === 0) return '';
    const items = imgs
        .map((im) => toDataUri(im))
        .filter(Boolean)
        .map(
            (src) =>
                `<img src="${src}" style="max-width:240px;height:auto;object-fit:contain;"/>`,
        )
        .join('');
    if (!items) return '';
    return `<div class="img-row" style="display:flex;flex-wrap:wrap;gap:8px;align-items:flex-start;margin-top:8px;">${items}</div>`;
};

const addQuestionsToTest = async (testId, questions) => {
    for (const [index, q] of questions.entries()) {
        try {
            // Build answer text with optional images as side-by-side gallery
            const answers = ['A', 'B', 'C', 'D']
                .filter((key) => q[key] !== undefined && q[key] !== null)
                .map((key, idx) => {
                    const imgArr = q[`${key}_rasmlar`] || [];
                    const imgHtml = buildGalleryHtml(imgArr);
                    return {
                        text: String(q[key] ?? '') + (imgHtml ? `\n${imgHtml}` : ''),
                        isCorrect: key === q.togri_javob,
                        order: idx,
                        hasFormula: /\$/.test(String(q[key] ?? '')),
                    };
                });

            // Question images: render all side-by-side after text
            const qGallery = buildGalleryHtml(q.rasmlar || []);
            const hasFormula = /\$/.test(q.savol_matni) || answers.some((a) => a.hasFormula);

            const createdQuestion = await postData('questions', {
                text: q.savol_matni + (qGallery ? `\n${qGallery}` : ''), // keep HTML like <table> intact; append gallery
                explanation: undefined,
                type: 'multiple_choice',
                points: 1,
                order: index,
                hasFormula,
                testid: Number(testId),
                answers,
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
        console.log(`📦 Import fayl: ${FILE_TO_IMPORT} | Mavzu: ${indexItem.title} [${indexItem.key}]`);
        const testId = await getTestId();
        await addQuestionsToTest(testId, questions);
        console.log('🎯 Barcha savollar muvaffaqiyatli qo‘shildi!');
        console.log(`🖨  PDF uchun (tavsiya): GET /api/pdf/test/${testId}?method=puppeteer`);
    } catch (e) {
        console.error('❌ Umumiy xatolik:', e.message);
    }
})();
