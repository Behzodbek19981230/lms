"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Download, Shuffle, FileText, Printer, Calculator, Globe, Beaker, History } from "lucide-react"
import { jsPDF } from "jspdf"
import { request } from '@/configs/request'
import { useToast } from '@/components/ui/use-toast'
import { LaTeXRenderer } from '@/components/latex/latex-renderer'

interface Question {
  id: number
  text: string
  type: 'multiple_choice' | 'true_false' | 'essay'
  points: number
  hasFormula: boolean
  imageBase64?: string
  answers?: Array<{
    id: number
    text: string
    isCorrect: boolean
    hasFormula: boolean
  }>
}

interface Subject {
  id: number
  name: string
  nameUz: string
  hasFormulas: boolean
  category: string
  icon: any
  color: string
}

interface TestGeneratorProps {
  subject?: string
}

export function TestGenerator({ subject }: TestGeneratorProps) {
  const { toast } = useToast()
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null)
  const [availableQuestions, setAvailableQuestions] = useState<Question[]>([])
  const [testConfig, setTestConfig] = useState({
    title: "",
    questionCount: 10,
    timeLimit: 60,
    difficulty: "mixed",
    includeAnswers: false,
    variantCount: 1,
  })
  const [generatedTest, setGeneratedTest] = useState<any>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [showTitleSheet, setShowTitleSheet] = useState(false)

  // Fetch subjects on component mount
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const { data } = await request.get('/subjects')
        const mapped: Subject[] = (data || []).map((s: any) => ({
          id: s.id,
          name: s.name,
          nameUz: s.nameUz || s.name,
          hasFormulas: s.hasFormulas,
          category: s.category,
          icon: getSubjectIcon(s.category),
          color: getSubjectColor(s.category),
        }))
        setSubjects(mapped)
        
        // Set default subject if provided
        if (subject) {
          const defaultSubject = mapped.find(s => s.name.toLowerCase() === subject.toLowerCase())
          if (defaultSubject) {
            setSelectedSubject(defaultSubject)
            fetchQuestionsForSubject(defaultSubject.id)
          }
        }
      } catch (error) {
        toast({
          title: 'Xatolik',
          description: 'Fanlar yuklanmadi',
          variant: 'destructive'
        })
      }
    }
    
    fetchSubjects()
  }, [subject])

  // Fetch questions for selected subject
  const fetchQuestionsForSubject = async (subjectId: number) => {
    try {
      const { data } = await request.get(`/questions?subjectId=${subjectId}`)
      setAvailableQuestions(data || [])
      toast({
        title: 'Savollar yuklandi',
        description: `${data?.length || 0} ta savol topildi`
      })
    } catch (error) {
      toast({
        title: 'Xatolik',
        description: 'Savollar yuklanmadi',
        variant: 'destructive'
      })
      setAvailableQuestions([])
    }
  }

  // Get subject icon based on category
  const getSubjectIcon = (category: string) => {
    switch (category?.toLowerCase()) {
      case 'mathematics':
      case 'matematika':
        return Calculator
      case 'geography':
      case 'geografiya':
        return Globe
      case 'chemistry':
      case 'kimyo':
        return Beaker
      case 'history':
      case 'tarix':
        return History
      default:
        return Calculator
    }
  }

  // Get subject color based on category
  const getSubjectColor = (category: string) => {
    switch (category?.toLowerCase()) {
      case 'mathematics':
      case 'matematika':
        return 'bg-blue-500'
      case 'geography':
      case 'geografiya':
        return 'bg-green-500'
      case 'chemistry':
      case 'kimyo':
        return 'bg-purple-500'
      case 'history':
      case 'tarix':
        return 'bg-primary'
      default:
        return 'bg-gray-500'
    }
  }

  const generateRandomTest = () => {
    if (!selectedSubject) {
      toast({
        title: 'Fan tanlanmagan',
        description: 'Iltimos, avval fanni tanlang',
        variant: 'destructive'
      })
      return
    }

    if (availableQuestions.length === 0) {
      toast({
        title: 'Savollar topilmadi',
        description: 'Tanlangan fanda savollar mavjud emas',
        variant: 'destructive'
      })
      return
    }

    if (availableQuestions.length < testConfig.questionCount) {
      toast({
        title: 'Savollar yetarli emas',
        description: `Fanda ${availableQuestions.length} ta savol bor, lekin ${testConfig.questionCount} ta so'rayapsiz`,
        variant: 'destructive'
      })
      return
    }

    setIsGenerating(true)

    // Generate variants
    const variants = []
    for (let v = 1; v <= testConfig.variantCount; v++) {
      // Randomly select questions for this variant
      const shuffled = [...availableQuestions].sort(() => 0.5 - Math.random())
      const selectedQuestions = shuffled.slice(0, testConfig.questionCount)
      
      // Shuffle answer options for multiple choice questions
      const questionsWithShuffledAnswers = selectedQuestions.map(q => {
        if (q.type === 'multiple_choice' && q.answers && q.answers.length > 1) {
          const shuffledAnswers = [...q.answers].sort(() => 0.5 - Math.random())
          return { ...q, answers: shuffledAnswers }
        }
        return q
      })

      variants.push({
        variantNumber: v,
        questions: questionsWithShuffledAnswers
      })
    }

    setGeneratedTest({
      title: testConfig.title || `${selectedSubject.nameUz} testi`,
      subject: selectedSubject.nameUz,
      variants,
      config: testConfig
    })

    setIsGenerating(false)
    toast({
      title: 'Test yaratildi',
      description: `${testConfig.variantCount} ta variant muvaffaqiyatli yaratildi`
    })
  }

  const exportToPDF = async () => {
    if (!generatedTest) return;

    try {
      // Show loading state
      const originalButtonText = "PDF yuklab olish";
      const downloadButton = document.querySelector('button:has(.h-4.w-4.mr-2) ~ button');
      if (downloadButton) {
        downloadButton.innerHTML = '<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>Yaratilmoqda...';
        (downloadButton as HTMLButtonElement).disabled = true;
      }

      // Create a new window with the test content in HTML format
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast({
          title: 'Xatolik',
          description: 'PDF yaratish uchun oyna ochilmadi. Brauzer sozlamalarini tekshiring.',
          variant: 'destructive'
        });
        return;
      }

      // Generate HTML content for the test
      let htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>${generatedTest.title}</title>
          <style>
            body {
              font-family: 'Times New Roman', Times, serif;
              margin: 0;
              padding: 20mm;
              font-size: 12pt;
              line-height: 1.4;
            }
            .page-break {
              page-break-before: always;
            }
            .title-sheet {
              text-align: center;
              margin-bottom: 30mm;
            }
            .title-sheet h1 {
              font-size: 24pt;
              margin-bottom: 10mm;
            }
            .title-sheet h2 {
              font-size: 18pt;
              margin-bottom: 8mm;
            }
            .test-info {
              margin: 5mm 0;
            }
            .instructions {
              margin: 10mm 0;
              text-align: left;
            }
            .instructions h3 {
              font-size: 14pt;
              margin-bottom: 3mm;
            }
            .instructions ul {
              margin: 0;
              padding-left: 8mm;
            }
            .variant-header {
              text-align: center;
              margin: 10mm 0;
              font-size: 16pt;
              font-weight: bold;
            }
            .question {
              margin: 8mm 0;
            }
            .question-header {
              display: flex;
              justify-content: space-between;
              margin-bottom: 2mm;
            }
            .question-number {
              font-weight: bold;
            }
            .question-points {
              font-style: italic;
            }
            .options {
              margin-left: 8mm;
            }
            .option {
              margin: 2mm 0;
            }
            .answer-key {
              margin-top: 20mm;
            }
            .answer-key h2 {
              text-align: center;
              margin-bottom: 10mm;
            }
            .variant-answers {
              margin-bottom: 15mm;
            }
            .image-placeholder {
              font-style: italic;
              color: #666;
            }
            @media print {
              body {
                padding: 15mm;
              }
            }
          </style>
        </head>
        <body>
      `;

      // Add title sheet if requested
      if (showTitleSheet) {
        htmlContent += `
          <div class="title-sheet">
            <h1>${selectedSubject?.nameUz.toUpperCase()} FANIDAN TEST</h1>
            <h2>${generatedTest.title || "Test"}</h2>
            
            <div class="test-info">
              <p>Savollar soni: ${testConfig.questionCount}</p>
              <p>Variantlar soni: ${testConfig.variantCount}</p>
              <p>Vaqt: ${testConfig.timeLimit} daqiqa</p>
              <p>Sana: ${new Date().toLocaleDateString("uz-UZ")}</p>
            </div>
            
            <div class="instructions">
              <h3>KO'RSATMALAR:</h3>
              <ul>
                <li>Barcha savollarga javob bering</li>
                <li>Har bir savol uchun faqat bitta to'g'ri javob mavjud</li>
                <li>Javoblarni aniq va tushunarli yozing</li>
                <li>Vaqtni to'g'ri taqsimlang</li>
                <li>Ishingizni tekshirib chiqing</li>
              </ul>
            </div>
          </div>
        `;
      }

      // Generate each variant
      generatedTest.variants.forEach((variant: any, variantIndex: number) => {
        if (variantIndex > 0 || showTitleSheet) {
          htmlContent += '<div class="page-break"></div>';
        }

        htmlContent += `
          <div class="variant-header">
            Variant ${variant.variantNumber}<br>
            <span style="font-size: 14pt; font-weight: normal;">${selectedSubject?.nameUz} fanidan test</span>
          </div>
        `;

        variant.questions.forEach((question: any, index: number) => {
          htmlContent += `
            <div class="question">
              <div class="question-header">
                <span class="question-number">${index + 1}.</span>
                <span class="question-points">[${question.points} ball]</span>
              </div>
              <div>
                ${question.text.replace(/\$\$/g, "")}
          `;

          // Add image placeholder if exists
          if (question.imageBase64) {
            htmlContent += '<div class="image-placeholder">(Rasm mavjud)</div>';
          }

          // Add options
          if (question.type === "multiple_choice" && question.answers) {
            htmlContent += '<div class="options">';
            question.answers.forEach((option: any, i: number) => {
              htmlContent += `<div class="option">${String.fromCharCode(65 + i)}) ${option.text}</div>`;
            });
            htmlContent += '</div>';
          } else if (question.type === "true_false") {
            htmlContent += `
              <div class="options">
                <div class="option">A) To'g'ri</div>
                <div class="option">B) Noto'g'ri</div>
              </div>
            `;
          } else {
            htmlContent += '<div class="options">Javob: ________________________</div>';
          }

          htmlContent += `
              </div>
            </div>
          `;
        });

        // Add footer
        htmlContent += `
          <div style="position: fixed; bottom: 10mm; width: 100%; text-align: center; font-size: 10pt;">
            Variant ${variant.variantNumber} | Test yaratilgan: ${new Date().toLocaleString("uz-UZ")}
          </div>
        `;
      });

      // Add answer key if requested
      if (generatedTest.includeAnswers) {
        htmlContent += '<div class="page-break"></div>';
        htmlContent += `
          <div class="answer-key">
            <h2>Javoblar Kaliti</h2>
        `;

        generatedTest.variants.forEach((variant: any, variantIndex: number) => {
          htmlContent += `
            <div class="variant-answers">
              <h3>Variant ${variant.variantNumber}:</h3>
              <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 5mm;">
          `;

          variant.questions.forEach((question: any, index: number) => {
            htmlContent += `<div>${index + 1}. ${question.correctAnswer || 'N/A'}</div>`;
          });

          htmlContent += `
              </div>
            </div>
          `;
        });

        htmlContent += '</div>';
      }

      htmlContent += `
        </body>
        </html>
      `;

      // Write content to the new window
      printWindow.document.write(htmlContent);
      printWindow.document.close();

      // Wait a bit for content to load
      setTimeout(() => {
        // Print the window (this will show the browser's print dialog)
        printWindow.print();
        
        // Restore button text
        if (downloadButton) {
          downloadButton.innerHTML = '<svg class="h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>PDF yuklab olish';
          (downloadButton as HTMLButtonElement).disabled = false;
        }

        toast({
          title: 'PDF tayyor',
          description: 'PDF fayl brauzer orqali yuklab olinadi'
        });
      }, 500);

    } catch (error) {
      console.error('PDF generation error:', error);
      toast({
        title: 'Xatolik',
        description: 'PDF yaratishda xatolik yuz berdi',
        variant: 'destructive'
      });
      
      // Restore button text
      const downloadButton = document.querySelector('button:has(.h-4.w-4.mr-2) ~ button');
      if (downloadButton) {
        downloadButton.innerHTML = '<svg class="h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>PDF yuklab olish';
        (downloadButton as HTMLButtonElement).disabled = false;
      }
    }
};

// Add a new function for direct PDF download
const downloadAsPDF = async () => {
  if (!generatedTest) return;

  try {
    // Show loading state
    const downloadButton = Array.from(document.querySelectorAll('button')).find(btn => 
      btn.textContent?.includes('PDF yuklab olish')
    );
    
    if (downloadButton) {
      const originalHTML = downloadButton.innerHTML;
      downloadButton.innerHTML = '<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>Yaratilmoqda...';
      (downloadButton as HTMLButtonElement).disabled = true;

      // Generate a more structured HTML for better PDF conversion
      let htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>${generatedTest.title}</title>
          <style>
            body {
              font-family: 'Times New Roman', Times, serif;
              margin: 0;
              padding: 20mm;
              font-size: 12pt;
              line-height: 1.4;
            }
            .page-break {
              page-break-before: always;
            }
            .title-sheet {
              text-align: center;
              margin-bottom: 30mm;
            }
            .title-sheet h1 {
              font-size: 24pt;
              margin-bottom: 10mm;
            }
            .title-sheet h2 {
              font-size: 18pt;
              margin-bottom: 8mm;
            }
            .test-info {
              margin: 5mm 0;
            }
            .instructions {
              margin: 10mm 0;
              text-align: left;
            }
            .instructions h3 {
              font-size: 14pt;
              margin-bottom: 3mm;
            }
            .instructions ul {
              margin: 0;
              padding-left: 8mm;
            }
            .variant-header {
              text-align: center;
              margin: 10mm 0;
              font-size: 16pt;
              font-weight: bold;
            }
            .question {
              margin: 8mm 0;
            }
            .question-header {
              display: flex;
              justify-content: space-between;
              margin-bottom: 2mm;
            }
            .question-number {
              font-weight: bold;
            }
            .question-points {
              font-style: italic;
            }
            .options {
              margin-left: 8mm;
            }
            .option {
              margin: 2mm 0;
            }
            .answer-key {
              margin-top: 20mm;
            }
            .answer-key h2 {
              text-align: center;
              margin-bottom: 10mm;
            }
            .variant-answers {
              margin-bottom: 15mm;
            }
            .image-placeholder {
              font-style: italic;
              color: #666;
            }
          </style>
        </head>
        <body>
      `;

      // Add title sheet if requested
      if (showTitleSheet) {
        htmlContent += `
          <div class="title-sheet">
            <h1>${selectedSubject?.nameUz.toUpperCase()} FANIDAN TEST</h1>
            <h2>${generatedTest.title || "Test"}</h2>
            
            <div class="test-info">
              <p>Savollar soni: ${testConfig.questionCount}</p>
              <p>Variantlar soni: ${testConfig.variantCount}</p>
              <p>Vaqt: ${testConfig.timeLimit} daqiqa</p>
              <p>Sana: ${new Date().toLocaleDateString("uz-UZ")}</p>
            </div>
            
            <div class="instructions">
              <h3>KO'RSATMALAR:</h3>
              <ul>
                <li>Barcha savollarga javob bering</li>
                <li>Har bir savol uchun faqat bitta to'g'ri javob mavjud</li>
                <li>Javoblarni aniq va tushunarli yozing</li>
                <li>Vaqtni to'g'ri taqsimlang</li>
                <li>Ishingizni tekshirib chiqing</li>
              </ul>
            </div>
          </div>
        `;
      }

      // Generate each variant
      generatedTest.variants.forEach((variant: any, variantIndex: number) => {
        if (variantIndex > 0 || showTitleSheet) {
          htmlContent += '<div class="page-break"></div>';
        }

        htmlContent += `
          <div class="variant-header">
            Variant ${variant.variantNumber}<br>
            <span style="font-size: 14pt; font-weight: normal;">${selectedSubject?.nameUz} fanidan test</span>
          </div>
        `;

        variant.questions.forEach((question: any, index: number) => {
          htmlContent += `
            <div class="question">
              <div class="question-header">
                <span class="question-number">${index + 1}.</span>
                <span class="question-points">[${question.points} ball]</span>
              </div>
              <div>
                ${question.text.replace(/\$\$/g, "")}
          `;

          // Add image placeholder if exists
          if (question.imageBase64) {
            htmlContent += '<div class="image-placeholder">(Rasm mavjud)</div>';
          }

          // Add options
          if (question.type === "multiple_choice" && question.answers) {
            htmlContent += '<div class="options">';
            question.answers.forEach((option: any, i: number) => {
              htmlContent += `<div class="option">${String.fromCharCode(65 + i)}) ${option.text}</div>`;
            });
            htmlContent += '</div>';
          } else if (question.type === "true_false") {
            htmlContent += `
              <div class="options">
                <div class="option">A) To'g'ri</div>
                <div class="option">B) Noto'g'ri</div>
              </div>
            `;
          } else {
            htmlContent += '<div class="options">Javob: ________________________</div>';
          }

          htmlContent += `
              </div>
            </div>
          `;
        });

        // Add footer
        htmlContent += `
          <div style="position: fixed; bottom: 10mm; width: 100%; text-align: center; font-size: 10pt;">
            Variant ${variant.variantNumber} | Test yaratilgan: ${new Date().toLocaleString("uz-UZ")}
          </div>
        `;
      });

      // Add answer key if requested
      if (generatedTest.includeAnswers) {
        htmlContent += '<div class="page-break"></div>';
        htmlContent += `
          <div class="answer-key">
            <h2>Javoblar Kaliti</h2>
        `;

        generatedTest.variants.forEach((variant: any, variantIndex: number) => {
          htmlContent += `
            <div class="variant-answers">
              <h3>Variant ${variant.variantNumber}:</h3>
              <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 5mm;">
          `;

          variant.questions.forEach((question: any, index: number) => {
            htmlContent += `<div>${index + 1}. ${question.correctAnswer || 'N/A'}</div>`;
          });

          htmlContent += `
              </div>
            </div>
          `;
        });

        htmlContent += '</div>';
      }

      htmlContent += `
        </body>
        </html>
      `;

      // Create a Blob with the HTML content
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      
      // Create a temporary link to trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = `${generatedTest.title.replace(/[^a-zA-Z0-9]/g, "_")}.html`;
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Restore button
      setTimeout(() => {
        if (downloadButton) {
          downloadButton.innerHTML = originalHTML;
          (downloadButton as HTMLButtonElement).disabled = false;
        }
        
        toast({
          title: 'Fayl tayyor',
          description: 'HTML fayl yuklab olindi. Uni PDF ga aylantirish uchun brauzer orqali oching va "Chop etish" dan "PDF ga saqlash"ni tanlang.'
        });
      }, 500);
    }
  } catch (error) {
    console.error('Download error:', error);
    toast({
      title: 'Xatolik',
      description: 'Fayl yuklab olishda xatolik yuz berdi',
      variant: 'destructive'
    });
    
    // Restore button
    const downloadButton = Array.from(document.querySelectorAll('button')).find(btn => 
      btn.textContent?.includes('PDF yuklab olish')
    );
    
    if (downloadButton) {
      downloadButton.innerHTML = '<svg class="h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>PDF yuklab olish';
      (downloadButton as HTMLButtonElement).disabled = false;
    }
  }
};

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shuffle className="h-5 w-5 text-primary" />
            Test Generatori
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Subject Selection */}
          <div className="space-y-3">
            <Label htmlFor="subject" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Fan tanlash
            </Label>
            <Select
              value={selectedSubject?.id?.toString() || ''}
              onValueChange={(value) => {
                const subject = subjects.find((s) => s.id === Number(value))
                setSelectedSubject(subject || null)
                if (subject) {
                  fetchQuestionsForSubject(subject.id)
                }
              }}
            >
              <SelectTrigger className="focus:ring-2 focus:ring-primary focus:border-primary">
                <SelectValue placeholder="Fanni tanlang" />
              </SelectTrigger>
              <SelectContent>
                {subjects.map((subject) => (
                  <SelectItem key={subject.id} value={subject.id.toString()}>
                    <div className="flex items-center gap-2">
                      <subject.icon className="h-4 w-4" />
                      {subject.nameUz}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedSubject && (
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="secondary">{selectedSubject.category}</Badge>
                {selectedSubject.hasFormulas && (
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    LaTeX qo'llab-quvvatlaydi
                  </Badge>
                )}
                <Badge variant="outline">
                  {availableQuestions.length} ta savol mavjud
                </Badge>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label htmlFor="title" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Test nomi
              </Label>
              <Input
                id="title"
                placeholder="Test nomini kiriting"
                value={testConfig.title}
                onChange={(e) => setTestConfig((prev) => ({ ...prev, title: e.target.value }))}
                className="focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="questionCount" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Savollar soni
              </Label>
              <Select
                value={testConfig.questionCount.toString()}
                onValueChange={(value) => setTestConfig((prev) => ({ ...prev, questionCount: Number.parseInt(value) }))}
              >
                <SelectTrigger className="focus:ring-2 focus:ring-primary focus:border-primary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[5, 10, 15, 20, 25, 30, 35, 40].map((num) => (
                    <SelectItem key={num} value={num.toString()}>
                      {num} ta savol
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label htmlFor="variantCount" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Variantlar soni
              </Label>
              <Select
                value={testConfig.variantCount.toString()}
                onValueChange={(value) => setTestConfig((prev) => ({ ...prev, variantCount: Number.parseInt(value) }))}
              >
                <SelectTrigger className="focus:ring-2 focus:ring-primary focus:border-primary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <SelectItem key={num} value={num.toString()}>
                      {num} variant
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label htmlFor="timeLimit" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Vaqt chegarasi (daqiqa)
              </Label>
              <Input
                id="timeLimit"
                type="number"
                min="15"
                max="180"
                value={testConfig.timeLimit}
                onChange={(e) =>
                  setTestConfig((prev) => ({ ...prev, timeLimit: Number.parseInt(e.target.value) || 60 }))
                }
                className="focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="difficulty" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Qiyinchilik darajasi
              </Label>
              <Select
                value={testConfig.difficulty}
                onValueChange={(value) => setTestConfig((prev) => ({ ...prev, difficulty: value }))}
              >
                <SelectTrigger className="focus:ring-2 focus:ring-primary focus:border-primary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mixed">Aralash</SelectItem>
                  <SelectItem value="easy">Oson</SelectItem>
                  <SelectItem value="medium">O'rta</SelectItem>
                  <SelectItem value="hard">Qiyin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="includeAnswers"
              checked={testConfig.includeAnswers}
              onChange={(e) => setTestConfig((prev) => ({ ...prev, includeAnswers: e.target.checked }))}
              className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
            />
            <Label htmlFor="includeAnswers" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Javoblar kalitini qo'shish
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="includeTitleSheet"
              checked={showTitleSheet}
              onChange={(e) => setShowTitleSheet(e.target.checked)}
              className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
            />
            <Label htmlFor="includeTitleSheet" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Sarlavha varag'ini qo'shish
            </Label>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={generateRandomTest}
              disabled={isGenerating || !selectedSubject || availableQuestions.length === 0}
              className="bg-primary hover:bg-primary/90 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Yaratilmoqda...
                </>
              ) : (
                <>
                  <Shuffle className="h-4 w-4 mr-2" />
                  Test Yaratish
                </>
              )}
            </Button>

            {generatedTest && (
              <>
                <Button
                  onClick={exportToPDF}
                  variant="outline"
                  className="border-primary text-primary hover:bg-primary/5"
                >
                  <Download className="h-4 w-4 mr-2" />
                  PDF ko'rish
                </Button>

                <Button
                  onClick={downloadAsPDF}
                  variant="outline"
                  className="border-primary text-primary hover:bg-primary/5"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  HTML yuklab olish
                </Button>

                <Button
                  onClick={() => window.print()}
                  variant="outline"
                  className="border-primary text-primary hover:bg-primary/5"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Chop etish
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {generatedTest && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Yaratilgan Test
              </span>
              <div className="flex gap-2">
                <Badge variant="secondary">{testConfig.questionCount} savol</Badge>
                <Badge variant="secondary">{testConfig.variantCount} variant</Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg">{generatedTest.title}</h3>
                <p className="text-muted-foreground">{generatedTest.description}</p>
              </div>

              <div className="space-y-6">
                {generatedTest.variants.map((variant: any, variantIndex: number) => (
                  <div key={variant.variantNumber} className="border rounded-lg p-4">
                    <h4 className="font-semibold text-lg mb-3 text-blue-600">
                      Variant {variant.variantNumber}
                    </h4>
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {variant.questions.map((question: any, index: number) => (
                        <div key={question.id} className="p-4 border rounded-lg">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-primary font-medium">{index + 1}.</span>
                                {question.hasFormula ? (
                                  <LaTeXRenderer content={question.text} />
                                ) : (
                                  <p className="font-medium">{question.text}</p>
                                )}
                              </div>
                              
                              {/* Rasm ko'rsatish */}
                              {question.imageBase64 && (
                                <div className="mt-3 mb-3">
                                  <img 
                                    src={question.imageBase64.startsWith('data:') ? question.imageBase64 : `data:image/png;base64,${question.imageBase64}`}
                                    alt="Savol rasmi"
                                    className="max-w-full h-auto max-h-48 rounded border"
                                    onError={(e) => {
                                      console.error('Image load error:', e);
                                      e.currentTarget.style.display = 'none';
                                    }}
                                  />
                                </div>
                              )}
                              
                              {question.type === "multiple_choice" && question.answers && (
                                <div className="mt-3 space-y-2">
                                  {question.answers.map((option: any, i: number) => (
                                    <div key={i} className="flex items-center gap-2 ml-4 p-2 bg-gray-50 rounded">
                                      <span className="font-medium text-blue-600">
                                        {String.fromCharCode(65 + i)})
                                      </span>
                                      {option.hasFormula ? (
                                        <LaTeXRenderer content={option.text} inline />
                                      ) : (
                                        <span className="text-sm text-gray-700">{option.text}</span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                              {question.type === "true_false" && (
                                <div className="mt-3 space-y-2 ml-4">
                                  <div className="p-2 bg-gray-50 rounded">
                                    <span className="font-medium text-blue-600">A) </span>
                                    <span className="text-sm text-gray-700">To'g'ri</span>
                                  </div>
                                  <div className="p-2 bg-gray-50 rounded">
                                    <span className="font-medium text-blue-600">B) </span>
                                    <span className="text-sm text-gray-700">Noto'g'ri</span>
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <Badge variant="outline" className="text-xs">
                                {question.points} ball
                              </Badge>
                              {question.hasFormula && (
                                <Badge variant="outline" className="text-xs text-green-600 border-green-600">
                                  LaTeX
                                </Badge>
                              )}
                              {question.imageBase64 && (
                                <Badge variant="outline" className="text-xs text-blue-600 border-blue-600">
                                  Rasm
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 text-right">
                      <Badge variant="outline">Jami: {variant.totalPoints} ball</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}