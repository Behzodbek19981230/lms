export type FormulaItem = {
	name: string;
	latex: string;
};

const L = String.raw;

export type BiologiyaTopicKey = 'hujayra' | 'genetika' | 'fiziologiya' | 'ekologiya' | 'biokimyo' | 'taksonomiya';

export type BiologiyaTopic = {
	key: BiologiyaTopicKey;
	label: string;
	items: FormulaItem[];
};

export const biologiyaTopics: BiologiyaTopic[] = [
	{
		key: 'hujayra',
		label: 'Hujayra',
		items: [
			{ name: 'ATP gidrolizi', latex: L`ATP + H_2O \rightarrow ADP + P_i + \text{energiya}` },
			{ name: 'Nukleotid (sxema)', latex: L`\text{Azotli asos}+\text{Pentoz}+P_i` },
			{ name: 'DNK juftlashish', latex: L`A\!\!\!\!\leftrightarrow T,\quad G\!\!\!\!\leftrightarrow C` },
			{ name: "Osmos (g'oya)", latex: L`\Delta\pi\sim\Delta C` },
			{ name: 'Mitoxondriya (oksidlovchi fosf.)', latex: L`NADH+H^+ + \tfrac{1}{2}O_2 \rightarrow NAD^+ + H_2O` },
		],
	},
	{
		key: 'genetika',
		label: 'Genetika',
		items: [
			{ name: 'Mendel 1-qonun (nisbat)', latex: L`3:1` },
			{ name: 'Dihibrid nisbat', latex: L`9:3:3:1` },
			{ name: 'Hardy–Weinberg', latex: L`p+q=1` },
			{ name: 'Hardy–Weinberg', latex: L`p^2+2pq+q^2=1` },
			{ name: 'Rekombinatsiya foizi', latex: L`r\% = \frac{\text{rekombinant}}{\text{jami}}\cdot 100\%` },
			{ name: 'Genotip (misol)', latex: L`Aa\times Aa` },
		],
	},
	{
		key: 'fiziologiya',
		label: 'Fiziologiya',
		items: [
			{ name: 'Yurak urishi (min)', latex: L`HR=\frac{\text{urishlar soni}}{t}` },
			{ name: 'Qon bosimi (oddiy)', latex: L`BP\sim CO\cdot TPR` },
			{ name: 'Nafas olish (ventilyatsiya)', latex: L`\dot V_E=V_T\cdot f` },
			{ name: 'BMI', latex: L`BMI=\frac{m}{h^2}` },
		],
	},
	{
		key: 'ekologiya',
		label: 'Ekologiya',
		items: [
			{ name: "Populyatsiya o'sishi", latex: L`\frac{dN}{dt}=rN` },
			{ name: 'Logistik model', latex: L`\frac{dN}{dt}=rN\left(1-\frac{N}{K}\right)` },
			{ name: 'Zichlik', latex: L`D=\frac{N}{S}` },
			{ name: 'Biomassa (oddiy)', latex: L`B\sim N\cdot m` },
		],
	},
	{
		key: 'biokimyo',
		label: 'Biokimyo',
		items: [
			{ name: 'Fotosintez (umumiy)', latex: L`6CO_2+6H_2O\overset{h\nu}{\rightarrow}C_6H_{12}O_6+6O_2` },
			{ name: 'Nafas olish (umumiy)', latex: L`C_6H_{12}O_6+6O_2\rightarrow 6CO_2+6H_2O+\text{ATP}` },
			{ name: 'Ferment kinetikasi (M-M)', latex: L`v=\frac{V_{max}[S]}{K_m+[S]}` },
			{ name: 'pH', latex: L`pH=-\log[H^+]` },
		],
	},
	{
		key: 'taksonomiya',
		label: 'Taksonomiya',
		items: [
			{
				name: 'Taksonlar (ketma-ket)',
				latex: L`\text{Tur}\subset\text{Avlod}\subset\text{Oila}\subset\text{Turkum}\subset\text{Sinfi}\subset\text{Tip}\subset\text{Shoh}`,
			},
			{ name: 'Binominal nomenklatura', latex: L`\textit{Homo sapiens}` },
		],
	},
];
