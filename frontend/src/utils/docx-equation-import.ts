export type DocxTableRow = string[];

function escapeHtml(text: string) {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
}

function toInlineHtmlFromTokens(tokens: Array<{ type: 'text' | 'latex' | 'br'; value?: string }>) {
	let out = '';
	for (const token of tokens) {
		if (token.type === 'br') {
			out += '<br/>';
			continue;
		}
		if (token.type === 'text') {
			out += escapeHtml(token.value || '');
			continue;
		}
		// latex
		const raw = String(token.value || '')
			.replace(/\$/g, '')
			.trim();
		if (!raw) continue;

		// Some converters return display math as \[ ... \]. Wrapping that into $...$ breaks parsing.
		const isDisplayWrapped = /^\\\[[\s\S]*\\\]$/.test(raw);
		let body = raw;
		if (isDisplayWrapped) {
			body = body.replace(/^\\\[/, '').replace(/\\\]$/, '').trim();
		}

		// If a converter emits escaped square brackets (\[Ar\]) inside a formula, treat them as literal brackets.
		body = body.replace(/\\\[/g, '[').replace(/\\\]/g, ']');

		out += isDisplayWrapped ? `$$${body}$$` : `$${body}$`;
	}
	return out.replace(/(<br\s*\/?>\s*){3,}/gi, '<br/><br/>').trim();
}

function getChildElementsByLocalName(parent: Element, localName: string): Element[] {
	return Array.from(parent.childNodes).filter((n): n is Element => {
		return n.nodeType === 1 && (n as Element).localName === localName;
	});
}

function getFirstDescendantByLocalName(root: Element, localName: string): Element | undefined {
	const stack: Element[] = [root];
	while (stack.length) {
		const el = stack.shift()!;
		if (el.localName === localName) return el;
		for (const child of Array.from(el.childNodes)) {
			if (child.nodeType === 1) stack.push(child as Element);
		}
	}
	return undefined;
}

function getValAttr(el: Element | undefined | null): string | null {
	if (!el) return null;
	return el.getAttribute('w:val') || el.getAttribute('val') || null;
}

export async function extractFirstTableRowsWithEquations(arrayBuffer: ArrayBuffer): Promise<DocxTableRow[]> {
	const jszipMod: any = await import('jszip');
	const JSZip: any = jszipMod.default ?? jszipMod;

	const omml2mathmlMod: any = await import('omml2mathml');
	const omml2mathml: any = omml2mathmlMod.default ?? omml2mathmlMod;

	const mathmlToLatexMod: any = await import('mathml-to-latex');
	const mathmlToLatex: any = mathmlToLatexMod.default ?? mathmlToLatexMod;

	const zip = await JSZip.loadAsync(arrayBuffer);
	const docFile = zip.file('word/document.xml');
	if (!docFile) return [];

	const xml = await docFile.async('string');
	const xmlDoc = new DOMParser().parseFromString(xml, 'application/xml');
	if (xmlDoc.getElementsByTagName('parsererror')?.length) return [];

	// Find the most likely questions table.
	// Many DOCX files contain a title table/header table before the actual questions table.
	const allElements = Array.from(xmlDoc.getElementsByTagName('*')) as Element[];
	const tables = allElements.filter((el) => el.localName === 'tbl');
	if (tables.length === 0) return [];
	const serializer = new XMLSerializer();

	const walkCell = (root: Element) => {
		const tokens: Array<{ type: 'text' | 'latex' | 'br'; value?: string }> = [];

		const walk = (node: Node) => {
			if (node.nodeType !== 1) return;
			const el = node as Element;

			// line breaks
			if (el.localName === 'br') {
				tokens.push({ type: 'br' });
				return;
			}

			// text nodes in runs
			if (el.localName === 't') {
				const text = el.textContent ?? '';
				if (text) tokens.push({ type: 'text', value: text });
				return;
			}

			// Word equations (OMML)
			if (el.localName === 'oMath' || el.localName === 'oMathPara') {
				try {
					const ommlXml = serializer.serializeToString(el);
					const mathml = omml2mathml(ommlXml);
					const latex = mathmlToLatex(mathml);
					if (latex) tokens.push({ type: 'latex', value: latex });
				} catch {
					// ignore equation conversion errors
				}
				return;
			}

			for (const child of Array.from(el.childNodes)) walk(child);
		};

		walk(root);
		return toInlineHtmlFromTokens(tokens);
	};

	// Helper to extract+normalize a specific table
	type CellInfo = { html: string; span: number; vMerge: 'restart' | 'continue' | null };
	const extractTable = (tbl: Element): DocxTableRow[] => {
		const rows = getChildElementsByLocalName(tbl, 'tr');
		// First pass: read each tc content + span/merge hints
		const raw: CellInfo[][] = [];
		for (const row of rows) {
			const tcs = getChildElementsByLocalName(row, 'tc');
			const infos: CellInfo[] = tcs.map((tc) => {
				const html = walkCell(tc);
				const gridSpanEl = getFirstDescendantByLocalName(tc, 'gridSpan');
				const span = Math.max(1, parseInt(getValAttr(gridSpanEl) || '1', 10) || 1);
				const vMergeEl = getFirstDescendantByLocalName(tc, 'vMerge');
				const v = vMergeEl ? getValAttr(vMergeEl) || 'continue' : null;
				const vMerge = v ? (v === 'restart' ? 'restart' : 'continue') : null;
				return { html, span, vMerge };
			});
			raw.push(infos);
		}

		// Second pass: normalize to a consistent column array, carrying down vertically merged cells
		const normalized: DocxTableRow[] = [];
		let prevRow: string[] = [];
		for (const rowInfos of raw) {
			const out: string[] = [];
			let col = 0;
			for (const cell of rowInfos) {
				let value = cell.html;
				if (cell.vMerge === 'continue' && prevRow[col]) {
					value = prevRow[col];
				}
				out[col] = value;
				// fill span placeholders
				for (let s = 1; s < cell.span; s++) {
					out[col + s] = out[col + s] ?? '';
				}
				col += cell.span;
			}
			// compact to dense array
			const dense: string[] = [];
			for (let i = 0; i < out.length; i++) dense[i] = out[i] ?? '';
			normalized.push(dense);
			prevRow = dense;
		}

		return normalized;
	};

	const scoreTable = (rows: DocxTableRow[]) => {
		const rowCount = rows.length;
		const maxCols = rows.reduce((m, r) => Math.max(m, r.length), 0);
		// Prefer tables that look like the import template: >= 7 columns.
		const hasTemplateCols = maxCols >= 7 ? 1 : 0;
		return hasTemplateCols * 1_000_000 + maxCols * 1_000 + rowCount;
	};

	let bestRows: DocxTableRow[] | null = null;
	let bestScore = -1;
	for (const tbl of tables) {
		const rows = extractTable(tbl);
		if (rows.length === 0) continue;
		const s = scoreTable(rows);
		if (s > bestScore) {
			bestRows = rows;
			bestScore = s;
		}
	}

	// Fallback: if everything is weird, still return the first table.
	return bestRows ?? extractTable(tables[0]);
}
