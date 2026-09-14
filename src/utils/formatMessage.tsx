import React from 'react';

/**
 * Formats inline markdown elements like **bold** and `code`.
 */
export function formatInlineMarkdown(text: string): React.ReactNode {
  if (!text) return null;
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={idx} className="font-bold text-current">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code key={idx} className="px-1.5 py-0.5 rounded bg-slate-800/40 font-mono text-[11px] text-amber-300">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

/**
 * Renders structured markdown text into clean React nodes (paragraphs, bullet lists, bold text)
 * completely removing raw markdown syntax symbols like ** or ###.
 */
export function renderFormattedMessage(text: string): React.ReactNode {
  if (!text) return null;

  // Clean raw markdown heading syntax e.g. "### Header" -> "**Header**"
  const cleanHeadingText = text.replace(/^#+\s*(.*?)$/gm, '**$1**');
  const paragraphs = cleanHeadingText.split(/\n\n+/);

  return (
    <div className="space-y-2 leading-relaxed">
      {paragraphs.map((p, pIdx) => {
        const lines = p.split('\n').filter(Boolean);
        const isList = lines.length > 0 && lines.every(l => l.trim().startsWith('-') || l.trim().startsWith('•') || l.trim().startsWith('*'));

        if (isList) {
          return (
            <ul key={pIdx} className="space-y-1.5 my-1 pl-1">
              {lines.map((line, lIdx) => {
                const cleanLine = line.trim().replace(/^[-•*]\s*/, '');
                return (
                  <li key={lIdx} className="flex items-start gap-2">
                    <span className="text-indigo-400 font-bold select-none shrink-0">•</span>
                    <span className="flex-1">{formatInlineMarkdown(cleanLine)}</span>
                  </li>
                );
              })}
            </ul>
          );
        }

        return (
          <div key={pIdx}>
            {lines.map((line, lIdx) => (
              <React.Fragment key={lIdx}>
                {lIdx > 0 && <br />}
                {formatInlineMarkdown(line)}
              </React.Fragment>
            ))}
          </div>
        );
      })}
    </div>
  );
}
