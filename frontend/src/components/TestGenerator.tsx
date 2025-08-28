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
        return 'bg-orange-500'
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
    if (!generatedTest) return

    const doc = new jsPDF("p", "mm", "a4")
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 20

    if (showTitleSheet) {
      // Title Sheet
      doc.setFontSize(20)
      doc.setFont("times", "bold")
      doc.text(`${selectedSubject?.nameUz.toUpperCase()} FANIDAN TEST`, pageWidth / 2, 60, { align: "center" })

      doc.setFontSize(16)
      doc.setFont("times", "normal")
      doc.text(generatedTest.title || "Test", pageWidth / 2, 80, { align: "center" })

      doc.setFontSize(12)
      doc.text(`Savollar soni: ${testConfig.questionCount}`, pageWidth / 2, 100, { align: "center" })
      doc.text(`Variantlar soni: ${testConfig.variantCount}`, pageWidth / 2, 110, { align: "center" })
      doc.text(`Vaqt: ${testConfig.timeLimit} daqiqa`, pageWidth / 2, 120, { align: "center" })

      doc.setFontSize(10)
      doc.text(`Sana: ${new Date().toLocaleDateString("uz-UZ")}`, pageWidth / 2, 140, { align: "center" })

      // Instructions
      doc.setFontSize(11)
      doc.setFont("times", "bold")
      doc.text("KO'RSATMALAR:", margin, 170)

      doc.setFont("times", "normal")
      const instructions = [
        "• Barcha savollarga javob bering",
        "• Har bir savol uchun faqat bitta to'g'ri javob mavjud",
        "• Javoblarni aniq va tushunarli yozing",
        "• Vaqtni to'g'ri taqsimlang",
        "• Ishingizni tekshirib chiqing",
      ]

      instructions.forEach((instruction, index) => {
        doc.text(instruction, margin, 180 + index * 8)
      })

      doc.addPage()
    }

    // Generate each variant
    generatedTest.variants.forEach((variant: any, variantIndex: number) => {
      if (variantIndex > 0) doc.addPage()

      // Variant header
      doc.setFontSize(16)
      doc.setFont("times", "bold")
      doc.text(`Variant ${variant.variantNumber}`, pageWidth / 2, 30, { align: "center" })

      doc.setFontSize(12)
      doc.setFont("times", "normal")
      doc.text(`${selectedSubject?.nameUz} fanidan test`, pageWidth / 2, 45, { align: "center" })

      let currentY = 65
      const lineHeight = 5
      const questionSpacing = 20

      variant.questions.forEach((question: any, index: number) => {
        if (currentY > pageHeight - 40) {
          doc.addPage()
          currentY = 30
        }

        doc.setFontSize(11)
        doc.setFont("times", "normal")

        // Question number with point value
        const pointText = `[${question.points} ball]`
        doc.text(pointText, pageWidth - margin - 5, currentY, { align: "right" })

        // Question text
        const questionText = `${index + 1}.`
        doc.text(questionText, margin, currentY)

        let cleanQuestion = question.text.replace(/\$\$/g, "")

        // Check if question contains mathematical expressions
        const hasFormula = question.text.includes("$$") || /[x²³⁴⁵⁶⁷⁸⁹⁰]|[∫∑∏√]|[αβγδεζηθικλμνξοπρστυφχψω]/.test(question.text)

        if (hasFormula) {
          doc.setFont("times", "italic")
          cleanQuestion = cleanQuestion.replace(/\\/g, "")
          doc.text("(LaTeX formula)", margin + 8, currentY)
          currentY += 5
        } else {
          doc.setFont("times", "normal")
        }

        const questionLines = doc.splitTextToSize(cleanQuestion, pageWidth - margin * 2 - 15)
        doc.text(questionLines, margin + 8, currentY)
        currentY += questionLines.length * lineHeight + 3

        // Add image if exists
        if (question.imageBase64) {
          try {
            doc.setFont("times", "italic")
            doc.text("(Rasm mavjud)", margin + 8, currentY)
            currentY += 5
          } catch (error) {
            console.error("Image processing error:", error)
          }
        }

        // Reset to normal font for options
        doc.setFontSize(10)
        doc.setFont("times", "normal")

        if (question.type === "multiple_choice" && question.answers) {
          question.answers.forEach((option: any, i: number) => {
            const hasOptionFormula = /[x²³⁴⁵⁶⁷⁸⁹⁰]|[∫∑∏√]|[αβγδεζηθικλμνξοπρστυφχψω]/.test(option.text)
            if (hasOptionFormula) {
              doc.setFont("times", "italic")
            } else {
              doc.setFont("times", "normal")
            }

            const optionText = `${String.fromCharCode(65 + i)}) ${option.text}`
            doc.text(optionText, margin + 8, currentY)
            currentY += 4
          })
        } else if (question.type === "true_false") {
          doc.text("A) To'g'ri", margin + 8, currentY)
          currentY += 4
          doc.text("B) Noto'g'ri", margin + 8, currentY)
          currentY += 4
        } else {
          doc.text("Javob: ________________________", margin + 8, currentY)
          currentY += 6
        }

        currentY += questionSpacing
      })

      // Footer
      doc.setFontSize(8)
      doc.setFont("times", "normal")
      doc.text(`Variant ${variant.variantNumber} | Test yaratilgan: ${new Date().toLocaleString("uz-UZ")}`, pageWidth / 2, pageHeight - 10, {
        align: "center",
      })
    })

    // Answer key if requested
    if (generatedTest.includeAnswers) {
      doc.addPage()
      doc.setFontSize(14)
      doc.setFont("times", "bold")
      doc.text("Javoblar Kaliti", pageWidth / 2, 30, { align: "center" })

      const answerY = 45
      const answersPerRow = 4
      const answerColumnWidth = (pageWidth - margin * 2) / answersPerRow

      generatedTest.variants.forEach((variant: any, variantIndex: number) => {
        doc.setFontSize(12)
        doc.setFont("times", "bold")
        doc.text(`Variant ${variant.variantNumber}:`, margin, answerY + variantIndex * 80)

        variant.questions.forEach((question: any, index: number) => {
          const col = index % answersPerRow
          const row = Math.floor(index / answersPerRow)
          const x = margin + col * answerColumnWidth
          const y = answerY + variantIndex * 80 + 15 + row * 8

          doc.setFontSize(9)
          const hasAnswerFormula = /[x²³⁴⁵⁶⁷⁸⁹⁰]|[∫∑∏√]|[αβγδεζηθικλμνξοπρστυφχψω]/.test(question.correctAnswer)
          doc.setFont("times", hasAnswerFormula ? "italic" : "normal")
          doc.text(`${index + 1}. ${question.correctAnswer}`, x, y)
        })
      })
    }

    // Save PDF
    doc.save(`${generatedTest.title.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shuffle className="h-5 w-5 text-orange-500" />
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
              <SelectTrigger className="focus:ring-2 focus:ring-orange-500 focus:border-orange-500">
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
                className="focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
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
                <SelectTrigger className="focus:ring-2 focus:ring-orange-500 focus:border-orange-500">
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
                <SelectTrigger className="focus:ring-2 focus:ring-orange-500 focus:border-orange-500">
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
                className="focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
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
                <SelectTrigger className="focus:ring-2 focus:ring-orange-500 focus:border-orange-500">
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
              className="w-4 h-4 text-orange-500 border-gray-300 rounded focus:ring-orange-500"
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
              className="w-4 h-4 text-orange-500 border-gray-300 rounded focus:ring-orange-500"
            />
            <Label htmlFor="includeTitleSheet" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Sarlavha varag'ini qo'shish
            </Label>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={generateRandomTest}
              disabled={isGenerating || !selectedSubject || availableQuestions.length === 0}
              className="bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
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
                  className="border-orange-500 text-orange-500 hover:bg-orange-50 bg-transparent"
                >
                  <Download className="h-4 w-4 mr-2" />
                  PDF yuklab olish
                </Button>

                <Button
                  onClick={() => window.print()}
                  variant="outline"
                  className="border-green-500 text-green-500 hover:bg-green-50 bg-transparent"
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
                <FileText className="h-5 w-5 text-orange-500" />
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
                                <span className="text-orange-500 font-medium">{index + 1}.</span>
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
                                    src={`data:image/jpeg;base64,${question.imageBase64}`} 
                                    alt="Savol rasmi"
                                    className="max-w-full h-auto max-h-48 rounded border"
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
