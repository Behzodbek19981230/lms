export type FormulaItem = {
	name: string;
	latex: string;
};

export type KimyoTopicKey =
	| 'umumiy'
	| 'atom-molekula'
	| 'mol'
	| 'stoxiometriya'
	| 'eritmalar'
	| 'gazlar'
	| 'kislota-ishqor'
	| 'redoks'
	| 'elektrokimyo'
	| 'termokimyo'
	| 'muvozanat'
	| 'organik';

export type KimyoTopic = {
	key: KimyoTopicKey;
	label: string;
	items: FormulaItem[];
};

const L = String.raw;

export const kimyoTopics: KimyoTopic[] = [
	{
		key: 'umumiy',
		label: 'Umumiy',
		items: [
			{ name: 'Reaksiya (umumiy)', latex: L`A + B \rightarrow C + D` },
			{ name: 'Qaytar reaksiya', latex: L`A + B \rightleftharpoons C + D` },
			{ name: 'Katalizator (ustiga yozuv)', latex: L`A + B \overset{cat.}{\rightarrow} C` },
			{ name: 'Zichlik', latex: L`\rho = \frac{m}{V}` },
			{ name: 'Massani topish', latex: L`m = \rho V` },
			{ name: 'Avogadro soni', latex: L`N_A = 6.022\times 10^{23}\,\text{mol}^{-1}` },
			{ name: 'Massaviy ulush', latex: L`\omega = \frac{m_\text{modda}}{m_\text{eritma}}` },
			{ name: 'Foiz konsentratsiya', latex: L`w\% = \omega\cdot 100\%` },
			{ name: 'Chiqim (yield)', latex: L`\eta\% = \frac{m_\text{amaliy}}{m_\text{nazariy}}\cdot 100\%` },
			{ name: 'Ekvivalent massa', latex: L`M_{eq} = \frac{M}{z}` },
			{ name: 'Reaksiya tezligi (konts.)', latex: L`v = k[A]^\alpha[B]^\beta` },
			{ name: 'Arrenius (sodd.)', latex: L`k = Ae^{-\frac{E_a}{RT}}` },
		],
	},
	{
		key: 'atom-molekula',
		label: 'Atom/Molekula',
		items: [
			{ name: 'Molyar massa', latex: L`M = \frac{m}{n}` },
			{ name: 'Mol miqdori (massa)', latex: L`n = \frac{m}{M}` },
			{ name: 'Massani topish', latex: L`m = nM` },
			{ name: 'Zarralar soni', latex: L`N = nN_A` },
			{ name: 'Mol (zarralar)', latex: L`n = \frac{N}{N_A}` },
			{ name: 'Modda ulushi', latex: L`x_i = \frac{n_i}{\sum n_i}` },
			{ name: 'Massaviy ulush (aral.)', latex: L`\omega_i = \frac{m_i}{\sum m_i}` },
			{ name: 'Eruvchanlik (foiz)', latex: L`S\% = \frac{m_\text{modda}}{m_\text{erituvchi}}\cdot 100\%` },
			{ name: 'Zichlik', latex: L`\rho = \frac{m}{V}` },
			{ name: 'Hajm', latex: L`V = \frac{m}{\rho}` },
			{ name: "Element ulushi (g'oya)", latex: L`\omega(X) = \frac{n_X A_{r,X}}{M_r}` },
			{ name: "Empirik formula (g'oya)", latex: L`\text{nisbat} = \frac{m_i/A_{r,i}}{\min(m/A_r)}` },
		],
	},
	{
		key: 'mol',
		label: 'Mol',
		items: [
			{ name: 'Mol miqdori', latex: L`n = \frac{m}{M}` },
			{ name: 'Molyar massa', latex: L`M = \frac{m}{n}` },
			{ name: 'Zarralar soni', latex: L`N = nN_A` },
			{ name: 'Mol (zarradan)', latex: L`n = \frac{N}{N_A}` },
			{ name: 'Gaz (ideal)', latex: L`n = \frac{pV}{RT}` },
			{ name: 'Gaz (NSh)', latex: L`n = \frac{V}{22.4\,\text{L/mol}}` },
			{ name: 'Molyar hajm (NSh)', latex: L`V_m = 22.4\,\text{L/mol}` },
			{ name: 'Molyarlik', latex: L`C = \frac{n}{V}` },
			{ name: 'Mol (eritma)', latex: L`n = CV` },
			{ name: "Molyal'lik", latex: L`b = \frac{n}{m(kg)}` },
			{ name: "Normal'lik", latex: L`N = Cz` },
			{ name: 'Ekvivalentlar', latex: L`n_{eq} = nz` },
		],
	},
	{
		key: 'stoxiometriya',
		label: 'Stoxiometriya',
		items: [
			{ name: 'Stoxiometrik nisbat', latex: L`\frac{n_1}{\nu_1}=\frac{n_2}{\nu_2}` },
			{ name: "Cheklovchi reagent (g'oya)", latex: L`\min\left(\frac{n_i}{\nu_i}\right)` },
			{ name: 'Mahsulot moli', latex: L`n_{mah}=\frac{\nu_{mah}}{\nu_{chek}}\,n_{chek}` },
			{ name: 'Mahsulot massasi', latex: L`m_{mah}=n_{mah}M_{mah}` },
			{ name: 'Gazlar hajmiy nisbat', latex: L`\frac{V_1}{\nu_1}=\frac{V_2}{\nu_2}` },
			{ name: 'Yield', latex: L`\eta\%=\frac{m_{am}}{m_{naz}}\cdot 100\%` },
			{ name: 'Massa ulushi', latex: L`\omega\%=\frac{m_1}{m_{um}}\cdot 100\%` },
			{ name: 'Eritma suyultirish', latex: L`C_1V_1=C_2V_2` },
			{ name: 'Ekvivalent tenglik', latex: L`n_{eq,1}=n_{eq,2}` },
			{ name: 'Titr tenglik', latex: L`C_1V_1z_1=C_2V_2z_2` },
			{ name: 'Hajm ulushi', latex: L`\varphi=\frac{V_1}{V_{um}}` },
			{ name: 'Aralashma molyar massa', latex: L`M_{aral}=\sum x_i M_i` },
		],
	},
	{
		key: 'eritmalar',
		label: 'Eritmalar',
		items: [
			{ name: 'Molyarlik', latex: L`C=\frac{n}{V}` },
			{ name: 'Mol (eritma)', latex: L`n=CV` },
			{ name: 'Suyultirish', latex: L`C_1V_1=C_2V_2` },
			{ name: 'Massaviy ulush', latex: L`\omega=\frac{m_{modda}}{m_{eritma}}` },
			{ name: 'Foiz', latex: L`w\%=\omega\cdot 100\%` },
			{ name: "Molyal'lik", latex: L`b=\frac{n}{m(kg)}` },
			{ name: "Normal'lik", latex: L`N=\frac{n_{eq}}{V}` },
			{ name: 'Ekvivalent kons.', latex: L`N=Cz` },
			{ name: 'Osmotik bosim', latex: L`\pi=CRT` },
			{ name: 'Raul qonuni', latex: L`p=x\,p^{\circ}` },
			{ name: 'Henry (sodd.)', latex: L`p=k_H x` },
			{ name: 'Aralashma (C·V)', latex: L`n=\sum C_iV_i` },
		],
	},
	{
		key: 'gazlar',
		label: 'Gazlar',
		items: [
			{ name: 'Ideal gaz', latex: L`pV=nRT` },
			{ name: 'Boyl–Mariott', latex: L`p_1V_1=p_2V_2` },
			{ name: 'Sharl', latex: L`\frac{V_1}{T_1}=\frac{V_2}{T_2}` },
			{ name: 'Gey-Lyussak', latex: L`\frac{p_1}{T_1}=\frac{p_2}{T_2}` },
			{ name: 'Birlashtirilgan', latex: L`\frac{p_1V_1}{T_1}=\frac{p_2V_2}{T_2}` },
			{ name: 'Dalton', latex: L`p_{um}=\sum p_i` },
			{ name: 'Qisman bosim', latex: L`p_i=x_i p_{um}` },
			{ name: 'Molyar ulush', latex: L`x_i=\frac{n_i}{\sum n_i}` },
			{ name: 'Gaz zichligi (ideal)', latex: L`\rho=\frac{pM}{RT}` },
			{ name: 'Molyar hajm (NSh)', latex: L`V_m=22.4\,\text{L/mol}` },
			{ name: 'Mol (NSh)', latex: L`n=\frac{V}{V_m}` },
			{ name: 'M aralashma', latex: L`M_{aral}=\sum x_iM_i` },
		],
	},
	{
		key: 'kislota-ishqor',
		label: 'Kislota/Ishqor',
		items: [
			{ name: 'pH', latex: L`pH=-\log[H^+]` },
			{ name: 'pOH', latex: L`pOH=-\log[OH^-]` },
			{ name: 'Kw', latex: L`K_w=[H^+][OH^-]` },
			{ name: 'pH+pOH', latex: L`pH+pOH=14` },
			{ name: 'Ka', latex: L`K_a=\frac{[H^+][A^-]}{[HA]}` },
			{ name: 'Kb', latex: L`K_b=\frac{[BH^+][OH^-]}{[B]}` },
			{ name: 'Neytrallanish', latex: L`H^+ + OH^- \rightarrow H_2O` },
			{ name: 'Kislota+asos', latex: L`HA + BOH \rightarrow BA + H_2O` },
			{ name: 'Titr tenglik', latex: L`C_1V_1z_1=C_2V_2z_2` },
			{ name: 'Henderson–Hasselbalch', latex: L`pH=pK_a+\log\frac{[A^-]}{[HA]}` },
			{ name: 'Kuchli kislota', latex: L`[H^+]\approx C` },
			{ name: 'Kuchli asos', latex: L`[OH^-]\approx C` },
		],
	},
	{
		key: 'redoks',
		label: 'Redoks',
		items: [
			{ name: "OS yig'indi (neytral)", latex: L`\sum OS = 0` },
			{ name: "OS yig'indi (ion)", latex: L`\sum OS = q` },
			{ name: 'Elektron balansi', latex: L`\sum n(e^-)_{ber}=\sum n(e^-)_{ol}` },
			{ name: 'Oksidlovchi', latex: L`Ox + e^- \rightarrow Red` },
			{ name: 'Qaytaruvchi', latex: L`Red \rightarrow Ox + e^-` },
			{ name: 'Redoks misol', latex: L`Zn + Cu^{2+} \rightarrow Zn^{2+} + Cu` },
			{ name: 'Permanganat (kislotali)', latex: L`MnO_4^- + 8H^+ + 5e^- \rightarrow Mn^{2+} + 4H_2O` },
			{ name: 'Dixromat (kislotali)', latex: L`Cr_2O_7^{2-}+14H^+ + 6e^- \rightarrow 2Cr^{3+}+7H_2O` },
			{ name: 'H2O2 oks.', latex: L`H_2O_2 \rightarrow O_2 + 2H^+ + 2e^-` },
			{ name: 'H2O2 qayt.', latex: L`H_2O_2 + 2H^+ + 2e^- \rightarrow 2H_2O` },
			{ name: 'Galvanik E', latex: L`E_{cell}=E_{kat}-E_{an}` },
			{ name: 'Gibbs', latex: L`\Delta G = -nFE` },
		],
	},
	{
		key: 'elektrokimyo',
		label: 'Elektrokimyo',
		items: [
			{ name: 'Faradey doimiysi', latex: L`F\approx 96485\,\text{C/mol}` },
			{ name: 'Zaryad', latex: L`Q=It` },
			{ name: 'Faradey (massa)', latex: L`m=\frac{MIt}{nF}` },
			{ name: 'Elektronlar moli', latex: L`n(e^-)=\frac{Q}{F}` },
			{ name: 'Nernst', latex: L`E=E^\circ-\frac{RT}{nF}\ln Q` },
			{ name: 'Gibbs va E', latex: L`\Delta G=-nFE` },
			{ name: 'Katod umumiy', latex: L`M^{z+}+ze^-\rightarrow M` },
			{ name: 'Anod umumiy', latex: L`2Cl^-\rightarrow Cl_2+2e^-` },
			{ name: 'Elektroliz mol', latex: L`n=\frac{Q}{zF}` },
			{ name: 'Elektroliz massa', latex: L`m=nM` },
			{ name: 'Tok zichligi', latex: L`j=\frac{I}{S}` },
			{ name: 'Qarshilik', latex: L`R=\rho\frac{\ell}{S}` },
		],
	},
	{
		key: 'termokimyo',
		label: 'Termokimyo',
		items: [
			{ name: 'Issiqlik', latex: L`q=mc\Delta T` },
			{ name: 'Kalorimetriya', latex: L`\sum q=0` },
			{ name: 'Entalpiya', latex: L`\Delta H=H_2-H_1` },
			{ name: 'Gess', latex: L`\Delta H=\sum \Delta H_i` },
			{
				name: "Hosil bo'lish (umumiy)",
				latex: L`\Delta H^\circ=\sum \nu\Delta H_f^\circ(prod)-\sum \nu\Delta H_f^\circ(reakt)`,
			},
			{ name: "Bog' energiyasi (taxmin)", latex: L`\Delta H\approx \sum E(uzish)-\sum E(hosil)` },
			{ name: 'Erish', latex: L`Q=\lambda m` },
			{ name: "Bug'lanish", latex: L`Q=Lm` },
			{ name: "Issiqlik sig'imi", latex: L`C=mc` },
			{ name: 'Solishtirma issiqlik', latex: L`c=\frac{q}{m\Delta T}` },
			{ name: 'Ichki energiya (monoatom)', latex: L`U=\frac{3}{2}nRT` },
			{ name: 'Carnot FIK', latex: L`\eta=1-\frac{T_2}{T_1}` },
		],
	},
	{
		key: 'muvozanat',
		label: 'Muvozanat',
		items: [
			{ name: 'Kc', latex: L`K_c=\frac{[C]^c[D]^d}{[A]^a[B]^b}` },
			{ name: 'Qc', latex: L`Q_c=\frac{[C]^c[D]^d}{[A]^a[B]^b}` },
			{ name: 'Kp', latex: L`K_p=K_c(RT)^{\Delta n}` },
			{ name: 'Le-Şatele', latex: L`\text{ta\'sir}\Rightarrow\text{siljish}` },
			{ name: 'Dissots. daraja', latex: L`\alpha=\frac{n_{diss}}{n_0}` },
			{ name: 'Ksp', latex: L`K_{sp}=[M^{m+}]^m[A^{n-}]^n` },
			{ name: 'Ksp (MA)', latex: L`K_{sp}=s^2` },
			{ name: 'Bufer misol', latex: L`pH=pK_a+\log\frac{[NH_3]}{[NH_4^+]}` },
			{ name: "Van't-Hoff", latex: L`\pi=iCRT` },
			{ name: 'Ion kuchi', latex: L`I=\frac{1}{2}\sum c_i z_i^2` },
			{ name: 'Tezlik (umumiy)', latex: L`v=k[A]^\alpha[B]^\beta` },
			{ name: 'ln shakl', latex: L`\ln k=\ln A-\frac{E_a}{RT}` },
		],
	},
	{
		key: 'organik',
		label: 'Organik',
		items: [
			{ name: 'Alkanlar', latex: L`C_nH_{2n+2}` },
			{ name: 'Alkenlar', latex: L`C_nH_{2n}` },
			{ name: 'Alkinlar', latex: L`C_nH_{2n-2}` },
			{ name: 'Spirtlar', latex: L`C_nH_{2n+1}OH` },
			{ name: 'Aldegidlar', latex: L`R-CHO` },
			{ name: 'Ketonlar', latex: L`R-CO-R` },
			{ name: 'Karboksil kislotalar', latex: L`R-COOH` },
			{ name: 'Esterlanish', latex: L`RCOOH + R'OH \rightleftharpoons RCOOR' + H_2O` },
			{ name: 'Alkan xlorlanish', latex: L`RH + Cl_2 \overset{h\nu}{\rightarrow} RCl + HCl` },
			{ name: "Qo'shilish (H2)", latex: L`C=C + H_2 \rightarrow C-C` },
			{ name: 'Etilen gidratlanish', latex: L`C_2H_4 + H_2O \rightarrow C_2H_5OH` },
			{ name: 'Etanol oksidlanish', latex: L`C_2H_5OH + [O] \rightarrow CH_3CHO + H_2O` },
		],
	},
];
