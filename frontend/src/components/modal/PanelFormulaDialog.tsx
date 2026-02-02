import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calculator, Copy, Check, Plus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { subjects, type SubjectKey } from './formulaCategories';

interface MathLiveElement extends HTMLElement {
	setValue: (value: string) => void;
	getValue: () => string;
	setOptions: (options: Record<string, unknown>) => void;
	executeCommand: (command: string[]) => void;
}

interface PanelFormulaDialogProps {
	open: boolean;
	setOpen: (open: boolean) => void;
	onInsert: (latex: string) => void;
	initialValue?: string;
}

function MathLivePreview({ latex, fontSize }: { latex: string; fontSize?: string }) {
	return (
		<math-field
			read-only='true'
			style={{
				fontSize: fontSize || '18px',
				background: 'transparent',
				border: 'none',
				width: '100%',
				cursor: 'pointer',
			}}
		>
			{latex}
		</math-field>
	);
}

export const PanelFormulaDialog = ({ open, setOpen, onInsert, initialValue = '' }: PanelFormulaDialogProps) => {
	const mathfieldRef = useRef<MathLiveElement | null>(null);
	const [currentLatex, setCurrentLatex] = useState(initialValue);
	const [activeSubjectKey, setActiveSubjectKey] = useState<SubjectKey>('kimyo');
	const [activeTopicKey, setActiveTopicKey] = useState<string>('');
	const [copied, setCopied] = useState(false);
	const inputListenerRef = useRef<((event: Event) => void) | null>(null);

	const activeSubject = subjects.find((s) => s.key === activeSubjectKey) ?? subjects[0];
	const activeTopic = activeSubject?.topics?.find((t) => t.key === activeTopicKey) ?? activeSubject?.topics?.[0];

	useEffect(() => {
		const nextKey = activeSubject?.topics?.[0]?.key ?? '';
		setActiveTopicKey(nextKey);
	}, [activeSubjectKey]);

	const isMathLiveVirtualKeyboardTarget = (target: EventTarget | null) => {
		if (!target) return false;
		if (!(target instanceof Element)) return false;
		return Boolean(
			target.closest(
				'math-virtual-keyboard, #mathlive-virtual-keyboard, .ML__keyboard, .ML__keyboard-container, [data-mathlive-virtual-keyboard]',
			),
		);
	};

	const formatLatexForCopy = (latex: string) => {
		const trimmed = (latex || '').trim();
		if (!trimmed) return '';
		// If already wrapped, keep as-is.
		if (/^\$\$[\s\S]*\$\$$/.test(trimmed)) return trimmed;
		// If wrapped with single $, convert to $$...$$ for consistency.
		if (/^\$[\s\S]*\$$/.test(trimmed) && !trimmed.startsWith('$$')) {
			return `$$${trimmed.slice(1, -1)}$$`;
		}
		return `$$${trimmed}$$`;
	};

	const latexCode = formatLatexForCopy(currentLatex);

	useEffect(() => {
		// Keep state in sync so the code block and buttons reflect the latest initial value.
		// (e.g., opening the modal for an existing formula should preload it)
		setCurrentLatex(initialValue || '');
	}, [initialValue]);

	useEffect(() => {
		// Dynamically import MathLive to avoid SSR issues
		// and ensure the editor is prefilled each time the modal is opened.
		const loadMathLive = async () => {
			if (typeof window === 'undefined' || !open) return;

			await import('mathlive');
			const mathfield = mathfieldRef.current;
			if (!mathfield) return;

			if (!mathfield.hasAttribute('data-initialized')) {
				mathfield.setOptions({
					virtualKeyboardMode: 'onfocus',
					smartFence: true,
					smartSuperscript: true,
					locale: 'uz',
				});

				const onInput = (event: Event) => {
					const target = event.target as MathLiveElement;
					setCurrentLatex(target.getValue());
				};
				inputListenerRef.current = onInput;
				mathfield.addEventListener('input', onInput);
				mathfield.setAttribute('data-initialized', 'true');
			}

			// Always prefill the editor when opening (or when initialValue changes while open)
			const next = (initialValue || '').trim();
			mathfield.setValue(next);
			setCurrentLatex(next);
		};

		loadMathLive();
	}, [open, initialValue]);

	const onClose = () => {
		setOpen(false);
		// Don't force-clear local state here; the next open should reflect `initialValue`.
	};

	const insertFormula = () => {
		if (currentLatex.trim()) {
			onInsert(currentLatex.trim());
			onClose();
		}
	};

	const copyLatex = async () => {
		if (latexCode) {
			await navigator.clipboard.writeText(latexCode);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		}
	};

	const insertQuickFormula = (latex: string) => {
		if (mathfieldRef.current) {
			mathfieldRef.current.executeCommand(['insert', latex]);
		}
	};

	return (
		<Dialog
			open={open}
			onOpenChange={(nextOpen) => {
				if (!nextOpen) onClose();
			}}
		>
			<DialogContent
				className='w-[96vw] h-[92vh] max-w-none overflow-hidden flex flex-col p-0'
				onPointerDownOutside={(e) => {
					if (isMathLiveVirtualKeyboardTarget(e.target)) e.preventDefault();
				}}
				onFocusOutside={(e) => {
					if (isMathLiveVirtualKeyboardTarget(e.target)) e.preventDefault();
				}}
				onInteractOutside={(e) => {
					if (isMathLiveVirtualKeyboardTarget(e.target)) e.preventDefault();
				}}
			>
				<DialogHeader className='px-6 pt-6 pb-4 flex-shrink-0'>
					<div className='flex items-center justify-between'>
						<DialogTitle className='flex items-center gap-2'>
							<Calculator className='h-5 w-5' />
							Formula va belgilar paneli
						</DialogTitle>
						<div className='flex items-center gap-2'>
							<Button variant='outline' size='sm' onClick={copyLatex} disabled={!currentLatex}>
								{copied ? <Check className='h-4 w-4' /> : <Copy className='h-4 w-4' />}
								{copied ? 'Nusxalandi' : 'LaTeX nusxalash'}
							</Button>
						</div>
					</div>
				</DialogHeader>

				<div className='flex-1 overflow-y-auto px-6 pb-4 space-y-4'>
					{/* Chemistry Topics + Quick formulas */}
					<div className='flex-shrink-0 space-y-3'>
						<div className='flex items-center gap-2 flex-wrap'>
							<h4 className='text-sm font-medium'>Fan:</h4>
							<div className='flex items-center gap-2 flex-wrap'>
								{subjects.map((s) => (
									<Button
										key={s.key}
										type='button'
										variant={activeSubjectKey === s.key ? 'default' : 'outline'}
										size='sm'
										onClick={() => setActiveSubjectKey(s.key)}
									>
										{s.label}
									</Button>
								))}
							</div>
						</div>

						<div>
							<h4 className='text-sm font-medium mb-2'>Mavzular:</h4>
							<div className='flex gap-2 flex-wrap max-h-24 overflow-y-auto'>
								{(activeSubject?.topics ?? []).map((topic) => (
									<Button
										key={topic.key}
										variant={activeTopicKey === topic.key ? 'default' : 'outline'}
										size='sm'
										onClick={() => setActiveTopicKey(topic.key)}
									>
										{topic.label}
									</Button>
								))}
							</div>
						</div>

						<div>
							<div className='flex items-center justify-between gap-3'>
								<h4 className='text-sm font-medium'>Formulalar: {activeTopic?.label}</h4>
								<span className='text-xs text-muted-foreground'>
									{activeTopic?.items?.length ?? 0} ta
								</span>
							</div>
							<div className='grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 border rounded-lg p-2 max-h-[38vh] overflow-y-auto mt-2'>
								{(activeTopic?.items ?? []).map((formula, index) => (
									<button
										key={`${activeTopic?.key}-${index}`}
										type='button'
										onClick={() => insertQuickFormula(formula.latex)}
										className='text-xs h-auto p-2 flex flex-col items-center gap-1 border relative rounded bg-background hover:bg-muted transition cursor-pointer'
										title={formula.name}
									>
										<div className='text-xs'>
											<MathLivePreview latex={formula.latex} fontSize='14px' />
										</div>
										<div className='line-clamp-2 text-[10px] opacity-70 text-center'>
											{formula.name}
										</div>
										<div className='absolute bottom-1 right-1 opacity-50 bg-primary/10 rounded-full p-1'>
											<Plus className='h-4 w-4' />
										</div>
									</button>
								))}
							</div>
						</div>
					</div>

					{/* MathLive Editor */}
					<div className='border rounded-lg p-4 bg-white'>
						<math-field
							ref={mathfieldRef}
							style={{
								fontSize: '28px',
								padding: '8px',
								border: '1px solid #e2e8f0',
								borderRadius: '6px',
								minHeight: '90px',
								width: '100%',
							}}
						/>
					</div>

					{/* LaTeX Code */}
					{latexCode && (
						<div className='border rounded-lg p-4 bg-muted/50'>
							<h4 className='text-sm font-medium mb-2'>LaTeX kodi:</h4>
							<code className='text-sm font-mono bg-background p-2 rounded block'>{latexCode}</code>
						</div>
					)}
				</div>

				<DialogFooter className='flex justify-end gap-2 px-6 py-4 border-t flex-shrink-0'>
					<Button variant='outline' onClick={onClose}>
						Bekor qilish
					</Button>
					<Button onClick={insertFormula} disabled={!currentLatex.trim()}>
						Formula qo'shish
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};
