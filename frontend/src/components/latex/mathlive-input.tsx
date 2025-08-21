"use client"
import { useEffect, useRef, useState } from "react"
import type React from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calculator, Eye, EyeOff, Copy, Check, ImageIcon } from "lucide-react"
import { LaTeXRenderer } from "./latex-renderer"

interface MathLiveInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function MathLiveInput({ value, onChange, placeholder, className }: MathLiveInputProps) {
  const mathfieldRef = useRef<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [showPreview, setShowPreview] = useState(true)
  const [copied, setCopied] = useState(false)
  const [currentLatex, setCurrentLatex] = useState("")
  const [activeCategory, setActiveCategory] = useState("matematik")

  useEffect(() => {
    // Dynamically import MathLive to avoid SSR issues
    const loadMathLive = async () => {
      if (typeof window !== "undefined" && isOpen) {
        const { MathfieldElement } = await import("mathlive")

        if (mathfieldRef.current && !mathfieldRef.current.hasAttribute("data-initialized")) {
          const mathfield = mathfieldRef.current as any

          // Configure MathLive
          mathfield.setOptions({
            virtualKeyboardMode: "manual",
            smartFence: true,
            smartSuperscript: true,
            locale: "uz",
          })

          // Set initial value
          if (currentLatex) {
            mathfield.setValue(currentLatex)
          }

          // Listen for changes
          mathfield.addEventListener("input", (event: any) => {
            const latex = event.target.getValue()
            setCurrentLatex(latex)
          })

          mathfield.setAttribute("data-initialized", "true")
        }
      }
    }

    loadMathLive()
  }, [isOpen, currentLatex])

  const openMathEditor = () => {
    setIsOpen(true)
    // Extract LaTeX from current value if it exists
    const latexMatch = value.match(/\$\$(.*?)\$\$/g)
    if (latexMatch && latexMatch.length > 0) {
      const latex = latexMatch[latexMatch.length - 1].replace(/\$\$/g, "")
      setCurrentLatex(latex)
    }
  }

  const insertFormula = () => {
    if (currentLatex.trim()) {
      const newValue = value + (value ? " " : "") + `$$${currentLatex}$$`
      onChange(newValue)
      setIsOpen(false)
      setCurrentLatex("")
    }
  }

