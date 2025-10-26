"use client";
import React from 'react';
// MathLivePreview component for rendering LaTeX using MathLive
function MathLivePreview({ latex, fontSize }: { latex: string; fontSize?: string }) {
	return (
		<math-field
			style={{ fontSize: fontSize || '18px', background: 'transparent', border: 'none', width: '100%',cursor:'pointer' }}
			tabIndex={-1}
			readOnly={true}
		>
			{latex}
		</math-field>
	);
}
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calculator, Eye, EyeOff, Copy, Check, ImageIcon, Plus } from 'lucide-react';
import { MathRenderer } from '../math-renderer';
// import { LaTeXRenderer } from './latex-renderer';

interface MathLiveElement extends HTMLElement {
	setValue: (value: string) => void;
	getValue: () => string;
	setOptions: (options: Record<string, unknown>) => void;
	executeCommand: (command: string[]) => void;
}

interface MathLiveInputProps {
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	className?: string;
}

export function MathLiveInput({ value, onChange, placeholder, className }: MathLiveInputProps) {
	const mathfieldRef = useRef<MathLiveElement | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [isOpen, setIsOpen] = useState(false);
	const [showPreview, setShowPreview] = useState(true);
	const [copied, setCopied] = useState(false);
	const [currentLatex, setCurrentLatex] = useState('');
	const [activeCategory, setActiveCategory] = useState('matematik');
    const renderVariantContent = (text: string) => {
        const parts = text.split(/(\$\$?[^$]+\$\$?)/g);

        return (
            <div className='inline-block w-full'>
                {parts.map((part, index) => {
                    if (part.includes('$')) {
                        return (
                            <span key={index} className='inline-block'>
                                <MathRenderer latex={part} />
                            </span>
                        );
                    } else {
                        return (
                            <span key={index} className='inline' dangerouslySetInnerHTML={{ __html: part }} />
                        );
                    }
                })}
            </div>
        );
    };
	useEffect(() => {
		// Dynamically import MathLive to avoid SSR issues
		const loadMathLive = async () => {
			if (typeof window !== 'undefined' && isOpen) {
				const { MathfieldElement } = await import('mathlive');

				if (mathfieldRef.current && !mathfieldRef.current.hasAttribute('data-initialized')) {
					const mathfield = mathfieldRef.current;

					// Configure MathLive
					mathfield.setOptions({
						virtualKeyboardMode: 'manual',
						smartFence: true,
						smartSuperscript: true,
						locale: 'uz',
					});

					// Set initial value
					if (currentLatex) {
						mathfield.setValue(currentLatex);
					}

					// Listen for changes
					mathfield.addEventListener('input', (event: Event) => {
						const target = event.target as MathLiveElement;
						const latex = target.getValue();
						setCurrentLatex(latex);
					});

					mathfield.setAttribute('data-initialized', 'true');
				}
			}
		};

		loadMathLive();
	}, [isOpen, currentLatex]);

	const openMathEditor = () => {
		setIsOpen(true);
		// Extract LaTeX from current value if it exists
		const latexMatch = value.match(/\$\$(.*?)\$\$/g);
		if (latexMatch && latexMatch.length > 0) {
			const latex = latexMatch[latexMatch.length - 1].replace(/\$\$/g, '');
			setCurrentLatex(latex);
		}
	};

	 const insertFormula = () => {
		 if (currentLatex.trim()) {
			 // Improved: Do NOT add spaces inside LaTeX commands or braces
			 let cleanedLatex = currentLatex.trim();

			 // Protect LaTeX commands and groups
			 cleanedLatex = cleanedLatex.replace(/(\\[a-zA-Z]+|\{[^}]*\}|\[[^\]]*\]|\([^)]+\))/g, (m) => `§${m}§`);

			 // Only add spaces between variables/numbers and operators outside protected regions
			 cleanedLatex = cleanedLatex.replace(/([a-zA-Z0-9])([+\-*/=])([a-zA-Z0-9])/g, (m, p1, p2, p3) => {
				 // If any part is protected, skip
				 if (p1.includes('§') || p2.includes('§') || p3.includes('§')) return m;
				 return `${p1} ${p2} ${p3}`;
			 });
			 cleanedLatex = cleanedLatex.replace(/([+\-*/=])([a-zA-Z0-9])/g, (m, p1, p2) => {
				 if (p1.includes('§') || p2.includes('§')) return m;
				 return `${p1} ${p2}`;
			 });
			 cleanedLatex = cleanedLatex.replace(/([a-zA-Z0-9])([+\-*/=])/g, (m, p1, p2) => {
				 if (p1.includes('§') || p2.includes('§')) return m;
				 return `${p1} ${p2}`;
			 });
			 cleanedLatex = cleanedLatex.replace(/\s+/g, ' ');

			 // Restore protected LaTeX commands and groups
			 cleanedLatex = cleanedLatex.replace(/§(.*?)§/g, (m, g1) => g1);

			 const newValue = value + (value ? ' ' : '') + `$$${cleanedLatex}$$`;
			 onChange(newValue);
			 setIsOpen(false);
			 setCurrentLatex('');
		 }
	 };

	const copyLatex = async () => {
		if (currentLatex) {
			await navigator.clipboard.writeText(currentLatex);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		}
	};

	const formulaCategories = {
        default: [],

		matematik: [
			{ name: 'Kvadrat', latex: 'x^2' },
			{ name: 'Kasr', latex: '\\frac{a}{b}' },
			{ name: 'Ildiz', latex: '\\sqrt{x}' },
			{ name: 'Integral', latex: '\\int_{0}^{1} f(x)dx' },
			{ name: "Yig'indi", latex: '\\sum_{i=1}^{n} x_i' },
			{ name: 'Limit', latex: '\\lim_{x \\to \\infty} f(x)' },
			{ name: 'Logarifm', latex: '\\log_{a} b' },
			{ name: 'Trigonometriya', latex: '\\sin(x) + \\cos(x)' },
			{ name: 'Tenglama', latex: '\\sin(x) + \\cos(x) - 9 = 14' },
			{ name: 'Sinus', latex: '\\sin(x)' },
			{ name: 'Kosinus', latex: '\\cos(x)' },
			{ name: 'Tangens', latex: '\\tan(x)' },
			{ name: 'Kotangens', latex: '\\cot(x)' },
			{ name: 'Sekans', latex: '\\sec(x)' },
			{ name: 'Kosekans', latex: '\\csc(x)' },
			{ name: 'Arksinus', latex: '\\arcsin(x)' },
			{ name: 'Arkkosinus', latex: '\\arccos(x)' },
			{ name: 'Arktangens', latex: '\\arctan(x)' },
			{ name: 'Giperbolik sinus', latex: '\\sinh(x)' },
			{ name: 'Giperbolik kosinus', latex: '\\cosh(x)' },
			{ name: 'Giperbolik tangens', latex: '\\tanh(x)' },
			{ name: 'Limit cheksizlik', latex: '\\lim_{x \\to \\infty} f(x)' },
			{ name: 'Differensial', latex: '\\frac{d}{dx}f(x)' },
			{ name: 'Ikkinchi tartib', latex: '\\frac{d^2}{dx^2}f(x)' },
			{ name: 'Aniq integral', latex: '\\int_{a}^{b} f(x)dx' },
			{ name: 'Cheksiz integral', latex: '\\int f(x)dx' },
			{ name: 'Qismiy hosila', latex: '\\frac{\\partial}{\\partial x}f(x,y)' },
			{ name: 'Ikki tomonlama integral', latex: '\\iint_D f(x,y)dxdy' },
			{ name: 'Uch tomonlama integral', latex: '\\iiint_V f(x,y,z)dxdydz' },
		],
		fizika: [
			{ name: 'Nyuton qonuni', latex: 'F = ma' },
			{ name: 'Eynshteyn formulasi', latex: 'E = mc^2' },
			{ name: 'Tezlik', latex: 'v = \\frac{s}{t}' },
			{ name: 'Tezlanish', latex: 'a = \\frac{\\Delta v}{\\Delta t}' },
			{ name: 'Kinetik energiya', latex: 'E_k = \\frac{1}{2}mv^2' },
			{ name: 'Potensial energiya', latex: 'E_p = mgh' },
			{ name: 'Om qonuni', latex: 'V = IR' },
			{ name: 'Quvvat', latex: 'P = \\frac{W}{t}' },
			{ name: 'Tortishish kuchi', latex: 'F = G\\frac{m_1 m_2}{r^2}' },
			{ name: "Yorug'lik tezligi", latex: 'c = 3 \\times 10^8 \\text{ m/s}' },
			{ name: 'Impuls', latex: 'p = mv' },
			{ name: 'Kinematik tenglama', latex: 's = v_0t + \\frac{1}{2}at^2' },
			{ name: 'Energiya saqlanish', latex: 'E_1 = E_2' },
			{ name: 'Momentum saqlanish', latex: 'p_1 = p_2' },
			{ name: 'Dalgacha tezlik', latex: 'v = \\lambda f' },
		],
		kimyo: [
			{ name: '', latex: 'H_2O' },
			{ name: 'Karbonat angidrid', latex: 'CO_2' },
			{ name: 'Ammiak', latex: 'NH_3' },
			{ name: 'Sulfat kislota', latex: 'H_2SO_4' },
			{ name: 'Natriy xlorid', latex: 'NaCl' },
			{ name: 'Metan', latex: 'CH_4' },
			{ name: 'Etanol', latex: 'C_2H_5OH' },
			{ name: 'Glukoza', latex: 'C_6H_{12}O_6' },
			{ name: 'Kalsiy karbonat', latex: 'CaCO_3' },
			{ name: 'Azot kislota', latex: 'HNO_3' },
			{ name: 'Reaksiya', latex: 'A + B \\rightarrow C + D' },
			{ name: 'Ionlanish', latex: 'AB \\rightleftharpoons A^+ + B^-' },
			{ name: 'Kimyoviy tenglama', latex: '2H_2 + O_2 \\rightarrow 2H_2O' },
			{ name: 'Katalizator', latex: 'A + B \\xrightarrow{K} C + D' },
			{ name: 'Teng muvozanat', latex: 'K = \\frac{[C][D]}{[A][B]}' },
			{ name: 'pH hisoblash', latex: 'pH = -\\log[H^+]' },
			{ name: 'Konsentratsiya', latex: 'C = \\frac{n}{V}' },
		],
		yunon: [
			{ name: 'Alpha', latex: '\\alpha' },
			{ name: 'Beta', latex: '\\beta' },
			{ name: 'Gamma', latex: '\\gamma' },
			{ name: 'Delta', latex: '\\delta' },
			{ name: 'Epsilon', latex: '\\epsilon' },
			{ name: 'Zeta', latex: '\\zeta' },
			{ name: 'Eta', latex: '\\eta' },
			{ name: 'Theta', latex: '\\theta' },
			{ name: 'Iota', latex: '\\iota' },
			{ name: 'Kappa', latex: '\\kappa' },
			{ name: 'Lambda', latex: '\\lambda' },
			{ name: 'Mu', latex: '\\mu' },
			{ name: 'Nu', latex: '\\nu' },
			{ name: 'Xi', latex: '\\xi' },
			{ name: 'Pi', latex: '\\pi' },
			{ name: 'Rho', latex: '\\rho' },
			{ name: 'Sigma', latex: '\\sigma' },
			{ name: 'Tau', latex: '\\tau' },
			{ name: 'Phi', latex: '\\phi' },
			{ name: 'Chi', latex: '\\chi' },
			{ name: 'Psi', latex: '\\psi' },
			{ name: 'Omega', latex: '\\omega' },
			{ name: 'Katta Gamma', latex: '\\Gamma' },
			{ name: 'Katta Delta', latex: '\\Delta' },
			{ name: 'Katta Theta', latex: '\\Theta' },
			{ name: 'Katta Lambda', latex: '\\Lambda' },
			{ name: 'Katta Pi', latex: '\\Pi' },
			{ name: 'Katta Sigma', latex: '\\Sigma' },
			{ name: 'Katta Phi', latex: '\\Phi' },
			{ name: 'Katta Psi', latex: '\\Psi' },
			{ name: 'Katta Omega', latex: '\\Omega' },
			{ name: 'E soni', latex: 'e' },
			{ name: 'Pi soni', latex: '\\pi' },
			{ name: 'Ildiz 2', latex: '\\sqrt{2}' },
			{ name: 'Ildiz 3', latex: '\\sqrt{3}' },
			{ name: 'Ildiz 5', latex: '\\sqrt{5}' },
			{ name: 'Golden ratio', latex: '\\phi = \\frac{1 + \\sqrt{5}}{2}' },
			{ name: 'Euler-Mascheroni', latex: '\\gamma' },
			{ name: 'Catalan soni', latex: 'G' },
			{ name: 'Apery soni', latex: '\\zeta(3)' },
		],
		belgilar: [
			{ name: 'Cheksizlik', latex: '\\infty' },
			{ name: 'Plusminus', latex: '\\pm' },
			{ name: 'Teng emas', latex: '\\neq' },
			{ name: 'Katta yoki teng', latex: '\\geq' },
			{ name: 'Kichik yoki teng', latex: '\\leq' },
			{ name: 'Taxminan', latex: '\\approx' },
			{ name: 'Proporsional', latex: '\\propto' },
			{ name: 'Cheksiz kichik', latex: '\\partial' },
			{ name: 'Nabla', latex: '\\nabla' },
			{ name: 'Integral', latex: '\\int' },
			{ name: 'Gradient', latex: '\\nabla f' },
			{ name: 'Divergensiya', latex: '\\nabla \\cdot \\vec{F}' },
			{ name: 'Rotatsiya', latex: '\\nabla \\times \\vec{F}' },
			{ name: 'Laplasian', latex: '\\nabla^2 f' },
			{ name: 'Delta operator', latex: '\\Delta' },
			{ name: 'Hessian', latex: 'H(f)' },
			{ name: 'Jacobian', latex: 'J(f)' },
			{ name: 'Ikki tomonlama integral', latex: '\\iint' },
			{ name: 'Uch tomonlama integral', latex: '\\iiint' },
			{ name: 'Yopiq integral', latex: '\\oint' },
			{ name: "Yig'indi", latex: '\\sum' },
			{ name: "Ko'paytma", latex: '\\prod' },
			{ name: 'Faktorial', latex: 'n!' },
			{ name: 'Kombinatsiya', latex: 'C(n,k)' },
			{ name: 'Permutatsiya', latex: 'P(n,k)' },
			{ name: 'Binomial', latex: '\\binom{n}{k}' },
			{ name: 'Modul', latex: '|x|' },
			{ name: 'Floor', latex: '\\lfloor x \\rfloor' },
			{ name: 'Ceiling', latex: '\\lceil x \\rceil' },
			{ name: 'Birlashma', latex: '\\cup' },
			{ name: 'Kesishma', latex: '\\cap' },
			{ name: 'Ichida', latex: '\\in' },
			{ name: 'Ichida emas', latex: '\\notin' },
			{ name: 'Subset', latex: '\\subset' },
			{ name: 'Superset', latex: '\\supset' },
			{ name: "Bo'sh to'plam", latex: '\\emptyset' },
			{ name: 'Forall', latex: '\\forall' },
			{ name: 'Exists', latex: '\\exists' },
			{ name: "O'ng strelka", latex: '\\rightarrow' },
			{ name: 'Chap strelka', latex: '\\leftarrow' },
			{ name: 'Ikki tomonlama strelka', latex: '\\leftrightarrow' },
			{ name: 'Yuqori strelka', latex: '\\uparrow' },
			{ name: 'Pastki strelka', latex: '\\downarrow' },
			{ name: "Chap o'ng strelka", latex: '\\leftrightarrow' },
			{ name: 'Chap strelka', latex: '\\leftarrow' },
			{ name: "O'ng strelka", latex: '\\rightarrow' },
			{ name: 'Cheksizlik', latex: '\\infty' },
			{ name: "Bo'sh to'plam", latex: '\\emptyset' },
			{ name: 'Element', latex: '\\in' },
			{ name: 'Element emas', latex: '\\notin' },
			{ name: 'Subset', latex: '\\subset' },
			{ name: 'Superset', latex: '\\supset' },
			{ name: 'Birlashma', latex: '\\cup' },
			{ name: 'Kesishma', latex: '\\cap' },
		],
	};

	const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (file) {
			// Validate file type
			if (!file.type.startsWith('image/')) {
				alert('Iltimos, faqat rasm fayllarini yuklang (PNG, JPG, JPEG, GIF)');
				return;
			}

			// Validate file size (max 5MB for base64)
			if (file.size > 5 * 1024 * 1024) {
				alert("Rasm hajmi 5MB dan katta bo'lishi mumkin emas");
				return;
			}

			const reader = new FileReader();
			reader.onload = (e) => {
				const imageUrl = e.target?.result as string;

				// Show image size adjustment modal
				showImageSizeModal(imageUrl, file.name);
			};

			reader.onerror = () => {
				alert("Rasm yuklashda xatolik yuz berdi. Iltimos, qayta urinib ko'ring.");
			};

			reader.readAsDataURL(file);

			// Reset file input
			event.target.value = '';
		}
	};

	const showImageSizeModal = (imageUrl: string, fileName: string) => {
		// Create modal for image size adjustment
		const modal = document.createElement('div');
		modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50';
		modal.innerHTML = `
			<div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
				<h3 class="text-lg font-semibold mb-4">Rasm o'lchamini sozlash</h3>
				<div class="mb-4">
					<img src="${imageUrl}" alt="${fileName}" class="max-w-full h-auto border rounded" />
				</div>
				<div class="grid grid-cols-2 gap-4 mb-4">
					<div>
						<label class="block text-sm font-medium mb-1">Kenglik (px)</label>
						<input type="number" id="imgWidth" class="w-full border rounded px-3 py-2" placeholder="Avtomatik" />
					</div>
					<div>
						<label class="block text-sm font-medium mb-1">Balandlik (px)</label>
						<input type="number" id="imgHeight" class="w-full border rounded px-3 py-2" placeholder="Avtomatik" />
					</div>
				</div>
				<div class="flex gap-2">
					<button id="btnCancel" class="flex-1 px-4 py-2 border rounded hover:bg-gray-50">Bekor qilish</button>
					<button id="btnAdd" class="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Qo'shish</button>
				</div>
			</div>
		`;

		document.body.appendChild(modal);

		// Get elements
		const widthInput = modal.querySelector('#imgWidth') as HTMLInputElement;
		const heightInput = modal.querySelector('#imgHeight') as HTMLInputElement;
		const btnCancel = modal.querySelector('#btnCancel') as HTMLButtonElement;
		const btnAdd = modal.querySelector('#btnAdd') as HTMLButtonElement;

		// Load original image to get dimensions
		const img = new Image();
		img.onload = () => {
			widthInput.placeholder = img.width.toString();
			heightInput.placeholder = img.height.toString();
		};
		img.src = imageUrl;

		// Handle cancel
		btnCancel.onclick = () => {
			document.body.removeChild(modal);
		};

		// Handle add image with custom size
		btnAdd.onclick = () => {
			const width = widthInput.value;
			const height = heightInput.value;


			// Build <img> tag with optional width/height
			const imgTag = `<img src="${imageUrl}" alt="${fileName}" style="max-width:100%;height:auto;border-radius:6px;border:1px solid #eee;${width ? `width:${width}px;` : ''}${height ? `height:${height}px;` : ''}" />`;

			// Check if value already contains an img-row div
			let newValue = value;
			const imgRowRegex = /<div class=\"img-row\"[^>]*>([\s\S]*?)<\/div>/;
			if (imgRowRegex.test(value)) {
				// Append to existing img-row
				newValue = value.replace(imgRowRegex, (match, imgs) => {
					return `<div class=\"img-row\" style=\"display:flex;flex-wrap:wrap;gap:8px;align-items:flex-start;margin-top:8px;\">${imgs}${imgTag}</div>`;
				});
			} else {
				// Create new img-row div
				newValue = value + (value ? '\n\n' : '') + `<div class=\"img-row\" style=\"display:flex;flex-wrap:wrap;gap:8px;align-items:flex-start;margin-top:8px;\">${imgTag}</div>`;
			}
			onChange(newValue);

			// Close modal
			document.body.removeChild(modal);

			// Show success message
			console.log("Rasm muvaffaqiyatli qo'shildi:", fileName);
		};
	};

	const openImageUpload = () => {
		fileInputRef.current?.click();
	};

	const compressImage = (file: File, maxSizeMB: number = 1): Promise<File> => {
		return new Promise((resolve) => {
			const canvas = document.createElement('canvas');
			const ctx = canvas.getContext('2d')!;
			const img = new Image();

			img.onload = () => {
				// Calculate new dimensions while maintaining aspect ratio
				let { width, height } = img;
				const maxDimension = 1200; // Max width/height

				if (width > height && width > maxDimension) {
					height = (height * maxDimension) / width;
					width = maxDimension;
				} else if (height > maxDimension) {
					width = (width * maxDimension) / height;
					height = maxDimension;
				}

				canvas.width = width;
				canvas.height = height;

				// Draw and compress image
				ctx.drawImage(img, 0, 0, width, height);

				// Convert to blob with quality 0.8 (80%)
				canvas.toBlob(
					(blob) => {
						if (blob) {
							const compressedFile = new File([blob], file.name, {
								type: 'image/jpeg',
								lastModified: Date.now(),
							});
							resolve(compressedFile);
						} else {
							resolve(file);
						}
					},
					'image/jpeg',
					0.8
				);
			};

			img.src = URL.createObjectURL(file);
		});
	};

	const handlePaste = async (event: React.ClipboardEvent) => {
		const items = event.clipboardData?.items;
		if (!items) return;

		for (let i = 0; i < items.length; i++) {
			const item = items[i];

			// Check if the pasted item is an image
			if (item.type.startsWith('image/')) {
				event.preventDefault();

				const file = item.getAsFile();
				if (file) {
					// Validate file size (max 5MB for base64)
					if (file.size > 5 * 1024 * 1024) {
						alert("Rasm hajmi 5MB dan katta bo'lishi mumkin emas");
						return;
					}

					const reader = new FileReader();
					reader.onload = (e) => {
						const imageUrl = e.target?.result as string;

						// Show image size adjustment modal
						showImageSizeModal(imageUrl, `Pasted_${Date.now()}.png`);
					};

					reader.onerror = () => {
						alert("Rasm yuklashda xatolik yuz berdi. Iltimos, qayta urinib ko'ring.");
					};

					reader.readAsDataURL(file);
				}
				break;
			}
		}
	};

	const insertQuickFormula = (latex: string) => {
		if (mathfieldRef.current) {
			mathfieldRef.current.executeCommand(['insert', latex]);
		}
	};

	return (
		<div className={className}>
			<div className='space-y-4'>
				{/* Main Input Area */}
				<div className='border rounded-lg p-3 min-h-[100px] bg-background'>
					<textarea
						value={value}
						onChange={(e) => onChange(e.target.value)}
						onPaste={handlePaste}
						placeholder={placeholder || "Matn kiriting. Formula yoki rasm qo'shish uchun tugmalarni bosing"}
						className='w-full h-20 resize-none border-none outline-none bg-transparent'
					/>

					{/* Action Buttons */}
					<div className='flex items-center justify-between mt-2 pt-2 border-t'>
						<div className='flex items-center gap-2'>
							<Button
								type='button'
								variant='outline'
								size='sm'
								onClick={openMathEditor}
								className='flex items-center gap-2 bg-transparent'
							>
								<Calculator className='h-4 w-4' />
								Formula qo'shish
							</Button>

							{/* Image Upload Button */}
							<Button
								type='button'
								variant='outline'
								size='sm'
								onClick={openImageUpload}
								className='flex items-center gap-2 bg-transparent'
							>
								<ImageIcon className='h-4 w-4' />
								Rasm qo'shish
							</Button>

							{/* Paste Button */}
							<Button
								type='button'
								variant='outline'
								size='sm'
								onClick={() => {
									// Focus on textarea and show paste hint
									const textarea = document.querySelector('textarea');
									if (textarea) {
										textarea.focus();
										// Show a brief hint about pasting
										const hint = document.createElement('div');
										hint.className =
											'fixed top-4 right-4 bg-blue-600 text-white px-4 py-2 rounded shadow-lg z-50';
										hint.textContent = 'Ctrl+V yoki Cmd+V bilan rasmni yopishtiring';
										document.body.appendChild(hint);
										setTimeout(() => document.body.removeChild(hint), 3000);
									}
								}}
								className='flex items-center gap-2 bg-transparent'
							>
								<svg className='h-4 w-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
									<path
										strokeLinecap='round'
										strokeLinejoin='round'
										strokeWidth={2}
										d='M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2'
									/>
								</svg>
								Paste
							</Button>

							{/* Hidden file input */}
							<input
								ref={fileInputRef}
								type='file'
								accept='image/*'
								onChange={handleImageUpload}
								className='hidden'
							/>
						</div>

						{showPreview && (
							<Button
								type='button'
								variant='ghost'
								size='sm'
								onClick={() => setShowPreview(!showPreview)}
							>
								{showPreview ? <EyeOff className='h-4 w-4' /> : <Eye className='h-4 w-4' />}
							</Button>
						)}
					</div>
				</div>

				{/* Preview */}
				{showPreview && value && (
					<Card>
						<CardHeader className='pb-2'>
							<CardTitle className='text-sm'>Ko'rinish:</CardTitle>
						</CardHeader>
						<CardContent>
							{/* If value contains HTML tags, render as HTML; otherwise, use MathLivePreview */}
						{renderVariantContent(value)}
						</CardContent>
					</Card>
				)}

				{/* MathLive Editor Modal */}
				{isOpen && (
					<div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4'>
						<Card className='w-full max-w-6xl h-[95vh] flex flex-col'>
							<CardHeader className='flex flex-row items-center justify-between flex-shrink-0'>
								<CardTitle className='flex items-center gap-2'>
									<Calculator className='h-5 w-5' />
									Formula va belgilar paneli
								</CardTitle>
								<div className='flex items-center gap-2'>
									<Button variant='outline' size='sm' onClick={copyLatex} disabled={!currentLatex}>
										{copied ? <Check className='h-4 w-4' /> : <Copy className='h-4 w-4' />}
										{copied ? 'Nusxalandi' : 'LaTeX nusxalash'}
									</Button>
									<Button variant='outline' size='sm' onClick={() => setIsOpen(false)}>
										Yopish
									</Button>
								</div>
							</CardHeader>

							<CardContent className='flex-1 overflow-hidden flex flex-col space-y-4'>
								{/* Category Tabs */}
								<div className='flex-shrink-0'>
									<h4 className='text-sm font-medium mb-2'>Kategoriyalar:</h4>
									<div className='flex gap-2 mb-3 flex-wrap'>
										{Object.keys(formulaCategories).map((category) => (
											<Button
												key={category}
												variant={activeCategory === category ? 'default' : 'outline'}
												size='sm'
												onClick={() => setActiveCategory(category)}
												className='capitalize'
											>
												{category === 'yunon'
													? 'Yunon harflari'
													: category === 'belgilar'
													? 'Matematik belgilar'
													: category}
											</Button>
										))}
									</div>

									{/* Quick Formulas/Symbols */}
									<div
										className={`grid gap-2 border rounded-lg p-2 overflow-y-auto ${
											activeCategory === 'kimyo' || activeCategory === 'belgilar'
												? 'grid-cols-3 md:grid-cols-5 lg:grid-cols-7 max-h-64'
												: 'grid-cols-2 md:grid-cols-4 lg:grid-cols-6 max-h-32'
										}`}
									>
										 {formulaCategories[activeCategory as keyof typeof formulaCategories].map(
										 (formula, index) => (
										<button
											key={index}
											type='button'
											onClick={() => insertQuickFormula(formula.latex)}
											className='text-xs h-auto p-2 flex flex-col items-center gap-1 border relative rounded bg-background hover:bg-muted transition cursor-pointer'
										>
											<div className='text-xs'>
												<MathLivePreview latex={formula.latex} fontSize='18px' />
											</div>
                                            <div className='absolute bottom-1 right-1 opacity-50 bg-primary/10 rounded-full p-1'>
                                                <Plus className='h-4 w-4' />
                                            </div>
										</button>
										 )
										 )}
									</div>
								</div>

								{/* Scrollable Content Area */}
								<div className='flex-1 overflow-y-auto space-y-4 pr-2'>
									{/* MathLive Editor */}
									<div className='border rounded-lg p-4 bg-white'>
										<math-field
											ref={mathfieldRef}
											style={{
												fontSize: '24px',
												padding: '8px',
												border: '1px solid #e2e8f0',
												borderRadius: '6px',
												minHeight: '60px',
												width: '100%',
											}}
										/>
									</div>

									{/* LaTeX Code */}
									{currentLatex && (
										<div className='border rounded-lg p-4 bg-muted/50'>
											<h4 className='text-sm font-medium mb-2'>LaTeX kodi:</h4>
											<code className='text-sm font-mono bg-background p-2 rounded block'>
												{currentLatex}
											</code>
										</div>
									)}
								</div>

								{/* Action Buttons - Always visible at bottom */}
								<div className='flex justify-end gap-2 pt-4 border-t flex-shrink-0'>
									<Button variant='outline' onClick={() => setIsOpen(false)}>
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
	);
}
