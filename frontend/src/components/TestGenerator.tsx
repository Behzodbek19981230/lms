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
import { Test } from "@/types/test.type"

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

interface AssignedTest {
  id: number;
  name: string;
  questionCount: number;
}

interface TestGeneratorProps {
  subject?: string
}

export function TestGenerator({ subject }: TestGeneratorProps) {
  const { toast } = useToast()
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null)
  const [availableQuestions, setAvailableQuestions] = useState<Question[]>([])
  const [subjectTests, setSubjectTests] = useState<Test[]>([])
  const [selectedTest, setSelectedTest] = useState<Test | null>(null)
  
  // Function to parse markdown images from text
  const parseMarkdownImages = (text: string) => {
    const images: Array<{ alt: string; src: string; width?: number; height?: number }> = [];
    const base64ImageRegex = /!\[([^\]]*)\]\((data:image\/[^;]+;base64,[^)]+)\)/g;
    let processedText = text;
    let match;

    while ((match = base64ImageRegex.exec(text)) !== null) {
      const [fullMatch, alt, dataUrl] = match;
      
      // Extract dimensions from alt text if present (format: alt|width: 100px; height: 100px)
      let width: number | undefined;
      let height: number | undefined;

      if (alt.includes('|')) {
        const [altText, dimensions] = alt.split('|');
        const widthMatch = dimensions.match(/width:\s*(\d+)px/);
        const heightMatch = dimensions.match(/height:\s*(\d+)px/);

        if (widthMatch) width = parseInt(widthMatch[1]);
        if (heightMatch) height = parseInt(heightMatch[1]);
        
        images.push({
          alt: altText,
          src: dataUrl,
          width,
          height,
        });
      } else {
        images.push({
          alt,
          src: dataUrl,
        });
      }

      processedText = processedText.replace(fullMatch, '');
    }

    return { processedText: processedText.trim(), images };
  }
  
    // Fetch assigned tests for selected subject
    const fetchTestsForSubject = async (subjectId: number) => {
      try {
        const { data } = await request.get(`/tests?subjectId=${subjectId}`)
        setSubjectTests(data || [])
      } catch (error) {
        setSubjectTests([])
      }
    }
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
            fetchTestsForSubject(defaultSubject.id)
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

  // Fetch tests for selected subject
  // ...existing code...

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

  const generateRandomTest = async () => {
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

    try {
      // Call backend API to generate test
      const { data } = await request.post('/tests/generate', {
        title: testConfig.title || `${selectedSubject.nameUz} testi`,
        subjectId: selectedSubject.id,
        questionCount: testConfig.questionCount,
        variantCount: testConfig.variantCount,
        timeLimit: testConfig.timeLimit,
        difficulty: testConfig.difficulty,
        includeAnswers: testConfig.includeAnswers,
        showTitleSheet: showTitleSheet,
        testId: selectedTest?.id || undefined, // Pass testId if selected
      })

      setGeneratedTest(data)
      setIsGenerating(false)
      
      toast({
        title: 'Test yaratildi',
        description: `${testConfig.variantCount} ta variant muvaffaqiyatli yaratildi`
      })
    } catch (error) {
      setIsGenerating(false)
        console.log(error?.response?.data);
      toast({
        title: 'Xatolik',
        description: error?.response?.data?.message || 'Test yaratishda xatolik yuz berdi',
        variant: 'destructive'
      })
    }
  }

  const generatePDF = async () => {
    if (!generatedTest) return

    try {
      const response = await request.post(
        `/tests/generate/${Date.now()}/pdf`,
        {
          variants: generatedTest.variants,
          config: generatedTest.config,
          subjectName: generatedTest.subject,
        },
        {
          responseType: 'blob',
        }
      )

      // Create blob and download
      const blob = new Blob([response.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${generatedTest.title}_Test.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      toast({
        title: 'PDF tayyor',
        description: 'PDF fayl muvaffaqiyatli yuklab olindi'
      })
    } catch (error) {
        console.log(error?.response?.data);
        
      toast({
        title: 'Xatolik',
        description: 'PDF yaratishda xatolik yuz berdi',
        variant: 'destructive'
      })
    }
  }



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
                setSelectedTest(null)
                setSelectedTest(null)
                if (subject) {
                  fetchQuestionsForSubject(subject.id)
                  fetchTestsForSubject(subject.id)
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

          {/* Test Selection */}
          {subjectTests.length > 0 && (
            <div className="space-y-3">
              <Label htmlFor="test" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Test tanlash (ixtiyoriy)
              </Label>
              <Select
                value={selectedTest?.id?.toString() || ''}
                onValueChange={(value) => {
                  const test = subjectTests.find((t) => t.id === Number(value))
                  setSelectedTest(test || null)
                }}
              >
                <SelectTrigger className="focus:ring-2 focus:ring-primary focus:border-primary">
                  <SelectValue placeholder="Testni tanlang (ixtiyoriy)" />
                </SelectTrigger>
                <SelectContent>
                  {subjectTests.map((test) => (
                    <SelectItem key={test.id} value={test.id.toString()}>
                      {test.title} ({test.totalQuestions} savol)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

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
                  onClick={generatePDF}
                  variant="outline"
                  className="border-primary text-primary hover:bg-primary/5"
                >
                  <Download className="h-4 w-4 mr-2" />
                  PDF ko'rish
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
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-lg text-blue-600">
                        Variant {variant.variantNumber}
                      </h4>
                      <div className="flex gap-2">
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          #{variant.uniqueNumber}
                        </Badge>
                        <Badge variant="outline">
                          {variant.questions?.length || 0} savol
                        </Badge>
                      </div>
                    </div>
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {variant.questions.map((question: any, index: number) => (
                        <div key={question.id} className="p-4 border rounded-lg">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-primary font-medium">{index + 1}.</span>
                                {(() => {
                                  const { processedText, images } = parseMarkdownImages(question.text);
                                  return (
                                    <>
                                      {question.hasFormula ? (
                                        <LaTeXRenderer content={processedText} />
                                      ) : (
                                        <p className="font-medium">{processedText}</p>
                                      )}
                                      
                                      {/* Markdown images */}
                                      {images.map((image, imgIndex) => (
                                        <div key={imgIndex} className="mt-3 mb-3">
                                          <img 
                                            src={image.src}
                                            alt={image.alt}
                                            className="max-w-full h-auto max-h-48 rounded border"
                                            style={{
                                              width: image.width ? `${image.width}px` : 'auto',
                                              height: image.height ? `${image.height}px` : 'auto',
                                            }}
                                            onError={(e) => {
                                              console.error('Markdown image load error:', e);
                                              e.currentTarget.style.display = 'none';
                                            }}
                                          />
                                        </div>
                                      ))}
                                    </>
                                  );
                                })()}
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
                                  {question.answers.map((option: any, i: number) => {
                                    const { processedText, images } = parseMarkdownImages(option.text);
                                    return (
                                      <div key={i} className="ml-4 p-2 bg-gray-50 rounded">
                                        <div className="flex items-center gap-2">
                                          <span className="font-medium text-blue-600">
                                            {String.fromCharCode(65 + i)})
                                          </span>
                                          {option.hasFormula ? (
                                            <LaTeXRenderer content={processedText} inline />
                                          ) : (
                                            <span className="text-sm text-gray-700">{processedText}</span>
                                          )}
                                        </div>
                                        
                                        {/* Answer images */}
                                        {images.map((image, imgIndex) => (
                                          <div key={imgIndex} className="mt-2 ml-6">
                                            <img 
                                              src={image.src}
                                              alt={image.alt}
                                              className="max-w-full h-auto max-h-32 rounded border"
                                              style={{
                                                width: image.width ? `${image.width}px` : 'auto',
                                                height: image.height ? `${image.height}px` : 'auto',
                                              }}
                                              onError={(e) => {
                                                console.error('Answer image load error:', e);
                                                e.currentTarget.style.display = 'none';
                                              }}
                                            />
                                          </div>
                                        ))}
                                      </div>
                                    );
                                  })}
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
                              {(question.imageBase64 || parseMarkdownImages(question.text).images.length > 0) && (
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