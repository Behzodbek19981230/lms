"use client"

import {useEffect, useRef, useState} from "react"

interface MathRendererProps {
    latex: string
    className?: string
}

export function MathRenderer({latex, className = ""}: MathRendererProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const [isMathJaxLoaded, setIsMathJaxLoaded] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [hasError, setHasError] = useState(false)

    // Load MathJax only once
    useEffect(() => {
        const loadMathJax = () => {
            if (window.MathJax) {
                setIsMathJaxLoaded(true)
                setIsLoading(false)
                return
            }

            // Configure MathJax
            window.MathJax = {
                tex: {
                    inlineMath: [
                        ["$", "$"],
                        ["$$", "$$"],
                    ],
                    displayMath: [
                        ["$$", "$$"],
                        ["\\[", "\\]"],
                    ],
                    processEscapes: true,
                    processEnvironments: true,
                },
                options: {
                    skipHtmlTags: ["script", "noscript", "style", "textarea", "pre"],
                },
                startup: {
                    ready: () => {
                        window.MathJax.startup.defaultReady()
                        setIsMathJaxLoaded(true)
                        setIsLoading(false)
                    },
                },
            }

            // Load MathJax script
            const script = document.createElement("script")
            script.src = "https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"
            script.async = true
            script.onload = () => setIsLoading(false)
            script.onerror = () => {
                setIsLoading(false)
                setHasError(true)
            }
            document.head.appendChild(script)
        }

        loadMathJax()
    }, [])

    // Render math content
    useEffect(() => {
        if (containerRef.current && latex && isMathJaxLoaded) {
            setHasError(false)

            // Process the latex string to handle both inline and display math
            let processedContent = latex

            // If it's just LaTeX without delimiters, wrap it in inline math
            if (!latex.includes("$") && !latex.includes("\\(") && !latex.includes("\\[")) {
                processedContent = `$${latex}$`
            }

            containerRef.current.innerHTML = processedContent

            // Typeset with MathJax
            if (window.MathJax && window.MathJax.typesetPromise) {
                window.MathJax.typesetPromise([containerRef.current]).catch((err: never) => {
                    console.error("MathJax typesetting error:", err)
                    setHasError(true)
                    if (containerRef.current) {
                        containerRef.current.innerHTML = `
              <div class="inline-flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <span class="text-red-500">⚠️</span>
                <span class="text-sm font-medium">Noto'g'ri formula:</span>
                <code class="bg-red-100 px-2 py-1 rounded text-xs font-mono">${latex}</code>
              </div>
            `
                    }
                })
            }
        } else if (containerRef.current && latex && !isMathJaxLoaded && !isLoading) {
            containerRef.current.innerHTML = `
        <div class="inline-flex items-center gap-2 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg px-3 py-2">
          <span class="text-blue-500">📐</span>
          <code class="font-mono text-sm text-blue-700">${latex}</code>
        </div>
      `
        } else if (containerRef.current && isLoading) {
            containerRef.current.innerHTML = `
        <div class="inline-flex items-center gap-2 text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
          <div class="animate-spin w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full"></div>
          <span class="text-sm">Yuklanmoqda...</span>
        </div>
      `
        }
    }, [latex, isMathJaxLoaded, isLoading])

    return (
        <div
            ref={containerRef}
            className={`math-renderer inline-block transition-all duration-200 ${className}`}
            style={{
                minHeight: latex ? "auto" : "24px",
                minWidth: latex ? "auto" : "24px",
            }}
        />
    )
}

// Declare MathJax types for TypeScript
declare global {
    interface Window {
        MathJax: any
    }
}
