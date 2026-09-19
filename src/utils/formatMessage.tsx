import React from 'react';

/**
 * Parses inline markdown tokens (**bold**, *italic*, `code`) into React elements
 * while removing stray syntax, raw quotes, and doc-id artifacts.
 */
export function formatInlineMarkdown(text: string): React.ReactNode {
  if (!text) return null;

  // Clean raw document codes e.g. (`BFT-HR-011`) and leading quote marks
  const clean = text
    .replace(/\s*\(`?[A-Za-z0-9]+-[A-Za-z0-9]+-[A-Za-z0-9]+`?\)?/g, '')
    .replace(/^>\s*/, '');

  const parts: React.ReactNode[] = [];
  // Tokenize bold (**...**) and inline code (`...`)
  const regex = /(\*\*([^*\n]+)\*\*|`([^`\n]+)`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(clean)) !== null) {
    if (match.index > lastIndex) {
      const rawPlain = clean.substring(lastIndex, match.index);
      const cleanPlain = rawPlain.replace(/[*_#>`]/g, '');
      if (cleanPlain) parts.push(cleanPlain);
    }
    if (match[2]) {
      // Bold text - clean any stray symbols inside
      const boldText = match[2].replace(/[*_#>`]/g, '').trim();
      if (boldText) {
        parts.push(
          <strong key={match.index} className="font-semibold text-current">
            {boldText}
          </strong>
        );
      }
    } else if (match[3]) {
      // Inline code
      parts.push(
        <code key={match.index} className="px-1.5 py-0.5 bg-black/5 dark:bg-white/10 rounded font-mono text-xs">
          {match[3]}
        </code>
      );
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < clean.length) {
    const rawTail = clean.substring(lastIndex);
    const cleanTail = rawTail.replace(/[*_#>`]/g, '');
    if (cleanTail) parts.push(cleanTail);
  }

  return parts.length > 0 ? parts : clean.replace(/[*_#>`]/g, '');
}

/**
 * Renders structured markdown text into clean, ChatGPT-like React nodes:
 * - Paragraphs with formatted bold leads
 * - Numbered lists (1., 2., 3.)
 * - Bulleted lists (-, *, •)
 * - Blockquotes (with subtle styled border and no raw '>' character)
 * - Headings (#, ##, ###) formatted as styled titles
 */
export function renderFormattedMessage(text: string): React.ReactNode {
  if (!text) return null;

  // Clean raw document codes e.g. (`BFT-HR-011`)
  const cleanedText = text.replace(/\s*\(`?[A-Za-z0-9]+-[A-Za-z0-9]+-[A-Za-z0-9]+`?\)?/g, '');

  const rawBlocks = cleanedText.split(/\n\n+/);

  return (
    <div className="space-y-2.5 leading-relaxed text-inherit">
      {rawBlocks.map((block, bIdx) => {
        const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
        if (lines.length === 0) return null;

        // 1. Check if block is a Heading (e.g. ### Heading or ## Heading)
        if (lines.length === 1 && lines[0].startsWith('#')) {
          const headerText = lines[0].replace(/^#+\s*/, '');
          return (
            <div key={bIdx} className="font-semibold text-sm sm:text-base text-current tracking-tight mt-2 mb-0.5">
              {formatInlineMarkdown(headerText)}
            </div>
          );
        }

        // 2. Check if block is a Blockquote (e.g. > Quote)
        const isBlockquote = lines.every(l => l.startsWith('>'));
        if (isBlockquote) {
          return (
            <div
              key={bIdx}
              className="border-l-2 border-indigo-400/60 dark:border-indigo-400 pl-3 py-1 my-1.5 italic text-slate-700 dark:text-slate-300 text-sm bg-indigo-50/20 dark:bg-indigo-950/20 rounded-r"
            >
              {lines.map((l, lIdx) => {
                const quoteText = l.replace(/^>\s*/, '');
                return (
                  <p key={lIdx}>
                    {formatInlineMarkdown(quoteText)}
                  </p>
                );
              })}
            </div>
          );
        }

        // 3. Check if block is a Numbered List (e.g. 1. Item)
        const isNumberedList = lines.every(l => /^\d+[.)]\s+/.test(l));
        if (isNumberedList) {
          return (
            <ol key={bIdx} className="space-y-1.5 my-1.5 pl-1">
              {lines.map((line, lIdx) => {
                const match = line.match(/^(\d+)[.)]\s+(.*)$/);
                const num = match ? match[1] : `${lIdx + 1}`;
                const content = match ? match[2] : line;
                return (
                  <li key={lIdx} className="flex items-start gap-2">
                    <span className="text-indigo-500 dark:text-indigo-400 font-semibold select-none shrink-0 text-xs mt-0.5">
                      {num}.
                    </span>
                    <span className="flex-1">
                      {formatInlineMarkdown(content)}
                    </span>
                  </li>
                );
              })}
            </ol>
          );
        }

        // 4. Check if block is a Bulleted List (e.g. - Item, * Item, • Item)
        const isBulletList = lines.every(l => /^[-*•□]\s+/.test(l) || l.startsWith('-') || l.startsWith('*') || l.startsWith('•'));
        if (isBulletList) {
          return (
            <ul key={bIdx} className="space-y-1.5 my-1.5 pl-1">
              {lines.map((line, lIdx) => {
                const cleanLine = line.replace(/^[-*•□]\s*/, '');
                return (
                  <li key={lIdx} className="flex items-start gap-2">
                    <span className="text-indigo-500 dark:text-indigo-400 font-bold select-none shrink-0">•</span>
                    <span className="flex-1">
                      {formatInlineMarkdown(cleanLine)}
                    </span>
                  </li>
                );
              })}
            </ul>
          );
        }

        // 5. Standard paragraph / mixed lines
        return (
          <div key={bIdx} className="text-inherit">
            {lines.map((line, lIdx) => {
              if (/^[-*•□]\s+/.test(line)) {
                return (
                  <div key={lIdx} className="flex items-start gap-2 my-1 pl-1">
                    <span className="text-indigo-500 dark:text-indigo-400 font-bold select-none shrink-0">•</span>
                    <span className="flex-1">{formatInlineMarkdown(line.replace(/^[-*•□]\s*/, ''))}</span>
                  </div>
                );
              }
              if (/^\d+[.)]\s+/.test(line)) {
                const m = line.match(/^(\d+)[.)]\s+(.*)$/);
                return (
                  <div key={lIdx} className="flex items-start gap-2 my-1 pl-1">
                    <span className="text-indigo-500 dark:text-indigo-400 font-semibold select-none shrink-0 text-xs mt-0.5">{m ? m[1] : '1'}.</span>
                    <span className="flex-1">{formatInlineMarkdown(m ? m[2] : line)}</span>
                  </div>
                );
              }
              if (line.startsWith('>')) {
                return (
                  <div key={lIdx} className="border-l-2 border-indigo-400/60 dark:border-indigo-400 pl-3 py-1 my-1.5 italic text-sm">
                    {formatInlineMarkdown(line.replace(/^>\s*/, ''))}
                  </div>
                );
              }
              if (line.startsWith('#')) {
                return (
                  <div key={lIdx} className="font-semibold text-sm sm:text-base text-current tracking-tight mt-2 mb-0.5">
                    {formatInlineMarkdown(line.replace(/^#+\s*/, ''))}
                  </div>
                );
              }
              return (
                <p key={lIdx} className={lIdx > 0 ? "mt-1.5" : ""}>
                  {formatInlineMarkdown(line)}
                </p>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
