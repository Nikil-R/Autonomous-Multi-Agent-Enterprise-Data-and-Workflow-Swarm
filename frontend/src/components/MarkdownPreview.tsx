import React from 'react';

interface MarkdownPreviewProps {
  content: string;
}

export const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({ content }) => {
  if (!content) return null;

  // Split lines to handle headings, bullet points, numbered lists, blockquotes, code blocks, and paragraphs
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];

  let inCodeBlock = false;
  let codeBuffer: string[] = [];

  const parseInline = (text: string): React.ReactNode[] => {
    // Regex for bold (**text** or __text__), code (`code`), italic (*text* or _text_)
    // Process tokens in sequence: `code`, **bold**, *italic*
    const tokens: React.ReactNode[] = [];
    let remaining = text;
    let keyIdx = 0;

    while (remaining.length > 0) {
      // Inline code `...`
      const codeMatch = remaining.match(/^`([^`]+)`/);
      if (codeMatch) {
        tokens.push(
          <code key={`code-${keyIdx++}`} className="inline-code">
            {codeMatch[1]}
          </code>
        );
        remaining = remaining.slice(codeMatch[0].length);
        continue;
      }

      // Bold **...** or __...__
      const boldMatch = remaining.match(/^(\*\*|__)(.*?)\1/);
      if (boldMatch) {
        tokens.push(
          <strong key={`bold-${keyIdx++}`} className="text-strong">
            {boldMatch[2]}
          </strong>
        );
        remaining = remaining.slice(boldMatch[0].length);
        continue;
      }

      // Italic *...* or _..._
      const italicMatch = remaining.match(/^(\*|_)(.*?)\1/);
      if (italicMatch && !remaining.startsWith('**') && !remaining.startsWith('__')) {
        tokens.push(
          <em key={`italic-${keyIdx++}`} className="text-em">
            {italicMatch[2]}
          </em>
        );
        remaining = remaining.slice(italicMatch[0].length);
        continue;
      }

      // Plain text up to the next special character
      const nextSpecial = remaining.search(/[`*_]/);
      if (nextSpecial === -1) {
        tokens.push(remaining);
        break;
      } else if (nextSpecial === 0) {
        // Special character didn't match a complete markdown tag; treat as literal
        tokens.push(remaining[0]);
        remaining = remaining.slice(1);
      } else {
        tokens.push(remaining.slice(0, nextSpecial));
        remaining = remaining.slice(nextSpecial);
      }
    }

    return tokens;
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];

    // Code blocks ```
    if (rawLine.trim().startsWith('```')) {
      if (inCodeBlock) {
        elements.push(
          <pre key={`code-block-${i}`} className="code-block-preview">
            <code>{codeBuffer.join('\n')}</code>
          </pre>
        );
        codeBuffer = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(rawLine);
      continue;
    }

    const trimmed = rawLine.trim();

    // Empty lines (paragraph separator)
    if (!trimmed) {
      elements.push(<div key={`spacer-${i}`} className="paragraph-spacer" />);
      continue;
    }

    // Headings
    if (trimmed.startsWith('### ')) {
      elements.push(
        <h4 key={`h4-${i}`} className="preview-h4">
          {parseInline(trimmed.slice(4))}
        </h4>
      );
      continue;
    }
    if (trimmed.startsWith('## ')) {
      elements.push(
        <h3 key={`h3-${i}`} className="preview-h3">
          {parseInline(trimmed.slice(3))}
        </h3>
      );
      continue;
    }
    if (trimmed.startsWith('# ')) {
      elements.push(
        <h2 key={`h2-${i}`} className="preview-h2">
          {parseInline(trimmed.slice(2))}
        </h2>
      );
      continue;
    }

    // Bullet lists (- or * or •)
    if (/^[-*•]\s+/.test(trimmed)) {
      const itemText = trimmed.replace(/^[-*•]\s+/, '');
      elements.push(
        <div key={`bullet-${i}`} className="preview-bullet-item">
          <span className="bullet-dot" />
          <span className="bullet-text">{parseInline(itemText)}</span>
        </div>
      );
      continue;
    }

    // Numbered lists (1. or 2.)
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (numMatch) {
      elements.push(
        <div key={`num-${i}`} className="preview-bullet-item">
          <span className="bullet-num">{numMatch[1]}.</span>
          <span className="bullet-text">{parseInline(numMatch[2])}</span>
        </div>
      );
      continue;
    }

    // Blockquote (> ...)
    if (trimmed.startsWith('> ')) {
      elements.push(
        <blockquote key={`quote-${i}`} className="preview-blockquote">
          {parseInline(trimmed.slice(2))}
        </blockquote>
      );
      continue;
    }

    // Regular line / paragraph
    elements.push(
      <p key={`p-${i}`} className="preview-paragraph">
        {parseInline(trimmed)}
      </p>
    );
  }

  // Flush open code block if any
  if (inCodeBlock && codeBuffer.length > 0) {
    elements.push(
      <pre key="code-block-end" className="code-block-preview">
        <code>{codeBuffer.join('\n')}</code>
      </pre>
    );
  }

  return <div className="rendered-preview-content">{elements}</div>;
};
