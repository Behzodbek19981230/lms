import { useMemo } from 'react';
import DOMPurify from 'dompurify';

interface HtmlRendererProps {
  content: string;
  inline?: boolean;
  className?: string;
}

export function HtmlRenderer({ content, inline = false, className }: HtmlRendererProps) {
  const sanitized = useMemo(() => {
    // Basic sanitation; DOMPurify by default removes scripts/events
    return DOMPurify.sanitize(content || '');
  }, [content]);

  if (inline) {
    return <span className={className} dangerouslySetInnerHTML={{ __html: sanitized }} />;
  }
  return <div className={className} dangerouslySetInnerHTML={{ __html: sanitized }} />;
}
