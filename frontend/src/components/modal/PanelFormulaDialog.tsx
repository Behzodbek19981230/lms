import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { request } from '@/configs/request';
import { Calculator, Copy, Check, Plus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

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
	const { toast } = useToast();
	const mathfieldRef = useRef<MathLiveElement | null>(null);
	const [currentLatex, setCurrentLatex] = useState(initialValue);
	const [activeCategory, setActiveCategory] = useState('matematik');
	const [copied, setCopied] = useState(false);

	useEffect(() => {
		if (initialValue) {
			setCurrentLatex(initialValue);
		}
	}, [initialValue]);

	useEffect(() => {
		// Dynamically import MathLive to avoid SSR issues
		const loadMathLive = async () => {
			if (typeof window !== 'undefined' && open) {
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
	}, [open, currentLatex]);

	const onClose = () => {
		setOpen(false);
		setCurrentLatex('');
	};

	const insertFormula = () => {
		if (currentLatex.trim()) {
			onInsert(currentLatex.trim());
			onClose();
		}
	};

	const copyLatex = async () => {
		if (currentLatex) {
			await navigator.clipboard.writeText(currentLatex);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		}
	};

	const insertQuickFormula = (latex: string) => {
		if (mathfieldRef.current) {
			mathfieldRef.current.executeCommand(['insert', latex]);
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
			{ name: 'Suv', latex: 'H_2O' },
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
		],
	};

	return (
		<Dialog open={open} onOpenChange={onClose}>
			<DialogContent className='max-w-7xl max-h-[90vh] overflow-hidden flex flex-col p-0'>
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
						<div className='grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 border rounded-lg p-2 max-h-48 overflow-y-auto'>
							{formulaCategories[activeCategory as keyof typeof formulaCategories].map(
								(formula, index) => (
									<button
										key={index}
										type='button'
										onClick={() => insertQuickFormula(formula.latex)}
										className='text-xs h-auto p-2 flex flex-col items-center gap-1 border relative rounded bg-background hover:bg-muted transition cursor-pointer'
									>
										<div className='text-xs'>
											<MathLivePreview latex={formula.latex} fontSize='14px' />
										</div>
										<div className='absolute bottom-1 right-1 opacity-50 bg-primary/10 rounded-full p-1'>
											<Plus className='h-4 w-4' />
										</div>
									</button>
								)
							)}
						</div>
					</div>

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
							<code className='text-sm font-mono bg-background p-2 rounded block'>{currentLatex}</code>
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
