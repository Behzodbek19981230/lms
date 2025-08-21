declare global {
    namespace JSX {
        interface IntrinsicElements {
            'math-field': React.DetailedHTMLProps<React.HTMLAttributes<MathfieldElement>, MathfieldElement>;
        }
    }
}


import "https://esm.run/mathlive";

import type React from "react"
import {useEffect, useRef, useState} from "react"
import {Button} from "@/components/ui/button"
import {Label} from "@/components/ui/label"
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog"
import {MathRenderer} from "@/components/math-renderer"
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs"


interface MathPopupProps {
    isOpen: boolean
    onClose: () => void
    onInsert: (latex: string) => void
    initialValue?: string
    isEditing?: boolean
}

const commonFormulas = [
    {name: "Kvadrat", latex: "x^2"},
    {name: "Kub", latex: "x^3"},
    {name: "Kasr", latex: "\\frac{a}{b}"},
    {name: "Ildiz", latex: "\\sqrt{x}"},
    {name: "Yig'indi", latex: "\\sum_{i=1}^{n} x_i"},
    {name: "Integral", latex: "\\int_{a}^{b} f(x) dx"},
    {name: "Limit", latex: "\\lim_{x \\to \\infty} f(x)"},
    {name: "Matrisa", latex: "\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}"},
    {name: "Tenglama", latex: "ax^2 + bx + c = 0"},
    {name: "Logarifm", latex: "\\log_a b"},
    {name: "Trigonometriya", latex: "\\sin(x) + \\cos(x)"},
    {name: "Vektor", latex: "\\vec{v} = \\langle x, y, z \\rangle"},
]

