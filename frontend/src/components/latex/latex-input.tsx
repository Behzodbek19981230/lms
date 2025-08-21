"use client"
import { useState } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { LaTeXRenderer, LaTeXStyles } from "./latex-renderer"
import { Eye, EyeOff, BookOpen } from "lucide-react"

interface LaTeXInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function LaTeXInput({ value, onChange, placeholder, className }: LaTeXInputProps) {
  const [showPreview, setShowPreview] = useState(true)
  const [activeTab, setActiveTab] = useState("input")

  const latexExamples = [
    { name: "Kvadrat", latex: "x^2 + y^2 = z^2" },
    { name: "Kasr", latex: "\\frac{a}{b} + \\frac{c}{d}" },
    { name: "Ildiz", latex: "\\sqrt{x^2 + y^2}" },
    { name: "Integral", latex: "\\int_{0}^{1} f(x)dx" },
    { name: "Yig'indi", latex: "\\sum_{i=1}^{n} x_i" },
    { name: "Yunon harflari", latex: "\\alpha + \\beta = \\gamma" },
    { name: "Tengsizlik", latex: "x \\leq y \\geq z" },
    { name: "Cheksizlik", latex: "\\lim_{x \\to \\infty} f(x)" },
  ]

  const insertLatex = (latex: string) => {
    const newValue = value + (value ? " " : "") + "$$" + latex + "$$"
    onChange(newValue)
  }

  return (
    <div className={className}>
      <LaTeXStyles />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center justify-between mb-2">
          <TabsList className="grid w-fit grid-cols-3">
            <TabsTrigger value="input">Kiritish</TabsTrigger>
            <TabsTrigger value="preview">Ko'rish</TabsTrigger>
            <TabsTrigger value="help">Yordam</TabsTrigger>
          </TabsList>

          <Button variant="outline" size="sm" onClick={() => setShowPreview(!showPreview)} className="ml-2">
            {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>

        <TabsContent value="input" className="space-y-4">
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder || "LaTeX formulalarni $$ ichida yozing. Masalan: $$x^2 + y^2 = z^2$$"}
            className="min-h-[120px] font-mono text-sm"
          />

          {showPreview && value && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Ko'rinish:</CardTitle>
              </CardHeader>
              <CardContent>
                <LaTeXRenderer content={value} />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="preview">
          <Card className="min-h-[200px]">
            <CardHeader>
              <CardTitle className="text-sm">Formula ko'rinishi</CardTitle>
            </CardHeader>
            <CardContent>
              {value ? (
                <LaTeXRenderer content={value} />
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  Formula kiritish uchun "Kiritish" bo'limiga o'ting
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="help" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                LaTeX formulalar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {latexExamples.map((example, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                    onClick={() => insertLatex(example.latex)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                          {example.name}
                        </Badge>
                      </div>
                      <code className="text-xs text-muted-foreground font-mono">{example.latex}</code>
                    </div>
                    <div className="ml-3">
                      <LaTeXRenderer content={`$$${example.latex}$$`} inline />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                <h4 className="font-medium text-sm mb-2">Asosiy qoidalar:</h4>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Formulalarni $$ ... $$ ichiga yozing</li>
                  <li>• Yuqori indeks uchun ^ ishlatiladi: x^2</li>
                  <li>• Pastki indeks uchun _ ishlatiladi: x_1</li>
                  <li>
                    • Kasr uchun \frac{"{a}"}
                    {"{b}"} ishlatiladi
                  </li>
                  <li>• Ildiz uchun \sqrt{"{x}"} ishlatiladi</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
