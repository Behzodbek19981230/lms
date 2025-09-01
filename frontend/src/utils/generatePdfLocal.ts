import jsPDF from 'jspdf';

export interface ExamData {
  title: string;
  variantNumber: string;
  studentName: string;
  subjectName: string;
  date: string;
  questions: Question[];
}

export interface Question {
  number: number;
  text: string;
  answers: string[];
  points?: number;
}

/**
 * Client-side da jsPDF bilan PDF yaratish
 */
export const generateExamPDF = (examData: ExamData): void => {
  try {
    console.log('Generating PDF locally with jsPDF...');
    
    // PDF hujjat yaratish
    const doc = new jsPDF({
      format: 'a4',
      unit: 'mm',
    });
    
    // Font o'rnatish
    doc.setFont('helvetica');
    
    let yPos = 20; // Y pozitsiyasi
    const margin = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const maxWidth = pageWidth - 2 * margin;
    
    // Header
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    const title = examData.title || 'IMTIHON';
    doc.text(title, pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Variant: ${examData.variantNumber}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;
    
    // Line separator
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 10;
    
    // Student info
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Student ma\\'lumotlari:', margin, yPos);
    yPos += 7;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Ism-familiya: ${examData.studentName || '_____________________'}`, margin + 5, yPos);
    yPos += 5;
    doc.text(`Variant: ${examData.variantNumber}`, margin + 5, yPos);
    yPos += 5;
    doc.text(`Sana: ${examData.date}`, margin + 5, yPos);
    yPos += 10;
    
    // Instructions
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Ko\\'rsatmalar:', margin, yPos);
    yPos += 7;
    
    const instructions = [
      '• Barcha savollarga javob bering',
      '• Har bir savol uchun faqat bitta to\'g\'ri javob mavjud',
      '• Javoblarni aniq va tushunarli yozing',
      '• Vaqtni to\'g\'ri taqsimlang',
      '• Ishingizni tekshirib chiqing'
    ];
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    
    instructions.forEach(instruction => {
      doc.text(instruction, margin + 5, yPos);
      yPos += 5;
    });
    
    yPos += 10;
    
    // Questions header
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('SAVOLLAR:', margin, yPos);
    yPos += 10;
    
    // Questions
    examData.questions.forEach((question, index) => {
      // Check if we need a new page
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
      
      // Question number and text
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      const questionPrefix = `${question.number}. `;
      doc.text(questionPrefix, margin, yPos);
      
      // Question text (wrap if needed)
      const questionTextX = margin + doc.getTextWidth(questionPrefix) + 2;
      const questionLines = doc.splitTextToSize(question.text, maxWidth - questionTextX + margin);
      
      doc.setFont('helvetica', 'normal');
      doc.text(questionLines, questionTextX, yPos);
      yPos += questionLines.length * 5;
      
      // Points (if available)
      if (question.points) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'italic');
        doc.text(`[${question.points} ball]`, pageWidth - margin - 20, yPos - questionLines.length * 5);
      }
      
      yPos += 3;
      
      // Answers
      if (question.answers && question.answers.length > 0) {
        question.answers.forEach((answer, answerIndex) => {
          const letter = String.fromCharCode(65 + answerIndex); // A, B, C, D
          const answerPrefix = `${letter}) `;
          
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          doc.text(answerPrefix, margin + 10, yPos);
          
          const answerTextX = margin + 10 + doc.getTextWidth(answerPrefix) + 2;
          const answerLines = doc.splitTextToSize(answer, maxWidth - answerTextX + margin);
          doc.text(answerLines, answerTextX, yPos);
          
          yPos += Math.max(1, answerLines.length) * 5;
        });
      } else {
        // Open question
        doc.setFontSize(10);
        doc.text('Javob: ________________________________', margin + 10, yPos);
        yPos += 10;
      }
      
      yPos += 5;
    });
    
    // Footer
    const totalPages = doc.internal.pages.length - 1;
    
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      
      const footerText = `Universal LMS • ${examData.date} • Variant: ${examData.variantNumber}`;
      doc.text(footerText, pageWidth / 2, 285, { align: 'center' });
      
      doc.text(`${i} / ${totalPages}`, pageWidth - margin, 285, { align: 'right' });
    }
    
    // Save PDF
    const fileName = `${examData.title || 'Imtihon'}_Variant_${examData.variantNumber}.pdf`;
    doc.save(fileName);
    
    console.log(`PDF saved successfully: ${fileName}`);
    
  } catch (error) {
    console.error('Error generating PDF:', error);
    alert('PDF yaratishda xatolik yuz berdi');
  }
};

/**
 * TXT fayldan ma'lumot extract qilib PDF yaratish
 */
export const generatePdfFromTxtContent = (txtContent: string): void => {
  try {
    const examData = parseTxtContent(txtContent);
    generateExamPDF(examData);
  } catch (error) {
    console.error('Error parsing TXT content:', error);
    alert('TXT faylni parse qilishda xatolik');
  }
};

function parseTxtContent(txtContent: string): ExamData {
  const lines = txtContent.split('\n');
  
  const examData: ExamData = {
    title: '',
    variantNumber: '',
    studentName: '',
    subjectName: '',
    date: new Date().toLocaleDateString(),
    questions: []
  };
  
  // Extract basic info
  lines.forEach(line => {
    if (line.startsWith('Document Title:')) {
      examData.title = line.replace('Document Title:', '').trim();
    } else if (line.startsWith('Variant Number:')) {
      examData.variantNumber = line.replace('Variant Number:', '').trim();
    } else if (line.startsWith('Student Name:')) {
      examData.studentName = line.replace('Student Name:', '').trim();
    }
  });
  
  // Extract questions
  let currentQuestion: Question | null = null;
  let inAnswers = false;
  
  lines.forEach(line => {
    const trimmedLine = line.trim();
    
    if (trimmedLine.startsWith('Question ') && trimmedLine.endsWith(':')) {
      // Save previous question
      if (currentQuestion) {
        examData.questions.push(currentQuestion);
      }
      
      // Start new question
      const questionMatch = trimmedLine.match(/Question (\d+):/);
      if (questionMatch) {
        currentQuestion = {
          number: parseInt(questionMatch[1]),
          text: '',
          answers: []
        };
        inAnswers = false;
      }
    } else if (trimmedLine.startsWith('Text:') && currentQuestion) {
      currentQuestion.text = trimmedLine.replace('Text:', '').trim();
    } else if (trimmedLine === 'Answers:') {
      inAnswers = true;
    } else if (inAnswers && trimmedLine.match(/^[A-D]\)/) && currentQuestion) {
      currentQuestion.answers.push(trimmedLine);
    }
  });
  
  // Add last question
  if (currentQuestion) {
    examData.questions.push(currentQuestion);
  }
  
  return examData;
}
