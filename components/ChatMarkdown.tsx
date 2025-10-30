import React from 'react';

// This is a more robust markdown parser to handle Neura's specific formatting needs.
function parseChatMarkdown(text: string): string {
    // 1. Pre-process text to be more resilient to formatting errors from the AI model.
    let processedText = text.replace(/\r\n/g, '\n');

    // The following line was removed to prevent incorrectly breaking sentences that contain markdown-like characters (e.g., "5 * 3").
    // processedText = processedText.replace(/(\S)(#{1,6} |> |[*-] |\d+\. )/g, '$1\n\n$2');

    // 2. Split text into blocks based on one or more blank lines.
    const blocks = processedText.trim().split(/\n\s*\n+/);
    
    let finalHtml = '';

    const applyInlineMarkdown = (str: string) => {
        return str
            // Escape HTML to prevent XSS attacks
            .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
            // Apply markdown formatting for bold and italics first
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            // Clean up remaining single asterisks that are likely errors.
            .replace(/([a-zA-Z0-9])\*/g, '$1') // cleanup trailing: word* -> word
            .replace(/\*([a-zA-Z0-9])/g, '$1') // cleanup leading: *word -> word
            .replace(/`([^`]+)`/g, '<code class="bg-black/50 px-1 py-0.5 rounded text-sm text-red-300">$1</code>');
    };

    for (const block of blocks) {
        const trimmedBlock = block.trim();
        // Skip empty blocks or blocks that are just malformed markdown characters like a lone '#'
        if (!trimmedBlock || /^#+$/.test(trimmedBlock)) {
            continue;
        }

        // --- Block-level element processing ---

        // Code blocks (```...```)
        if (trimmedBlock.startsWith('```') && trimmedBlock.includes('```', 3)) {
            const codeContent = trimmedBlock.substring(trimmedBlock.indexOf('\n') + 1, trimmedBlock.lastIndexOf('```')).trim();
            const code = codeContent.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
            finalHtml += `<pre class="bg-black/50 p-3 rounded-lg my-3 text-base text-white/80 overflow-x-auto whitespace-pre-wrap"><code>${code}</code></pre>`;
            continue;
        }

        // Headings
        if (trimmedBlock.startsWith('### ')) {
            finalHtml += `<h3 class="text-xl font-semibold text-white/90 mt-4 mb-2">${applyInlineMarkdown(trimmedBlock.substring(4))}</h3>`;
            continue;
        }
        if (trimmedBlock.startsWith('## ')) {
            finalHtml += `<h2 class="text-2xl font-bold text-white/90 mt-5 mb-3">${applyInlineMarkdown(trimmedBlock.substring(3))}</h2>`;
            continue;
        }
        if (trimmedBlock.startsWith('# ')) {
            finalHtml += `<h1 class="text-3xl font-extrabold text-white/90 mt-6 mb-4">${applyInlineMarkdown(trimmedBlock.substring(2))}</h1>`;
            continue;
        }

        // Blockquotes (>)
        if (trimmedBlock.startsWith('> ')) {
            const quoteContent = trimmedBlock.split('\n').map(line => applyInlineMarkdown(line.replace(/^> ?/, ''))).join('<br />');
            finalHtml += `<blockquote class="border-l-4 border-white/30 pl-4 my-3 text-white/80 italic">${quoteContent}</blockquote>`;
            continue;
        }
        
        // Lists (*, -, 1.)
        const lines = block.split('\n');
        if (lines.every(line => /^\s*([*-]|\d+\.) /.test(line.trim()))) {
            const isOrdered = /^\s*\d+\. /.test(lines[0].trim());
            let listHtml = isOrdered ? '<ol class="list-decimal list-inside space-y-1 pl-4 my-3">' : '<ul class="list-disc list-inside space-y-1 pl-4 my-3">';
            for (const line of lines) {
                if (!line.trim()) continue;
                const itemContent = applyInlineMarkdown(line.trim().replace(/^\s*([*-]|\d+\.) /, ''));
                listHtml += `<li>${itemContent}</li>`;
            }
            listHtml += isOrdered ? '</ol>' : '</ul>';
            finalHtml += listHtml;
            continue;
        }

        // Default to paragraph. Join lines inside a single block with <br> for intentional line breaks.
        // Also cleans up the weird leading "|" character that the AI sometimes produces.
        const cleanedLines = lines.map(line => {
            const trimmedLine = line.trim();
            return trimmedLine.startsWith('|') ? trimmedLine.substring(1).trim() : line;
        });
        finalHtml += `<p class="my-3">${cleanedLines.map(line => applyInlineMarkdown(line)).join('<br />')}</p>`;
    }

    return finalHtml;
}


export function ChatMarkdown({ content }: { content: string }) {
  const htmlContent = parseChatMarkdown(content);
  return <div dangerouslySetInnerHTML={{ __html: htmlContent }} />;
}