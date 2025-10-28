'use client';

import type React from 'react';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { MathRenderer } from '@/components/math-renderer';
import { Edit, Trash2, ImageIcon, Plus, Calculator } from 'lucide-react';
import { MathPopup } from '@/components/math-popup';
import { request } from '@/configs/request';

interface MathFormula {
    id: string;
	latex: string;
	position?: number;
}

interface UploadedImage {
    id: string;
	url: string;
	name: string;
	position?: number;
}

interface QuestionVariant {
	id: string;
	text: string;
	isCorrect: boolean;
}

interface MathQuestionEditorProps {
	questionId?: string;
	mode?: 'create' | 'edit';
}

export function MathQuestionEditor({ questionId, mode = 'create' }: MathQuestionEditorProps) {
	const [currentStep, setCurrentStep] = useState(1);
	const [question, setQuestion] = useState('');
	const [showMathPopup, setShowMathPopup] = useState(false);
	const [editingFormula, setEditingFormula] = useState<MathFormula | null>(null);
	const [formulas, setFormulas] = useState<MathFormula[]>([]);
	const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
	const [variants, setVariants] = useState<QuestionVariant[]>([
		{ id: 'variant-a', text: '', isCorrect: true },
		{ id: 'variant-b', text: '', isCorrect: false },
		{ id: 'variant-c', text: '', isCorrect: false },
		{ id: 'variant-d', text: '', isCorrect: false },
	]);
	const [isSaving, setIsSaving] = useState(false);
	const [saveMessage, setSaveMessage] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const [editingVariantFormula, setEditingVariantFormula] = useState<{
		variantId: string;
		formula: MathFormula | null;
	}>({ variantId: '', formula: null });
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const [cursorPosition, setCursorPosition] = useState(0);
	const [variantCursorPositions, setVariantCursorPositions] = useState<Record<string, number>>({});
	const variantTextareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

	useEffect(() => {
		if (mode === 'edit' && questionId) {
			const questionData = (window as any).question;
			setQuestion(questionData.question || '');

			const mappedVariants = questionData.variants?.map((variant: any, index: number) => ({
				id: `variant-${String.fromCharCode(97 + index)}`, // a, b, c, d
				text: variant.text || '',
				isCorrect: variant.is_correct || false,
			})) || [
				{ id: 'variant-a', text: '', isCorrect: true },
				{ id: 'variant-b', text: '', isCorrect: false },
				{ id: 'variant-c', text: '', isCorrect: false },
				{ id: 'variant-d', text: '', isCorrect: false },
			];

			setVariants(mappedVariants);
			setFormulas(Array.isArray(questionData.formulas) ? questionData.formulas : []);
			setUploadedImages(Array.isArray(questionData.images) ? questionData.images : []);
		}
	}, [mode]);

	useEffect(() => {
		const formulaRegex = /\$\$?([^$]+)\$\$?/g;
		const foundFormulas: MathFormula[] = [];
		let match;

		while ((match = formulaRegex.exec(question)) !== null) {
			foundFormulas.push({
				id: Math.random().toString(36).substr(2, 9),
				latex: match[1].trim(),
				position: match.index,
			});
		}
		setFormulas(foundFormulas);
	}, [question]);

	useEffect(() => {
		const imageRegex = /\[IMAGE:([^\]]+)\]/g;
		const foundImages: UploadedImage[] = [];
		let match;

		while ((match = imageRegex.exec(question)) !== null) {
			const existingImage = uploadedImages.find((img) => img.url === match[1]);
			if (existingImage) {
				foundImages.push({
					...existingImage,
					position: match.index,
				});
			}
		}
		setUploadedImages((prev) => {
			if (!Array.isArray(prev)) {
				prev = [];
			}
			const newImages = foundImages.filter((img) => !prev.some((p) => p.id === img.id));
			return [...prev.filter((img) => foundImages.some((f) => f.id === img.id)), ...newImages];
		});
	}, [question]);

	const handleInsertFormula = (latex: string) => {
		if (editingFormula) {
			const oldFormula = `$${editingFormula.latex}$`;
			const newFormula = `$${latex}$`;
			const newQuestion = question.replace(oldFormula, newFormula);
			setQuestion(newQuestion);
			setEditingFormula(null);
		} else {
			const beforeCursor = question.substring(0, cursorPosition);
			const afterCursor = question.substring(cursorPosition);
			const newFormula = `$${latex}$ `;
			const newQuestion = beforeCursor + newFormula + afterCursor;
			setQuestion(newQuestion);

			setTimeout(() => {
				if (textareaRef.current) {
					const newPosition = cursorPosition + newFormula.length;
					textareaRef.current.setSelectionRange(newPosition, newPosition);
					textareaRef.current.focus();
				}
			}, 0);
		}
		setShowMathPopup(false);
	};

	const handleEditFormula = (formula: MathFormula) => {
		setEditingFormula(formula);
		setShowMathPopup(true);
	};

	const handleDeleteFormula = (formula: MathFormula) => {
		const formulaText = `$${formula.latex}$`;
		const newQuestion = question.replace(formulaText, '');
		setQuestion(newQuestion);
	};

	const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		setQuestion(e.target.value);
		setCursorPosition(e.target.selectionStart);
	};

	const handleTextareaClick = (e: React.MouseEvent<HTMLTextAreaElement>) => {
		setCursorPosition((e.target as HTMLTextAreaElement).selectionStart);
	};

	const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			const imageUrl = URL.createObjectURL(file);
			const imageId = Math.random().toString(36).substr(2, 9);

			const newImage: UploadedImage = {
				id: imageId,
				url: imageUrl,
				name: file.name,
				position: cursorPosition,
			};

			setUploadedImages((prev) => [...prev, newImage]);

			const beforeCursor = question.substring(0, cursorPosition);
			const afterCursor = question.substring(cursorPosition);
			const imagePlaceholder = `[IMAGE:${imageUrl}]`;
			const newQuestion = beforeCursor + imagePlaceholder + afterCursor;
			setQuestion(newQuestion);

			setTimeout(() => {
				if (textareaRef.current) {
					const newPosition = cursorPosition + imagePlaceholder.length;
					textareaRef.current.setSelectionRange(newPosition, newPosition);
					textareaRef.current.focus();
				}
			}, 0);
		}
	};

	const deleteImage = (imageId: string) => {
		const image = uploadedImages.find((img) => img.id === imageId);
		if (image) {
			const imagePlaceholder = `[IMAGE:${image.url}]`;
			const newQuestion = question.replace(imagePlaceholder, '');
			setQuestion(newQuestion);
			setUploadedImages((prev) => prev.filter((img) => img.id !== imageId));
			URL.revokeObjectURL(image.url);
		}
	};

	const renderQuestionContent = (content: string) => {
		const parts = content.split(/(\[IMAGE:[^\]]+\]|\$\$?[^$]+\$\$?)/g);

		return (
			<div className='inline-block w-full'>
				{parts.map((part, index) => {
					if (part.startsWith('[IMAGE:') && part.endsWith(']')) {
						const imageUrl = part.slice(7, -1);
						return (
							<div key={index} className='my-4 flex justify-center'>
								<img
									src={imageUrl || '/placeholder.svg'}
									alt='Uploaded content'
									className='max-w-full max-h-64 rounded-lg border shadow-sm'
								/>
							</div>
						);
					} else if (part.includes('$')) {
						return (
							<span key={index} className='inline-block'>
								<MathRenderer latex={part} />
							</span>
						);
					} else {
						return (
							<span key={index} className='inline'>
								{part}
							</span>
						);
					}
				})}
			</div>
		);
	};

	const handleVariantFormulaInsert = (latex: string) => {
		if (editingVariantFormula.variantId) {
			if (editingVariantFormula.formula) {
				const variant = variants.find((v) => v.id === editingVariantFormula.variantId);
				if (variant && editingVariantFormula.formula) {
					const oldFormula = `$${editingVariantFormula.formula.latex}$`;
					const newFormula = `$${latex}$`;
					const newText = variant.text.replace(oldFormula, newFormula);
					updateVariantText(editingVariantFormula.variantId, newText);
				}
			} else {
				const variant = variants.find((v) => v.id === editingVariantFormula.variantId);
				const cursorPos = variantCursorPositions[editingVariantFormula.variantId] || 0;
				if (variant) {
					const beforeCursor = variant.text.substring(0, cursorPos);
					const afterCursor = variant.text.substring(cursorPos);
					const newFormula = `$${latex}$ `;
					const newText = beforeCursor + newFormula + afterCursor;
					updateVariantText(editingVariantFormula.variantId, newText);

					setTimeout(() => {
						const textarea = variantTextareaRefs.current[editingVariantFormula.variantId];
						if (textarea) {
							const newPosition = cursorPos + newFormula.length;
							textarea.setSelectionRange(newPosition, newPosition);
							textarea.focus();
						}
					}, 0);
				}
			}
		}
		setEditingVariantFormula({ variantId: '', formula: null });
		setShowMathPopup(false);
	};

	const handleVariantTextareaChange = (variantId: string, value: string, selectionStart: number) => {
		updateVariantText(variantId, value);
		setVariantCursorPositions((prev) => ({ ...prev, [variantId]: selectionStart }));
	};

	const handleVariantTextareaClick = (variantId: string, selectionStart: number) => {
		setVariantCursorPositions((prev) => ({ ...prev, [variantId]: selectionStart }));
	};

	const openVariantMathPopup = (variantId: string, formula?: MathFormula) => {
		if (formula) {
			const variant = variants.find((v) => v.id === variantId);
			if (variant) {
				const formulaText = `$${formula.latex}$`;
				if (variant.text.includes(formulaText)) {
					setEditingVariantFormula({ variantId, formula });
				}
			}
		} else {
			setEditingVariantFormula({ variantId, formula: null });
		}
		setShowMathPopup(true);
	};

	const getVariantFormulas = (variantText: string): MathFormula[] => {
		const formulaRegex = /\$\$?([^$]+)\$\$?/g;
		const foundFormulas: MathFormula[] = [];
		let match;

		while ((match = formulaRegex.exec(variantText)) !== null) {
			foundFormulas.push({
				id: Math.random().toString(36).substr(2, 9),
				latex: match[1].trim(),
				position: match.index,
			});
		}
		return foundFormulas;
	};

	const deleteVariantFormula = (variantId: string, formula: MathFormula) => {
		const variant = variants.find((v) => v.id === variantId);
		if (variant) {
			const formulaText = `$${formula.latex}$`;
			const newText = variant.text.replace(formulaText, '');
			updateVariantText(variantId, newText);
		}
	};

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

	const updateVariantText = (id: string, text: string) => {
		setVariants((prev) => prev.map((variant) => (variant.id === id ? { ...variant, text } : variant)));
	};

	const toggleCorrectVariant = (id: string) => {
		setVariants((prev) =>
			prev.map((variant) => ({
				...variant,
				isCorrect: variant.id === id,
			}))
		);
	};

	const addVariant = () => {
		const newVariantLetter = String.fromCharCode(65 + variants.length);
		const newVariant: QuestionVariant = {
			id: `variant-${newVariantLetter.toLowerCase()}`,
			text: '',
			isCorrect: false,
		};
		setVariants([...variants, newVariant]);
	};

	const removeVariant = (variantId: string) => {
		if (variants.length <= 2) return;
		setVariants(variants.filter((variant) => variant.id !== variantId));
	};

	const nextStep = () => {
		if (currentStep < 2) setCurrentStep(currentStep + 1);
	};

	const prevStep = () => {
		if (currentStep > 1) setCurrentStep(currentStep - 1);
	};

	const canProceedToNextStep = () => {
		switch (currentStep) {
			case 1:
				return question.trim().length > 0;
			case 2:
				return variants.some((v) => v.isCorrect) && areAllVariantsNonEmpty() && areAllVariantsUnique();
			default:
				return true;
		}
	};

	const handleSaveQuestion = async () => {
		if (!question.trim()) {
			setSaveMessage('Iltimos, savol matnini kiriting!');
			return;
		}

		if (variants.length > 0 && !variants.some((v) => v.isCorrect)) {
			setSaveMessage("Iltimos, to'g'ri javobni belgilang!");
			return;
		}

		if (!areAllVariantsNonEmpty()) {
			setSaveMessage("Iltimos, barcha variantlarni to'ldiring!");
			return;
		}

		if (!areAllVariantsUnique()) {
			setSaveMessage("Iltimos, barcha variantlar turlicha bo'lishi kerak!");
			return;
		}

		setIsSaving(true);
		setSaveMessage('');

		try {
			const formData = new FormData();
			formData.append('question', question);
			formData.append('formulas', JSON.stringify(formulas));
			formData.append('variants', JSON.stringify(variants));

			for (let i = 0; i < uploadedImages.length; i++) {
				const image = uploadedImages[i];
				try {
					const response = await request.get(image.url, {
						responseType: 'blob',
					});
					const blob = response.data;
					const file = new File([blob], image.name, { type: blob.type });
					formData.append(`images[${i}]`, file);
				} catch (error) {
					console.error('Error converting image:', error);
				}
			}

			const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
			if (csrfToken) {
				formData.append('_token', csrfToken);
			}

			const topicId = typeof window !== 'undefined' ? (window as any).topic?.id : null;
			const questionId = typeof window !== 'undefined' ? (window as any).questionId : null;

			const url = mode === 'edit' ? `/admin/questions/${topicId}/${questionId}` : `/admin/questions/${topicId}`;

			if (mode === 'edit') {
				formData.append('_method', 'PUT');
			}

			const response = await fetch(url, {
				method: 'POST', // Always POST, Laravel will handle _method override
				body: formData,
				headers: {
					'X-Requested-With': 'XMLHttpRequest',
				},
			});

			const result = await response.json();

			if (result.success) {
				setSaveMessage(result.message);

				if (mode === 'create') {
					setQuestion('');
					setFormulas([]);
					setUploadedImages([]);
					setVariants([
						{ id: 'variant-a', text: '', isCorrect: true },
						{ id: 'variant-b', text: '', isCorrect: false },
						{ id: 'variant-c', text: '', isCorrect: false },
						{ id: 'variant-d', text: '', isCorrect: false },
					]);
					uploadedImages.forEach((image) => {
						URL.revokeObjectURL(image.url);
					});
				}

				setTimeout(() => {
					const topicId = typeof window !== 'undefined' ? (window as any).topic?.id : null;

					window.location.href = `/admin/questions/${topicId}`;
				}, 1500);
			} else {
				setSaveMessage(result.message);
			}
		} catch (error) {
			console.error('Error saving question:', error);
			setSaveMessage('Savolni saqlashda xatolik yuz berdi!');
		} finally {
			setIsSaving(false);
		}
	};

	const areAllVariantsNonEmpty = () => {
		return variants.every((variant) => variant.text.trim().length > 0);
	};

	const areAllVariantsUnique = () => {
		const variantTexts = variants.map((v) => v.text.trim().toLowerCase()).filter((t) => t.length > 0);
		const uniqueTexts = new Set(variantTexts);
		return variantTexts.length === uniqueTexts.size;
	};

    const getVariantValidationErrors = (): string[] => {
        const errors: string[] = [];
		if (!areAllVariantsNonEmpty()) {
			errors.push("Barcha variantlarni to'ldiring");
		}
		if (!areAllVariantsUnique()) {
			errors.push("Barcha variantlar turlicha bo'lishi kerak");
		}
		return errors;
	};

	if (isLoading) {
		return (
			<div className='max-w-4xl mx-auto p-6 space-y-6'>
				<div className='flex items-center justify-center min-h-[400px]'>
					<div className='text-center'>
						<div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4'></div>
						<p className='text-gray-600'>Savol yuklanmoqda...</p>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className='max-w-4xl mx-auto p-6 space-y-6'>
			<div className='flex items-center justify-between mb-8'>
				<h1 className='text-2xl font-bold text-gray-800'>
					{mode === 'edit' ? 'Savolni tahrirlash' : 'Savol yaratish'}
				</h1>
				<div className='flex items-center space-x-4'>
					{[1, 2].map((step) => (
						<div key={step} className='flex items-center'>
							<div
								className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
									step === currentStep
										? 'bg-blue-600 text-white'
										: step < currentStep
										? 'bg-green-600 text-white'
										: 'bg-gray-200 text-gray-600'
								}`}
							>
								{step < currentStep ? '✓' : step}
							</div>
							{step < 2 && <div className='w-8 h-0.5 bg-gray-300 mx-2' />}
						</div>
					))}
				</div>
			</div>

			{currentStep === 1 && (
				<Card className='border-blue-200 bg-blue-50'>
					<CardHeader>
						<h2 className='text-xl font-semibold text-blue-800'>1-qadam: Savol matnini kiriting</h2>
					</CardHeader>
					<CardContent className='space-y-4'>
						<div className='space-y-2'>
							<Label htmlFor='question' className='text-sm font-medium text-blue-700'>
								Savol matni
							</Label>
							<Textarea
								id='question'
								ref={textareaRef}
								value={question}
								onChange={handleTextareaChange}
								onSelect={(e) => setCursorPosition((e.target as HTMLTextAreaElement).selectionStart)}
								placeholder='Savolingizni kiriting...'
								className='mt-1 min-h-[120px] bg-white border-blue-200 focus:border-blue-400 focus:ring-blue-400'
							/>
						</div>

						<div className='flex flex-wrap gap-2'>
							<Button
								type='button'
								variant='outline'
								size='sm'
								onClick={() => {
									setEditingFormula(null);
									setShowMathPopup(true);
								}}
								className='flex items-center gap-2 bg-blue-600 text-white hover:bg-blue-700 border-blue-600 hover:border-blue-700'
							>
								<Calculator className='h-4 w-4' />
								Matematik formula kiritish
							</Button>
							<Button
								type='button'
								variant='outline'
								size='sm'
								onClick={() => document.getElementById('image-upload')?.click()}
								className='flex items-center gap-2 bg-green-600 text-white hover:bg-green-700 border-green-600 hover:border-green-700'
							>
								<ImageIcon className='h-4 w-4' />
								Rasm yuklash
							</Button>
							<input
								id='image-upload'
								type='file'
								accept='image/*'
								onChange={handleImageUpload}
								className='hidden'
							/>
						</div>

						{formulas.length > 0 && (
							<div className='space-y-2'>
								<h3 className='text-sm font-medium text-blue-700'>Qo'shilgan formulalar:</h3>
								<div className='flex flex-wrap gap-2'>
									{formulas.map((formula) => (
										<div
											key={formula.id}
											className='flex items-center gap-2 p-2 bg-blue-50 rounded border border-blue-200'
										>
											<MathRenderer latex={formula.latex} />
											<Button
												size='sm'
												variant='ghost'
												onClick={() => handleEditFormula(formula)}
												className='h-6 w-6 p-0 text-blue-600 hover:text-blue-700'
												title='Tahrirlash'
											>
												<Edit className='h-3 w-3' />
											</Button>
											<Button
												size='sm'
												variant='ghost'
												onClick={() => handleDeleteFormula(formula)}
												className='h-6 w-6 p-0 text-red-600 hover:text-red-700'
												title="O'chirish"
											>
												<Trash2 className='h-3 w-3' />
											</Button>
										</div>
									))}
								</div>
							</div>
						)}

						{uploadedImages.length > 0 && (
							<div className='space-y-3'>
								<h4 className='font-semibold text-gray-700 flex items-center gap-2'>
									<ImageIcon className='h-4 w-4' />
									Qo'shilgan rasmlar:
								</h4>
								<div className='grid grid-cols-2 md:grid-cols-3 gap-4'>
									{uploadedImages.map((image) => (
										<div key={image.id} className='relative group'>
											<img
												src={image.url || '/placeholder.svg'}
												alt={image.name}
												className='w-full h-24 object-cover rounded-lg border border-gray-200'
											/>
											<Button
												size='sm'
												variant='destructive'
												onClick={() => deleteImage(image.id)}
												className='absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity'
												title="Rasmni o'chirish"
											>
												<Trash2 className='h-3 w-3' />
											</Button>
										</div>
									))}
								</div>
							</div>
						)}

						{(question.trim() || formulas.length > 0 || uploadedImages.length > 0) && (
							<div className='mt-6 p-4 bg-white rounded-lg border border-blue-200'>
								<h3 className='text-sm font-medium text-gray-700 mb-3'>Savol ko'rinishi:</h3>
								<div className='prose max-w-none'>{renderQuestionContent(question)}</div>
							</div>
						)}
					</CardContent>
				</Card>
			)}

			{currentStep === 2 && (
				<Card className='border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50'>
					<CardHeader>
						<div className='flex items-center justify-between'>
							<h2 className='text-2xl font-bold text-indigo-800'>2-qadam: Javob variantlari</h2>
							<div className='flex gap-2'>
								<Button
									type='button'
									variant='outline'
									size='sm'
									onClick={addVariant}
									className='flex items-center gap-2 bg-white hover:bg-indigo-50 border-indigo-300 text-indigo-700 font-medium shadow-sm'
								>
									<Plus className='h-4 w-4' />
									Variant qo'shish
								</Button>
							</div>
						</div>
					</CardHeader>
					<CardContent className='space-y-6'>
						{(question.trim() || formulas.length > 0 || uploadedImages.length > 0) && (
							<div className='p-6 bg-white rounded-xl border-2 border-indigo-100 shadow-sm mb-6'>
								<h3 className='text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2'>
									<span className='w-2 h-2 bg-indigo-500 rounded-full'></span>
									Savol:
								</h3>
								<div className='prose max-w-none text-gray-700'>{renderQuestionContent(question)}</div>
							</div>
						)}

						{variants.map((variant, index) => (
							<div
								key={variant.id}
								className='p-6 bg-white rounded-xl border-2 border-gray-100 shadow-sm hover:shadow-md transition-shadow space-y-4'
							>
								<div className='flex items-center gap-4'>
									<span className='text-lg font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-500 w-10 h-10 rounded-full flex items-center justify-center shadow-md'>
										{String.fromCharCode(65 + index)}
									</span>
									<div className='flex-1'>
										<Textarea
											ref={(el) => {
												variantTextareaRefs.current[variant.id] = el;
											}}
											value={variant.text}
											onChange={(e) =>
												handleVariantTextareaChange(
													variant.id,
													e.target.value,
													e.target.selectionStart
												)
											}
											onSelect={(e) =>
												handleVariantTextareaClick(
													variant.id,
													(e.target as HTMLTextAreaElement).selectionStart
												)
											}
											placeholder={`${String.fromCharCode(65 + index)} variantini kiriting...`}
											rows={2}
											className='w-full resize-none min-h-[80px] bg-white border-2 border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 rounded-lg'
										/>
									</div>
									<div className='flex items-center gap-3'>
										<Button
											type='button'
											size='sm'
											variant={variant.isCorrect ? 'default' : 'outline'}
											onClick={() => toggleCorrectVariant(variant.id)}
											className={`h-9 px-4 text-sm font-medium rounded-lg transition-all ${
												variant.isCorrect
													? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-md'
													: 'hover:bg-green-50 hover:border-green-300 border-2 text-green-700'
											}`}
											title={variant.isCorrect ? "✓ To'g'ri" : "To'g'ri?"}
										>
											{variant.isCorrect ? "✓ To'g'ri" : "To'g'ri?"}
										</Button>
										{variants.length > 2 && (
											<Button
												type='button'
												size='sm'
												variant='outline'
												onClick={() => removeVariant(variant.id)}
												className='h-9 w-9 p-0 text-red-600 hover:text-white hover:bg-red-500 border-2 border-red-200 hover:border-red-500 rounded-lg transition-all'
												title="Variantni o'chirish"
											>
												<Trash2 className='h-4 w-4' />
											</Button>
										)}
									</div>
								</div>

								<div className='space-y-3'>
									<div className='flex items-center justify-between'>
										<Label className='text-sm font-semibold text-gray-700 flex items-center gap-2'>
											<span className='w-1.5 h-1.5 bg-blue-500 rounded-full'></span>
											Matematik formulalar:
										</Label>
										<Button
											type='button'
											variant='outline'
											size='sm'
											onClick={() => openVariantMathPopup(variant.id)}
											className='h-8 px-3 text-sm bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border-blue-200 text-blue-700 font-medium rounded-lg'
										>
											+ Formula
										</Button>
									</div>

									{getVariantFormulas(variant.text).length > 0 && (
										<div className='flex flex-wrap gap-3'>
											{getVariantFormulas(variant.text).map((formula) => (
												<div
													key={formula.id}
													className='flex items-center gap-2 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-100 hover:border-blue-200 transition-colors'
												>
													<MathRenderer latex={formula.latex} />
													<Button
														size='sm'
														variant='ghost'
														onClick={() => openVariantMathPopup(variant.id, formula)}
														className='h-7 w-7 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-100 rounded-md'
														title='Tahrirlash'
													>
														<Edit className='h-3.5 w-3.5' />
													</Button>
													<Button
														size='sm'
														variant='ghost'
														onClick={() => deleteVariantFormula(variant.id, formula)}
														className='h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-100 rounded-md'
														title="O'chirish"
													>
														<Trash2 className='h-3.5 w-3.5' />
													</Button>
												</div>
											))}
										</div>
									)}
								</div>

								{variant.text.trim() && (
									<div className='mt-4 p-4 bg-gradient-to-r from-gray-50 to-slate-50 rounded-lg border-2 border-gray-100'>
										<h4 className='text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2'>
											<span className='w-1.5 h-1.5 bg-gray-500 rounded-full'></span>
											Ko'rinishi:
										</h4>
										<div className='prose max-w-none text-sm text-gray-800'>
											{renderVariantContent(variant.text)}
										</div>
									</div>
								)}
							</div>
						))}

						<div className='space-y-2'>
							{getVariantValidationErrors().map((error, index) => (
								<div key={index} className='p-3 bg-red-50 border border-red-200 rounded-lg'>
									<p className='text-sm text-red-700 flex items-center gap-2'>
										<span className='text-red-500'>⚠️</span>
										{error}
									</p>
								</div>
							))}
						</div>

						<p className='text-sm text-gray-500'>
							Kamida bitta variantni to'g'ri javob sifatida belgilang.
						</p>
					</CardContent>
				</Card>
			)}

			<div className='flex justify-between items-center pt-6 border-t'>
				<Button
					type='button'
					variant='outline'
					onClick={prevStep}
					disabled={currentStep === 1}
					className='flex items-center gap-2 bg-transparent'
				>
					Orqaga
				</Button>

				<div className='flex gap-3'>
					{currentStep < 2 ? (
						<Button
							type='button'
							onClick={nextStep}
							disabled={!canProceedToNextStep()}
							className='flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white'
						>
							Keyingi
						</Button>
					) : (
						<Button
							type='button'
							onClick={handleSaveQuestion}
							disabled={isSaving || !canProceedToNextStep()}
							className='flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white'
						>
							{isSaving
								? mode === 'edit'
									? 'Saqlanmoqda...'
									: 'Saqlanmoqda...'
								: mode === 'edit'
								? "O'zgarishlarni saqlash"
								: 'Savolni saqlash'}
						</Button>
					)}
				</div>
			</div>

			{saveMessage && (
				<div
					className={`p-4 rounded-lg ${
						saveMessage.includes('muvaffaqiyatli')
							? 'bg-green-100 text-green-800'
							: 'bg-red-100 text-red-800'
					}`}
				>
					{saveMessage}
				</div>
			)}

			<MathPopup
				isOpen={showMathPopup}
				onClose={() => {
					setShowMathPopup(false);
					setEditingFormula(null);
					setEditingVariantFormula({ variantId: '', formula: null });
				}}
				onInsert={editingVariantFormula.variantId ? handleVariantFormulaInsert : handleInsertFormula}
				initialValue={editingFormula?.latex || editingVariantFormula.formula?.latex || ''}
			/>
		</div>
	);
}