export function MathPopup({isOpen, onClose, onInsert, initialValue = "", isEditing = false}: MathPopupProps) {
    const [latex, setLatex] = useState(initialValue)
    const mathFieldRef = useRef<any>(null)
    const [isMathLiveLoaded, setIsMathLiveLoaded] = useState(false)
    const [isVirtualKeyboardOpen, setIsVirtualKeyboardOpen] = useState(false)

    // Load MathLive when component mounts
    useEffect(() => {
        const loadMathLive = async () => {
            if (!window.customElements.get("math-field")) {
                try {
                    await import("https://unpkg.com/mathlive?module")
                    setIsMathLiveLoaded(true)
                } catch (error) {
                    console.error("Failed to load MathLive:", error)
                }
            } else {
                setIsMathLiveLoaded(true)
            }
        }

        loadMathLive()
    }, [])

    useEffect(() => {
        if (isOpen) {
            setLatex(initialValue)

            // Set the MathLive field value with better timing
            if (mathFieldRef.current && isMathLiveLoaded) {
                const setMathFieldValue = () => {
                    if (mathFieldRef.current) {
                        mathFieldRef.current.setValue(initialValue)

                        // Add virtual keyboard event listener
                        mathFieldRef.current.addEventListener("virtual-keyboard-toggle", (event: any) => {
                            setIsVirtualKeyboardOpen(event.detail.visible)
                        })
                    }
                }

                // Try multiple times with increasing delays to ensure MathLive is ready
                setTimeout(setMathFieldValue, 100)
                setTimeout(setMathFieldValue, 300)
                setTimeout(setMathFieldValue, 500)
            }
        }
    }, [isOpen, initialValue, isMathLiveLoaded])

    // Handle MathLive input changes
    const handleMathFieldInput = () => {
        if (mathFieldRef.current) {
            const newLatex = mathFieldRef.current.getValue("latex")
            setLatex(newLatex)
        }
    }

    const handleInsert = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (latex.trim()) {
            onInsert(latex.trim())
            onClose()
        }
    }

    const handleFormulaClick = (formulaLatex: string) => {
        setLatex(formulaLatex)
        if (mathFieldRef.current) {
            mathFieldRef.current.setValue(formulaLatex)
        }
    }

    const handleClose = (e?: React.MouseEvent) => {
        e?.stopPropagation()
        onClose()
    }

    const handleOpenChange = (open: boolean) => {
        // Don't close the dialog if the virtual keyboard is open
        if (!open && !isVirtualKeyboardOpen) {
            handleClose()
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogContent
                className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-blue-50 via-white to-purple-50 border-2 border-blue-200 shadow-2xl"
                onPointerDownOutside={(e) => {
                    e.preventDefault()
                }}
                onEscapeKeyDown={(e) => {
                    e.preventDefault()
                }}
            >
                <DialogHeader className="pb-6">
                    <DialogTitle
                        className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        {isEditing ? "🔧 Formulani tahrirlash" : "➕ Matematik formula kiritish"}
                    </DialogTitle>
                </DialogHeader>

                <Tabs defaultValue="editor" className="w-full">
                    <TabsList
                        className="grid w-full grid-cols-2 bg-gradient-to-r from-blue-100 to-purple-100 p-1 rounded-xl">
                        <TabsTrigger
                            value="editor"
                            className="data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-blue-600 font-semibold rounded-lg transition-all duration-200"
                        >
                            🎨 Visual Editor
                        </TabsTrigger>
                        <TabsTrigger
                            value="templates"
                            className="data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-purple-600 font-semibold rounded-lg transition-all duration-200"
                        >
                            📚 Shablonlar
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="editor" className="space-y-6 mt-6">
                        <div className="space-y-4">
                            <Label
                                className="text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                Matematik formula:
                            </Label>
                            {isMathLiveLoaded ? (
                                <div
                                    className="border-2 border-gradient-to-r from-blue-200 to-purple-200 rounded-xl p-6 bg-white shadow-lg hover:shadow-xl transition-shadow duration-300">
                                    <math-field
                                        ref={mathFieldRef}
                                        onInput={handleMathFieldInput}
                                        style={{
                                            fontSize: "20px",
                                            padding: "12px",
                                            border: "none",
                                            outline: "none",
                                            width: "100%",
                                            minHeight: "80px",
                                            borderRadius: "8px",
                                        }}
                                        virtual-keyboard-mode="onfocus"
                                        virtual-keyboard-theme="material"
                                    />
                                </div>
                            ) : (
                                <div
                                    className="border-2 border-dashed border-blue-300 rounded-xl p-6 bg-gradient-to-r from-blue-50 to-purple-50 text-center">
                                    <div className="animate-pulse">
                                        <div className="text-blue-600 text-lg font-medium">🔄 MathLive yuklanmoqda...
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4">
                <div className="text-sm text-amber-800 space-y-2">
                  <p className="font-semibold text-amber-900">💡 Maslahatlar:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Kasr uchun: "/" tugmasini bosing</li>
                    <li>Daraja uchun: "^" tugmasini bosing</li>
                    <li>Ildiz uchun: "sqrt" yozing</li>
                    <li>Yuqori/pastki indeks uchun: "_" tugmasini bosing</li>
                    <li>Klavatura tugmasini bosib virtual klavaturani oching</li>
                  </ul>
                </div>
              </div> */}
                        </div>

                        {latex && (
                            <div
                                className="p-6 border-2 border-green-200 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 shadow-lg">
                                <Label className="text-lg font-semibold text-green-800 mb-3 block">✨ Ko'rinishi:</Label>
                                <div
                                    className="bg-white p-4 rounded-lg border-2 border-green-100 min-h-[60px] flex items-center justify-center shadow-inner">
                                    <MathRenderer latex={latex}/>
                                </div>
                                <div className="mt-3 text-sm text-green-700 bg-green-100 p-2 rounded-lg">
                                    <strong>LaTeX:</strong>{" "}
                                    <code className="bg-white px-2 py-1 rounded font-mono text-green-800">{latex}</code>
                                </div>
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="templates" className="space-y-6 mt-6">
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {commonFormulas.map((formula, index) => (
                                <Button
                                    key={index}
                                    variant="outline"
                                    onClick={() => handleFormulaClick(formula.latex)}
                                    className="h-auto p-4 flex flex-col items-center gap-3 hover:bg-gradient-to-br hover:from-blue-50 hover:to-purple-50 hover:border-blue-300 hover:shadow-lg transition-all duration-300 border-2 rounded-xl"
                                >
                                    <span className="text-sm font-semibold text-gray-700">{formula.name}</span>
                                    <div
                                        className="text-sm bg-white p-3 rounded-lg border w-full flex justify-center min-h-[50px] items-center shadow-sm">
                                        <MathRenderer latex={formula.latex}/>
                                    </div>
                                </Button>
                            ))}
                        </div>

                        {latex && (
                            <div
                                className="p-6 border-2 border-purple-200 rounded-xl bg-gradient-to-r from-purple-50 to-pink-50 shadow-lg">
                                <Label className="text-lg font-semibold text-purple-800 mb-3 block">🎯 Tanlangan
                                    formula:</Label>
                                <div
                                    className="bg-white p-4 rounded-lg border-2 border-purple-100 min-h-[60px] flex items-center justify-center shadow-inner">
                                    <MathRenderer latex={latex}/>
                                </div>
                            </div>
                        )}
                    </TabsContent>
                </Tabs>

                <div className="flex justify-end gap-4 pt-6 border-t-2 border-gray-200">
                    <Button
                        onClick={(e) => handleClose(e)}
                        className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
                    >
                        Bekor qilish
                    </Button>

                    <Button
                        onClick={(e) => handleInsert(e)}
                        disabled={!latex.trim()}
                        className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50"
                    >
                        {isEditing ? "Yangilash" : " Kiritish"}
                    </Button>
                </div>

            </DialogContent>
        </Dialog>
    )
}
