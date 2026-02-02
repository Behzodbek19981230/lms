export type FormulaItem = {
	name: string;
	latex: string;
};

const L = String.raw;

export type MatematikaTopicKey =
	| 'algebra'
	| 'tenglamalar'
	| 'funksiya'
	| 'trigonometriya'
	| 'geometriya'
	| 'analiz'
	| 'ehtimollik-statistika'
	| 'vektorlar';

export type MatematikaTopic = {
	key: MatematikaTopicKey;
	label: string;
	items: FormulaItem[];
};

export const matematikaTopics: MatematikaTopic[] = [
	{
		key: 'algebra',
		label: 'Algebra',
		items: [
			{ name: 'Kvadrat formula', latex: L`ax^2+bx+c=0` },
			{ name: 'Diskriminant', latex: L`D=b^2-4ac` },
			{ name: 'Ildizlar', latex: L`x_{1,2}=\frac{-b\pm\sqrt{D}}{2a}` },
			{ name: 'Kvadratlar ayirmasi', latex: L`a^2-b^2=(a-b)(a+b)` },
			{ name: "Kvadratlar yig'indisi", latex: L`(a\pm b)^2=a^2\pm 2ab+b^2` },
			{ name: "Kub yig'indisi", latex: L`a^3+b^3=(a+b)(a^2-ab+b^2)` },
			{ name: 'Kub ayirmasi', latex: L`a^3-b^3=(a-b)(a^2+ab+b^2)` },
			{ name: 'Arifmetik progressiya', latex: L`a_n=a_1+(n-1)d` },
			{ name: "AP yig'indi", latex: L`S_n=\frac{n(a_1+a_n)}{2}` },
			{ name: 'Geometrik progressiya', latex: L`a_n=a_1q^{n-1}` },
			{ name: "GP yig'indi", latex: L`S_n=a_1\frac{q^n-1}{q-1}` },
		],
	},
	{
		key: 'tenglamalar',
		label: 'Tenglamalar',
		items: [
			{ name: 'Chiziqli tenglama', latex: L`ax+b=0\Rightarrow x=-\frac{b}{a}` },
			{ name: 'Vieta', latex: L`x_1+x_2=-\frac{b}{a}` },
			{ name: 'Vieta', latex: L`x_1x_2=\frac{c}{a}` },
			{ name: "Logarifm ta'rifi", latex: L`\log_a b=c\Leftrightarrow a^c=b` },
			{ name: "Logarifm ko'paytma", latex: L`\log_a(xy)=\log_a x+\log_a y` },
			{ name: "Logarifm bo'linma", latex: L`\log_a\frac{x}{y}=\log_a x-\log_a y` },
			{ name: 'Daraja qoidasi', latex: L`\log_a(x^k)=k\log_a x` },
		],
	},
	{
		key: 'funksiya',
		label: 'Funksiya',
		items: [
			{ name: 'Chiziqli funksiya', latex: L`y=kx+b` },
			{ name: 'Parabola', latex: L`y=ax^2+bx+c` },
			{ name: 'Eksponenta', latex: L`y=a^x` },
			{ name: 'Logarifmik', latex: L`y=\log_a x` },
			{ name: 'Modul', latex: L`|x|=\begin{cases}x,&x\ge 0\\-x,&x<0\end{cases}` },
		],
	},
	{
		key: 'trigonometriya',
		label: 'Trigonometriya',
		items: [
			{ name: 'Pifagor ayniyat', latex: L`\sin^2x+\cos^2x=1` },
			{ name: 'Tangens', latex: L`\tan x=\frac{\sin x}{\cos x}` },
			{ name: 'Kotangens', latex: L`\cot x=\frac{\cos x}{\sin x}` },
			{ name: '1+tan^2', latex: L`1+\tan^2x=\frac{1}{\cos^2x}` },
			{ name: '1+cot^2', latex: L`1+\cot^2x=\frac{1}{\sin^2x}` },
			{ name: "Yig'indi formulasi", latex: L`\sin(\alpha\pm\beta)=\sin\alpha\cos\beta\pm\cos\alpha\sin\beta` },
			{ name: "Yig'indi formulasi", latex: L`\cos(\alpha\pm\beta)=\cos\alpha\cos\beta\mp\sin\alpha\sin\beta` },
		],
	},
	{
		key: 'geometriya',
		label: 'Geometriya',
		items: [
			{ name: 'Uchburchak yuzi', latex: L`S=\frac{1}{2}ah` },
			{ name: 'Heron', latex: L`S=\sqrt{p(p-a)(p-b)(p-c)}` },
			{ name: 'Yarim perimetr', latex: L`p=\frac{a+b+c}{2}` },
			{ name: 'Aylana uzunligi', latex: L`L=2\pi R` },
			{ name: 'Aylana yuzi', latex: L`S=\pi R^2` },
			{ name: 'Shar yuzi', latex: L`S=4\pi R^2` },
			{ name: 'Shar hajmi', latex: L`V=\frac{4}{3}\pi R^3` },
			{ name: 'Pifagor', latex: L`a^2+b^2=c^2` },
		],
	},
	{
		key: 'analiz',
		label: 'Analiz',
		items: [
			{ name: 'Hosila', latex: L`(x^n)'=nx^{n-1}` },
			{ name: 'Hosila', latex: L`(\sin x)'=\cos x` },
			{ name: 'Hosila', latex: L`(\cos x)'=-\sin x` },
			{ name: 'Hosila', latex: L`(e^x)'=e^x` },
			{ name: 'Hosila', latex: L`(\ln x)'=\frac{1}{x}` },
			{ name: 'Integral', latex: L`\int x^n\,dx=\frac{x^{n+1}}{n+1}+C` },
			{ name: 'Integral', latex: L`\int \cos x\,dx=\sin x+C` },
			{ name: 'Integral', latex: L`\int \frac{1}{x}\,dx=\ln|x|+C` },
		],
	},
	{
		key: 'ehtimollik-statistika',
		label: 'Ehtimollik/Statistika',
		items: [
			{ name: 'Ehtimollik', latex: L`P(A)=\frac{m}{n}` },
			{ name: "Qo'shish qoidasi", latex: L`P(A\cup B)=P(A)+P(B)-P(A\cap B)` },
			{ name: 'Mustaqil hodisa', latex: L`P(A\cap B)=P(A)P(B)` },
			{ name: 'Kombinatsiya', latex: L`C_n^k=\frac{n!}{k!(n-k)!}` },
			{ name: 'Permutatsiya', latex: L`P_n=n!` },
		],
	},
	{
		key: 'vektorlar',
		label: 'Vektorlar',
		items: [
			{ name: "Skalyar ko'paytma", latex: L`\vec a\cdot\vec b=|a||b|\cos\theta` },
			{ name: 'Vektor uzunligi', latex: L`|\vec a|=\sqrt{a_x^2+a_y^2}` },
			{ name: 'Masofa', latex: L`d=\sqrt{(x_2-x_1)^2+(y_2-y_1)^2}` },
		],
	},
];
