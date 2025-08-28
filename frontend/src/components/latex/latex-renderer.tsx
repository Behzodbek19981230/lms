'use client';
import { useEffect, useRef } from 'react';

interface LaTeXRendererProps {
	content: string;
	className?: string;
	inline?: boolean;
}

export function LaTeXRenderer({ content, className = '', inline = false }: LaTeXRendererProps) {
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (containerRef.current && content) {
			const fallbackRender = (text: string) => {
				let rendered = text;

				// Replace common LaTeX patterns with HTML/Unicode equivalents
				rendered = rendered.replace(/\$\$(.*?)\$\$/g, (match, formula) => {
					return `<span class="latex-formula">${convertLatexToHtml(formula)}</span>`;
				});

				rendered = rendered.replace(/\$(.*?)\$/g, (match, formula) => {
					return `<span class="latex-inline">${convertLatexToHtml(formula)}</span>`;
				});

				// Handle markdown images with custom sizes: ![alt|width: 300px; height: 200px](src)
				rendered = rendered.replace(/!\[(.*?)\|(.*?)\]\((.*?)\)/g, (match, alt, sizeStyle, src) => {
					const sizeStyles = sizeStyle
						.split(';')
						.map((s) => s.trim())
						.join('; ');
					return `<img src="${src}" alt="${alt}" style="max-width: 100%; height: auto; display: block; margin: 1em auto; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; ${sizeStyles}" />`;
				});

				// Handle regular markdown images: ![alt](src)
				rendered = rendered.replace(/!\[(.*?)\]\((.*?)\)/g, (match, alt, src) => {
					return `<img src="${src}" alt="${alt}" style="max-width: 100%; height: auto; display: block; margin: 1em auto; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); border: 1px solid #e2e8f0;" />`;
				});

				// Handle line breaks
				rendered = rendered.replace(/\n/g, '<br>');

				containerRef.current!.innerHTML = rendered;
			};

			const convertLatexToHtml = (formula: string) => {
				let html = formula;

				// Trigonometric functions
				html = html.replace(/\\sin/g, 'sin');
				html = html.replace(/\\cos/g, 'cos');
				html = html.replace(/\\tan/g, 'tan');
				html = html.replace(/\\cot/g, 'cot');
				html = html.replace(/\\sec/g, 'sec');
				html = html.replace(/\\csc/g, 'csc');

				// Logarithms
				html = html.replace(/\\log/g, 'log');
				html = html.replace(/\\ln/g, 'ln');

				// Limits
				html = html.replace(/\\lim/g, 'lim');
				html = html.replace(/\\to/g, '→');

				// Superscripts
				html = html.replace(/\^{([^}]+)}/g, '<sup>$1</sup>');
				html = html.replace(/\^(\w)/g, '<sup>$1</sup>');

				// Subscripts
				html = html.replace(/_{([^}]+)}/g, '<sub>$1</sub>');
				html = html.replace(/_(\w)/g, '<sub>$1</sub>');

				// Fractions
				html = html.replace(
					/\\frac{([^}]+)}{([^}]+)}/g,
					'<span class="fraction"><span class="numerator">$1</span><span class="denominator">$2</span></span>'
				);

				// Square roots
				html = html.replace(/\\sqrt{([^}]+)}/g, '√<span class="sqrt-content">$1</span>');
				html = html.replace(/\\sqrt/g, '√');

				// Integrals
				html = html.replace(
					/\\int_{([^}]+)}\^{([^}]+)}/g,
					'<span class="integral">∫<sub>$1</sub><sup>$2</sup></span>'
				);
				html = html.replace(/\\int/g, '∫');

				// Summation
				html = html.replace(
					/\\sum_{([^}]+)}\^{([^}]+)}/g,
					'<span class="summation">Σ<sub>$1</sub><sup>$2</sup></span>'
				);
				html = html.replace(/\\sum/g, 'Σ');

				// Greek letters
				html = html.replace(/\\alpha/g, 'α');
				html = html.replace(/\\beta/g, 'β');
				html = html.replace(/\\gamma/g, 'γ');
				html = html.replace(/\\delta/g, 'δ');
				html = html.replace(/\\epsilon/g, 'ε');
				html = html.replace(/\\theta/g, 'θ');
				html = html.replace(/\\lambda/g, 'λ');
				html = html.replace(/\\mu/g, 'μ');
				html = html.replace(/\\pi/g, 'π');
				html = html.replace(/\\sigma/g, 'σ');
				html = html.replace(/\\phi/g, 'φ');
				html = html.replace(/\\omega/g, 'ω');

				// Mathematical operators
				html = html.replace(/\\times/g, '×');
				html = html.replace(/\\div/g, '÷');
				html = html.replace(/\\pm/g, '±');
				html = html.replace(/\\leq/g, '≤');
				html = html.replace(/\\geq/g, '≥');
				html = html.replace(/\\neq/g, '≠');
				html = html.replace(/\\approx/g, '≈');
				html = html.replace(/\\infty/g, '∞');

				return html;
			};

			// Temporarily force fallback renderer for testing
			fallbackRender(content);
			return;

			const renderLatex = async () => {
				try {
					// Dynamically import MathLive
					const { MathfieldElement } = await import('mathlive');

					// Clear previous content
					containerRef.current!.innerHTML = '';

					// Split content by LaTeX delimiters
					const parts = content.split(/(\$\$.*?\$\$|\$.*?\$)/g);

					parts.forEach((part, index) => {
						if (part.startsWith('$$') && part.endsWith('$$')) {
							// Block math
							const latex = part.slice(2, -2);
							const mathField = document.createElement('math-field') as any;
							mathField.setValue(latex);
							mathField.setOptions({
								readOnly: true,
								virtualKeyboardMode: 'manual',
								smartFence: true,
								smartSuperscript: true,
								locale: 'uz',
							});
							mathField.style.display = 'block';
							mathField.style.margin = '1em 0';
							mathField.style.textAlign = 'center';
							containerRef.current!.appendChild(mathField);
						} else if (part.startsWith('$') && part.endsWith('$')) {
							// Inline math
							const latex = part.slice(1, -1);
							const mathField = document.createElement('math-field') as any;
							mathField.setValue(latex);
							mathField.setOptions({
								readOnly: true,
								virtualKeyboardMode: 'manual',
								smartFence: true,
								smartSuperscript: true,
								locale: 'uz',
							});
							mathField.style.display = 'inline';
							mathField.style.verticalAlign = 'middle';
							containerRef.current!.appendChild(mathField);
						} else if (part.trim()) {
							// Regular text
							const textNode = document.createElement('span');
							textNode.textContent = part;
							textNode.style.whiteSpace = 'pre-wrap';
							containerRef.current!.appendChild(textNode);
						}
					});
				} catch (error) {
					console.error('Error rendering LaTeX:', error);
					// Fallback to basic rendering
					fallbackRender(content);
				}
			};

			renderLatex();
		}
	}, [content]);

	return (
		<div
			ref={containerRef}
			className={`latex-container ${inline ? 'inline' : 'block'} ${className}`}
			style={{
				fontSize: inline ? 'inherit' : '1.1em',
				lineHeight: inline ? 'inherit' : '1.6',
			}}
		/>
	);
}

// Add CSS styles for LaTeX rendering
export const LaTeXStyles = () => (
	<style>{`
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

		.integral,
		.summation {
			font-size: 1.5em;
			vertical-align: middle;
		}

		sup,
		sub {
			font-size: 0.8em;
		}

		math-field {
			font-size: 1.2em;
			min-height: 1.5em;
		}

		math-field[readonly] {
			cursor: default;
		}

		/* Image styles */
		.latex-container img {
			max-width: 100%;
			height: auto;
			display: block;
			margin: 1em auto;
			border-radius: 8px;
			box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
			border: 1px solid #e2e8f0;
		}

		.latex-container img:hover {
			box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
			transform: translateY(-1px);
			transition: all 0.2s ease;
		}

		/* Responsive image handling */
		@media (max-width: 768px) {
			.latex-container img {
				margin: 0.5em auto;
				border-radius: 6px;
			}
		}
	`}</style>
);
