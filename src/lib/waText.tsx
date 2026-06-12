import React from 'react';

// Render teks gaya WhatsApp:
//   *tebal*      -> bold
//   _miring_     -> italic
//   ~coret~      -> strikethrough
//   ```mono```   -> monospace
// Aman dari XSS (tidak pakai dangerouslySetInnerHTML). Newline dijaga via CSS pre-wrap.
// Catatan: pola non-nested (umum dipakai di WA); nesting kompleks tidak diproses.

const TOKEN = /(```[\s\S]+?```|\*[^*\n]+\*|_[^_\n]+_|~[^~\n]+~)/g;

export function renderWaText(text: string): React.ReactNode {
  if (!text) return null;
  const parts = text.split(TOKEN);
  return parts.map((part, i) => {
    if (!part) return null;
    if (part.length > 6 && part.startsWith('```') && part.endsWith('```')) {
      return <code key={i} className="wa-mono">{part.slice(3, -3)}</code>;
    }
    if (part.length > 2 && part.startsWith('*') && part.endsWith('*')) {
      return <strong key={i}>{part.slice(1, -1)}</strong>;
    }
    if (part.length > 2 && part.startsWith('_') && part.endsWith('_')) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    if (part.length > 2 && part.startsWith('~') && part.endsWith('~')) {
      return <s key={i}>{part.slice(1, -1)}</s>;
    }
    return part;
  });
}
