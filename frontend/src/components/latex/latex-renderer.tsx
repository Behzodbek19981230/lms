'use client';
import { useEffect, useRef } from 'react';

let mathJaxLoadPromise: Promise<void> | null = null;

async function ensureMathJax() {
	if (typeof window === 'undefined') return;
	if ((window as any).MathJax?.typesetPromise) return;
	if (mathJaxLoadPromise) return mathJaxLoadPromise;

	mathJaxLoadPromise = new Promise<void>((resolve, reject) => {
		(window as any).MathJax = {
			tex: {
				inlineMath: [
					['$', '$'],
					['\\(', '\\)'],
				],
				displayMath: [
					['$$', '$$'],
					['\\[', '\\]'],
				],
				processEscapes: true,
				processEnvironments: true,
				packages: { '[+]': ['ams'] },
			},
			options: {
				skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre'],
			},
			startup: {
				typeset: false,
			},
		};

		const script = document.createElement('script');
		script.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js';
		script.async = true;
		script.onload = () => resolve();
		script.onerror = () => reject(new Error('Failed to load MathJax'));
		document.head.appendChild(script);
	});

	return mathJaxLoadPromise;
}

interface LaTeXRendererProps {
	content: string;
	className?: string;
	inline?: boolean;
}

export function LaTeXRenderer({ content, className = '', inline = false }: LaTeXRendererProps) {
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!containerRef.current) return;
		if (!content) {
			containerRef.current.innerHTML = '';
			return;
		}

		const render = async () => {
			// 1) Render text/images as HTML (keep $...$ / $$...$$ for MathJax)
			let rendered = String(content);

			// If it's only a raw latex command, wrap it so MathJax can pick it up
			const looksLikeRawLatex = /^\\(begin|frac|sqrt|sum|int|sin|cos|tan|lim)\b/.test(rendered.trim());
			if (looksLikeRawLatex && !/[\$]/.test(rendered)) {
				rendered = inline ? `$${rendered}$` : `$$${rendered}$$`;
			}

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

			// Line breaks
			rendered = rendered.replace(/\n/g, '<br>');

			containerRef.current!.innerHTML = rendered;

			// 2) Typeset math
			try {
				await ensureMathJax();
				const MJ = (window as any).MathJax;
				if (MJ?.typesetClear) MJ.typesetClear([containerRef.current]);
				if (MJ?.typesetPromise) await MJ.typesetPromise([containerRef.current]);
			} catch (e) {
				// Keep HTML as-is if MathJax fails
				// (user will at least see the latex code)
			}
		};

		render();
	}, [content, inline]);

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
