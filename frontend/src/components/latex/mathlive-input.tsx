'use client';
import React from 'react';

import { useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calculator, Eye, EyeOff, ImageIcon } from 'lucide-react';
import { MathRenderer } from '../math-renderer';
import { PanelFormulaDialog } from '@/components/modal/PanelFormulaDialog';
// import { LaTeXRenderer } from './latex-renderer';

interface MathLiveInputProps {
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	className?: string;
}

export function MathLiveInput({ value, onChange, placeholder, className }: MathLiveInputProps) {
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [isOpen, setIsOpen] = useState(false);
	const [showPreview, setShowPreview] = useState(true);
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
						return <span key={index} className='inline' dangerouslySetInnerHTML={{ __html: part }} />;
					}
				})}
			</div>
		);
	};

	const openMathEditor = () => {
		setIsOpen(true);
	};

	const insertFormula = (latex: string) => {
		if (latex.trim()) {
			const newValue = value + (value ? ' ' : '') + `$$${latex}$$`;
			onChange(newValue);
		}
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
			const imgTag = `<img src="${imageUrl}" alt="${fileName}" style="max-width:100%;height:auto;border-radius:6px;border:1px solid #eee;${
				width ? `width:${width}px;` : ''
			}${height ? `height:${height}px;` : ''}" />`;

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
				newValue =
					value +
					(value ? '\n\n' : '') +
					`<div class=\"img-row\" style=\"display:flex;flex-wrap:wrap;gap:8px;align-items:flex-start;margin-top:8px;\">${imgTag}</div>`;
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
				<PanelFormulaDialog
					open={isOpen}
					setOpen={setIsOpen}
					onInsert={insertFormula}
					initialValue={
						value
							.match(/\$\$(.*?)\$\$/g)
							?.pop()
							?.replace(/\$\$/g, '') || ''
					}
				/>
			</div>
		</div>
	);
}
