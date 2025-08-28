"use client"
import { useEffect, useRef } from "react"

interface LaTeXRendererProps {
    content: string
    className?: string
    inline?: boolean
}

export function LaTeXRenderer({ content, className = "", inline = false }: LaTeXRendererProps) {
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (containerRef.current && content) {
            // Simple LaTeX to HTML conversion for common mathematical expressions
            const renderLatex = (text: string) => {
                let rendered = text

                // Replace common LaTeX patterns with HTML/Unicode equivalents
                rendered = rendered.replace(/\$\$(.*?)\$\$/g, (match, formula) => {
                    return `<span class="latex-formula">${convertLatexToHtml(formula)}</span>`
                })

                rendered = rendered.replace(/\$(.*?)\$/g, (match, formula) => {
                    return `<span class="latex-inline">${convertLatexToHtml(formula)}</span>`
                })

                return rendered
            }

            const convertLatexToHtml = (formula: string) => {
                let html = formula

                // Superscripts
                html = html.replace(/\^{([^}]+)}/g, "<sup>$1</sup>")
                html = html.replace(/\^(\w)/g, "<sup>$1</sup>")

                // Subscripts
                html = html.replace(/_{([^}]+)}/g, "<sub>$1</sub>")
                html = html.replace(/_(\w)/g, "<sub>$1</sub>")

                // Fractions
                html = html.replace(
                    /\\frac{([^}]+)}{([^}]+)}/g,
                    '<span class="fraction"><span class="numerator">$1</span><span class="denominator">$2</span></span>',
                )

                // Square roots
                html = html.replace(/\\sqrt{([^}]+)}/g, '√<span class="sqrt-content">$1</span>')
                html = html.replace(/\\sqrt/g, "√")

                // Integrals
                html = html.replace(/\\int_{([^}]+)}\^{([^}]+)}/g, '<span class="integral">∫<sub>$1</sub><sup>$2</sup></span>')
                html = html.replace(/\\int/g, "∫")

                // Summation
                html = html.replace(/\\sum_{([^}]+)}\^{([^}]+)}/g, '<span class="summation">Σ<sub>$1</sub><sup>$2</sup></span>')
                html = html.replace(/\\sum/g, "Σ")

                // Greek letters
                html = html.replace(/\\alpha/g, "α")
                html = html.replace(/\\beta/g, "β")
                html = html.replace(/\\gamma/g, "γ")
                html = html.replace(/\\delta/g, "δ")
                html = html.replace(/\\epsilon/g, "ε")
                html = html.replace(/\\theta/g, "θ")
                html = html.replace(/\\lambda/g, "λ")
                html = html.replace(/\\mu/g, "μ")
                html = html.replace(/\\pi/g, "π")
                html = html.replace(/\\sigma/g, "σ")
                html = html.replace(/\\phi/g, "φ")
                html = html.replace(/\\omega/g, "ω")

                // Mathematical operators
                html = html.replace(/\\times/g, "×")
                html = html.replace(/\\div/g, "÷")
                html = html.replace(/\\pm/g, "±")
                html = html.replace(/\\leq/g, "≤")
                html = html.replace(/\\geq/g, "≥")
                html = html.replace(/\\neq/g, "≠")
                html = html.replace(/\\approx/g, "≈")
                html = html.replace(/\\infty/g, "∞")

                return html
            }

            containerRef.current.innerHTML = renderLatex(content)
        }
    }, [content])

    return (
        <div
            ref={containerRef}
            className={`latex-container ${inline ? "inline" : "block"} ${className}`}
            style={{
                fontSize: inline ? "inherit" : "1.1em",
                lineHeight: inline ? "inherit" : "1.6",
            }}
        />
    )
}

// Add CSS styles for LaTeX rendering
export const LaTeXStyles = () => (
    <style jsx global>{`
    .latex-container {
      font-family: 'Times New Roman', serif;
    }
    
    .latex-formula {
      display: inline-block;
      margin: 0.5em 0;
      padding: 0.5em;
      background: rgba(0, 51, 102, 0.05);
      border-radius: 4px;
      font-size: 1.2em;
    }
    
    .latex-inline {
      display: inline;
      font-size: 1.1em;
    }
    
    .fraction {
      display: inline-block;
      vertical-align: middle;
      text-align: center;
    }
    
    .fraction .numerator {
      display: block;
      border-bottom: 1px solid currentColor;
      padding-bottom: 2px;
    }
    
    .fraction .denominator {
      display: block;
      padding-top: 2px;
    }
    
    .sqrt-content {
      border-top: 1px solid currentColor;
      padding-top: 2px;
    }
    
    .integral, .summation {
      font-size: 1.5em;
      vertical-align: middle;
    }
    
    sup, sub {
      font-size: 0.8em;
    }
  `}</style>
)
