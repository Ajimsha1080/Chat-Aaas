import React from 'react';

/**
 * Formats inline text and strips any stray markdown asterisks (* or **) so no raw symbols ever show on screen.
 */
export function formatInlineMarkdown(text: string): React.ReactNode {
  if (!text) return null;
  const cleanText = text.replace(/\*\*/g, '').replace(/\*/g, '');
  return <span>{cleanText}</span>;
}

/**
 * Renders structured markdown text into clean React nodes (paragraphs, bullet lists)
 * completely removing raw markdown syntax symbols like * or ** or ###.
 */
export function renderFormattedMessage(text: string): React.ReactNode {
  if (!text) return null;

  // Clean raw markdown heading syntax, internal document codes & stray asterisks e.g. "### Header" -> "Header", "`BFT-HR-011`" -> ""
  const cleanedText = text
    .replace(/\s*\(`?[A-Za-z0-9]+-[A-Za-z0-9]+-[A-Za-z0-9]+`?\)?/g, '')
    .replace(/^#+\s*(.*?)$/gm, '$1')
    .replace(/\*\*\*/g, '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '');

  const paragraphs = cleanedText.split(/\n\n+/);

  return (
    <div className="space-y-2 leading-relaxed">
      {paragraphs.map((p, pIdx) => {
        const lines = p.split('\n').filter(Boolean);
        const isList = lines.length > 0 && lines.every(l => l.trim().startsWith('-') || l.trim().startsWith('•'));

        if (isList) {
          return (
            <ul key={pIdx} className="space-y-1.5 my-1 pl-1">
              {lines.map((line, lIdx) => {
                const cleanLine = line.trim().replace(/^[-•]\s*/, '');
                return (
                  <li key={lIdx} className="flex items-start gap-2">
                    <span className="text-indigo-400 font-bold select-none shrink-0">•</span>
                    <span className="flex-1 font-medium">{cleanLine}</span>
                  </li>
                );
              })}
            </ul>
          );
        }

        const isHeader = pIdx === 0 && lines.length === 1 && lines[0].length < 60 && !lines[0].endsWith('.');

        return (
          <div key={pIdx} className={isHeader ? "font-bold text-base text-current tracking-tight mb-1" : ""}>
            {lines.map((line, lIdx) => (
              <React.Fragment key={lIdx}>
                {lIdx > 0 && <br />}
                <span>{line}</span>
              </React.Fragment>
            ))}
          </div>
        );
      })}
    </div>
  );
}