  const copyLatex = async () => {
    if (currentLatex) {
      await navigator.clipboard.writeText(currentLatex)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const formulaCategories = {
    matematik: [
      { name: "Kvadrat", latex: "x^2" },
      { name: "Kasr", latex: "\\frac{a}{b}" },
      { name: "Ildiz", latex: "\\sqrt{x}" },
      { name: "Integral", latex: "\\int_{0}^{1} f(x)dx" },
      { name: "Yig'indi", latex: "\\sum_{i=1}^{n} x_i" },
      { name: "Limit", latex: "\\lim_{x \\to \\infty} f(x)" },
      { name: "Logarifm", latex: "\\log_{a} b" },
      { name: "Trigonometriya", latex: "\\sin(x) + \\cos(x)" },
    ],
    fizika: [
      { name: "Nyuton qonuni", latex: "F = ma" },
      { name: "Eynshteyn formulasi", latex: "E = mc^2" },
      { name: "Tezlik", latex: "v = \\frac{s}{t}" },
      { name: "Tezlanish", latex: "a = \\frac{\\Delta v}{\\Delta t}" },
      { name: "Kinetik energiya", latex: "E_k = \\frac{1}{2}mv^2" },
      { name: "Potensial energiya", latex: "E_p = mgh" },
      { name: "Om qonuni", latex: "V = IR" },
      { name: "Quvvat", latex: "P = \\frac{W}{t}" },
      { name: "Tortishish kuchi", latex: "F = G\\frac{m_1 m_2}{r^2}" },
      { name: "Yorug'lik tezligi", latex: "c = 3 \\times 10^8 \\text{ m/s}" },
    ],
    kimyo: [
      { name: "Suv", latex: "H_2O" },
      { name: "Karbonat angidrid", latex: "CO_2" },
      { name: "Ammiak", latex: "NH_3" },
      { name: "Sulfat kislota", latex: "H_2SO_4" },
      { name: "Natriy xlorid", latex: "NaCl" },
      { name: "Metan", latex: "CH_4" },
      { name: "Etanol", latex: "C_2H_5OH" },
      { name: "Glukoza", latex: "C_6H_{12}O_6" },
      { name: "Kalsiy karbonat", latex: "CaCO_3" },
      { name: "Azot kislota", latex: "HNO_3" },
      { name: "Reaksiya", latex: "A + B \\rightarrow C + D" },
      { name: "Ionlanish", latex: "AB \\rightleftharpoons A^+ + B^-" },
    ],
    yunon: [
      { name: "Alpha", latex: "\\alpha" },
      { name: "Beta", latex: "\\beta" },
      { name: "Gamma", latex: "\\gamma" },
      { name: "Delta", latex: "\\delta" },
      { name: "Epsilon", latex: "\\epsilon" },
      { name: "Zeta", latex: "\\zeta" },
      { name: "Eta", latex: "\\eta" },
      { name: "Theta", latex: "\\theta" },
      { name: "Iota", latex: "\\iota" },
      { name: "Kappa", latex: "\\kappa" },
      { name: "Lambda", latex: "\\lambda" },
      { name: "Mu", latex: "\\mu" },
      { name: "Nu", latex: "\\nu" },
      { name: "Xi", latex: "\\xi" },
      { name: "Pi", latex: "\\pi" },
      { name: "Rho", latex: "\\rho" },
      { name: "Sigma", latex: "\\sigma" },
      { name: "Tau", latex: "\\tau" },
      { name: "Phi", latex: "\\phi" },
      { name: "Chi", latex: "\\chi" },
      { name: "Psi", latex: "\\psi" },
      { name: "Omega", latex: "\\omega" },
      { name: "Katta Gamma", latex: "\\Gamma" },
      { name: "Katta Delta", latex: "\\Delta" },
      { name: "Katta Theta", latex: "\\Theta" },
      { name: "Katta Lambda", latex: "\\Lambda" },
      { name: "Katta Pi", latex: "\\Pi" },
      { name: "Katta Sigma", latex: "\\Sigma" },
      { name: "Katta Phi", latex: "\\Phi" },
      { name: "Katta Psi", latex: "\\Psi" },
      { name: "Katta Omega", latex: "\\Omega" },
    ],
    belgilar: [
      { name: "Cheksizlik", latex: "\\infty" },
      { name: "Plusminus", latex: "\\pm" },
      { name: "Teng emas", latex: "\\neq" },
      { name: "Katta yoki teng", latex: "\\geq" },
      { name: "Kichik yoki teng", latex: "\\leq" },
      { name: "Taxminan", latex: "\\approx" },
      { name: "Proporsional", latex: "\\propto" },
      { name: "Cheksiz kichik", latex: "\\partial" },
      { name: "Nabla", latex: "\\nabla" },
      { name: "Integral", latex: "\\int" },
      { name: "Ikki tomonlama integral", latex: "\\iint" },
      { name: "Uch tomonlama integral", latex: "\\iiint" },
      { name: "Yopiq integral", latex: "\\oint" },
      { name: "Yig'indi", latex: "\\sum" },
      { name: "Ko'paytma", latex: "\\prod" },
      { name: "Birlashma", latex: "\\cup" },
      { name: "Kesishma", latex: "\\cap" },
      { name: "Ichida", latex: "\\in" },
      { name: "Ichida emas", latex: "\\notin" },
      { name: "Subset", latex: "\\subset" },
      { name: "Superset", latex: "\\supset" },
      { name: "Bo'sh to'plam", latex: "\\emptyset" },
      { name: "Forall", latex: "\\forall" },
      { name: "Exists", latex: "\\exists" },
      { name: "O'ng strelka", latex: "\\rightarrow" },
      { name: "Chap strelka", latex: "\\leftarrow" },
      { name: "Ikki tomonlama strelka", latex: "\\leftrightarrow" },
      { name: "Yuqori strelka", latex: "\\uparrow" },
      { name: "Pastki strelka", latex: "\\downarrow" },
    ],
  }

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const imageUrl = e.target?.result as string
        const imageMarkdown = `![Rasm](${imageUrl})`
        const newValue = value + (value ? "\n\n" : "") + imageMarkdown
        onChange(newValue)
      }
      reader.readAsDataURL(file)
    }
  }

  const openImageUpload = () => {
    fileInputRef.current?.click()
  }

  const insertQuickFormula = (latex: string) => {
    if (mathfieldRef.current) {
      mathfieldRef.current.executeCommand(["insert", latex])
    }
  }

  return (
    <div className={className}>
      <div className="space-y-4">
        {/* Main Input Area */}
        <div className="border rounded-lg p-3 min-h-[100px] bg-background">
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder || "Matn kiriting. Formula yoki rasm qo'shish uchun tugmalarni bosing"}
            className="w-full h-20 resize-none border-none outline-none bg-transparent"
          />

          {/* Action Buttons */}
          <div className="flex items-center justify-between mt-2 pt-2 border-t">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={openMathEditor}
                className="flex items-center gap-2 bg-transparent"
              >
                <Calculator className="h-4 w-4" />
                Formula qo'shish
              </Button>

              {/* Image Upload Button */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={openImageUpload}
                className="flex items-center gap-2 bg-transparent"
              >
                <ImageIcon className="h-4 w-4" />
                Rasm qo'shish
              </Button>

              {/* Hidden file input */}
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </div>

            {showPreview && (
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowPreview(!showPreview)}>
                {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            )}
          </div>
        </div>

        {/* Preview */}
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

        {/* MathLive Editor Modal */}
        {isOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Formula va belgilar paneli
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={copyLatex} disabled={!currentLatex}>
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied ? "Nusxalandi" : "LaTeX nusxalash"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setIsOpen(false)}>
                    Yopish
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Category Tabs */}
                <div>
                  <h4 className="text-sm font-medium mb-2">Kategoriyalar:</h4>
                  <div className="flex gap-2 mb-3 flex-wrap">
                    {Object.keys(formulaCategories).map((category) => (
                      <Button
                        key={category}
                        variant={activeCategory === category ? "default" : "outline"}
                        size="sm"
                        onClick={() => setActiveCategory(category)}
                        className="capitalize"
                      >
                        {category === "yunon"
                          ? "Yunon harflari"
                          : category === "belgilar"
                            ? "Matematik belgilar"
                            : category}
                      </Button>
                    ))}
                  </div>

                  {/* Quick Formulas/Symbols */}
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 max-h-40 overflow-y-auto">
                    {formulaCategories[activeCategory as keyof typeof formulaCategories].map((formula, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        onClick={() => insertQuickFormula(formula.latex)}
                        className="text-xs h-auto p-2 flex flex-col items-center gap-1"
                      >
                        <span className="font-medium text-xs">{formula.name}</span>
                        <div className="text-xs">
                          <LaTeXRenderer content={`$$${formula.latex}$$`} inline />
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>

                {/* MathLive Editor */}
                <div className="border rounded-lg p-4 bg-white">
                  <math-field
                    ref={mathfieldRef}
                    style={{
                      fontSize: "24px",
                      padding: "8px",
                      border: "1px solid #e2e8f0",
                      borderRadius: "6px",
                      minHeight: "60px",
                      width: "100%",
                    }}
                  />
                </div>

                {/* Preview */}
                {currentLatex && (
                  <div className="border rounded-lg p-4 bg-muted/50">
                    <h4 className="text-sm font-medium mb-2">Ko'rinish:</h4>
                    <LaTeXRenderer content={`$$${currentLatex}$$`} />
                  </div>
                )}

                {/* LaTeX Code */}
                {currentLatex && (
                  <div className="border rounded-lg p-4 bg-muted/50">
                    <h4 className="text-sm font-medium mb-2">LaTeX kodi:</h4>
                    <code className="text-sm font-mono bg-background p-2 rounded block">{currentLatex}</code>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button variant="outline" onClick={() => setIsOpen(false)}>
                    Bekor qilish
                  </Button>
                  <Button onClick={insertFormula} disabled={!currentLatex.trim()}>
                    Formula qo'shish
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
