import { useMemo } from 'react';
import DOMPurify from 'dompurify';

interface HtmlRendererProps {
	content: string;
	inline?: boolean;
	className?: string;
}

export function HtmlRenderer({ content, inline = false, className }: HtmlRendererProps) {
	const sanitized = useMemo(() => {
		// NOTE: Word/Python import returns HTML that can include inline images:
		//   <img src="data:image/..."> (including SVG data URLs for formulas)
		// DOMPurify's defaults are conservative about URL schemes, so we explicitly
		// allow safe image-related tags/attrs + data: URLs.
		return DOMPurify.sanitize(content || '', {
			USE_PROFILES: { html: true, svg: true, mathMl: true },
			ADD_TAGS: ['img', 'svg', 'math', 'mi', 'mn', 'mo', 'mrow', 'msup', 'msub', 'mfrac', 'msqrt'],
			ADD_ATTR: ['src', 'alt', 'width', 'height', 'style', 'viewBox', 'xmlns'],
			// Allow https and data URLs (used for embedded images/formula SVGs)
			ALLOWED_URI_REGEXP: /^(?:(?:https?|data):|[^a-z]|[a-z+\.\-]+(?:[^a-z+\.\-:]|$))/i,
		});
	}, [content]);

	if (inline) {
		return <span className={className} dangerouslySetInnerHTML={{ __html: sanitized }} />;
	}
	return <div className={className} dangerouslySetInnerHTML={{ __html: sanitized }} />;
}
