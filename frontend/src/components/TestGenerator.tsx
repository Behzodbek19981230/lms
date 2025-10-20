"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Download, Shuffle, FileText, Printer, Calculator, Globe, Beaker, History, ChevronsUpDown } from "lucide-react"
import { request } from '@/configs/request'
import { useToast } from '@/components/ui/use-toast'
import { LaTeXRenderer } from '@/components/latex/latex-renderer'
import { Test } from "@/types/test.type"
import { SubjectCategory, SubjectCategoryLabels } from "@/types/subject.type"

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
  const [selectedTests, setSelectedTests] = useState<Test[]>([])
  const [testsPopoverOpen, setTestsPopoverOpen] = useState(false)
  
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
        const { data } = await request.get(`/tests?subjectid=${subjectId}`)
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
  const [printFiles, setPrintFiles] = useState<
    Array<{ url: string; fileName: string; variantNumber: string; uniqueNumber?: string; answerSheetUrl?: string }>
  >([])
  const [printTitle, setPrintTitle] = useState<string>("")
  const [combinedUrl, setCombinedUrl] = useState<string | null>(null)

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
        title: testConfig.title || `${selectedSubject!.nameUz} testi`,
        subjectId: selectedSubject!.id,
        questionCount: testConfig.questionCount,
        variantCount: testConfig.variantCount,
        timeLimit: testConfig.timeLimit,
        difficulty: testConfig.difficulty,
        includeAnswers: testConfig.includeAnswers,
        showTitleSheet: showTitleSheet,
        testIds: selectedTests.map((t) => t.id),
      })

      setGeneratedTest(data)
      setIsGenerating(false)
      
      toast({
        title: 'Test yaratildi',
        description: `${testConfig.variantCount} ta variant muvaffaqiyatli yaratildi`
      })
    } catch (error: any) {
      setIsGenerating(false)
      console.log(error?.response?.data);
      toast({
        title: 'Xatolik',
        description: error?.response?.data?.message || 'Test yaratishda xatolik yuz berdi',
        variant: 'destructive'
      })
    }
  }

  const generateHTML = async () => {
    if (!generatedTest) return

    try {
      const { data } = await request.post(`/tests/generate/${Date.now()}/pdf`, {
        variants: generatedTest.variants,
        config: generatedTest.config,
        subjectName: generatedTest.subject,
      })

  const files: Array<{ url: string; fileName: string; variantNumber: string; answerSheetUrl?: string }> = data?.files || []
      if (!files.length) {
        toast({ title: 'Natija topilmadi', description: 'HTML fayllar yaratilmagan', variant: 'destructive' })
        return
      }

      // Map unique numbers from generatedTest
      const enriched = files.map((f) => {
        const match = generatedTest.variants?.find((v: any) => `${v.variantNumber}` === `${f.variantNumber}`)
        return { 
          ...f,
          url: `${import.meta.env.VITE_FILE_BASE_URL}${f.url}`,
          answerSheetUrl: f.answerSheetUrl ? `${import.meta.env.VITE_FILE_BASE_URL}${f.answerSheetUrl}` : undefined,
          uniqueNumber: match?.uniqueNumber as string | undefined 
        }
      })
      setPrintFiles(enriched)
  setPrintTitle(data?.title || generatedTest.title)
  const rawCombined: string | undefined = data?.combinedUrl
  setCombinedUrl(rawCombined ? `${import.meta.env.VITE_FILE_BASE_URL}${rawCombined}` : null)

      if (files.length > 1) {
        toast({ title: 'Bir nechta variant', description: `${files.length} ta HTML yaratildi. Har birini alohida oching.` })
      } else {
        toast({ title: 'Tayyor', description: 'HTML chop etish sahifasi ochildi' })
      }
    } catch (error: any) {
      console.log(error?.response?.data)
      toast({
        title: 'Xatolik',
        description: error?.response?.data?.message || 'HTML yaratishda xatolik yuz berdi',
        variant: 'destructive',
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
                setSelectedTests([])
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
                <Badge variant="secondary">{SubjectCategoryLabels[selectedSubject.category]}</Badge>
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
              <Popover open={testsPopoverOpen} onOpenChange={setTestsPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={testsPopoverOpen}
                    className="w-full justify-between"
                  >
                    {selectedTests.length === 0
                      ? "Test(lar)ni tanlang (ixtiyoriy)"
                      : `${selectedTests.length} ta test tanlandi`}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                  <Command>
                    <CommandInput placeholder="Test qidiring..." />
                    <CommandEmpty>Natija topilmadi.</CommandEmpty>
                    <CommandList>
                      <CommandGroup>
                        {subjectTests.map((test) => {
                          const checked = selectedTests.some((t) => t.id === test.id)
                          return (
                            <CommandItem
                              key={test.id}
                              value={`${test.id}`}
                              onSelect={() => {
                                setSelectedTests((prev) => {
                                  const exists = prev.some((t) => t.id === test.id)
                                  if (exists) return prev.filter((t) => t.id !== test.id)
                                  return [...prev, test]
                                })
                              }}
                              className="cursor-pointer"
                            >
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={() => {
                                    setSelectedTests((prev) => {
                                      const exists = prev.some((t) => t.id === test.id)
                                      if (exists) return prev.filter((t) => t.id !== test.id)
                                      return [...prev, test]
                                    })
                                  }}
                                />
                                <span className="truncate">
                                  {test.title} ({test.totalQuestions} savol)
                                </span>
                              </div>
                            </CommandItem>
                          )
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {selectedTests.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {selectedTests.map((t) => (
                    <Badge key={t.id} variant="secondary" className="flex items-center gap-1">
                      {t.title}
                      <button
                        type="button"
                        onClick={() => setSelectedTests((prev) => prev.filter((x) => x.id !== t.id))}
                        className="ml-1 text-xs text-muted-foreground hover:text-foreground"
                        aria-label="O'chirish"
                        title="O'chirish"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
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
                  {[10, 15, 20,  30, 40,50,80,100].map((num) => (
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
                  onClick={generateHTML}
                  variant="outline"
                  className="border-primary text-primary hover:bg-primary/5"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Chop etish 
                </Button>
                {combinedUrl && (
                  <div className="flex gap-2">
                    <a href={combinedUrl} target="_blank" rel="noreferrer">
                      <Button variant="outline" className="border-primary text-primary hover:bg-primary/5">
                        <Printer className="h-4 w-4 mr-2" /> Barchasini chop etish 
                      </Button>
                    </a>
                 
                    <a href={`/sheet.png`} target="_blank" rel="noreferrer">
                      <Button variant="outline" className="border-primary text-primary hover:bg-primary/5">
                        Javob varag'ini yuklab olish
                      </Button>
                    </a>
                  </div>
                )}
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
          
        </Card>
      )}

      {printFiles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Printer className="h-5 w-5 text-primary" />
                Chop etish fayllari
              </span>
              <div className="flex gap-2">
                <Badge variant="secondary">{printFiles.length} variant</Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-3">
              <h3 className="font-semibold text-lg">{printTitle || generatedTest?.title}</h3>
              <p className="text-sm text-muted-foreground">Variants (har biri uchun havola va yuklab olish)</p>
            </div>
            <div className="divide-y rounded border">
              {printFiles.map((f, idx) => (
                <div key={`${f.variantNumber}-${idx}`} className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">Variant {f.variantNumber}</Badge>
                    {f.uniqueNumber && (
                      <Badge variant="outline" className="text-green-600 border-green-600">#{f.uniqueNumber}</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <a href={f.url} target="_blank" rel="noreferrer" className="text-primary underline">
                      Ochish
                    </a>
                    <a href={f.url} download={f.fileName} className="inline-flex">
                      <Button size="sm" variant="outline" className="gap-2">
                        <Download className="h-4 w-4" /> Yuklab olish
                      </Button>
                    </a>
                    {f.answerSheetUrl && (
                      <>
                        <span className="text-muted-foreground">|</span>
                        <a href={f.answerSheetUrl} target="_blank" rel="noreferrer" className="text-primary underline">
                          Javoblar varagi
                        </a>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}