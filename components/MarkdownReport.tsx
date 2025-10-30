import React from 'react';

interface MarkdownReportProps {
  content: string;
}

// A simple markdown parser to convert the AI's response to styled HTML.
// It handles titles (#), bold text (**), and lists (-).
function parseMarkdown(text: string): string {
  const lines = text.split('\n');
  let html = '';
  let inList = false;

  const closeList = () => {
    if (inList) {
      html += '</ul>';
      inList = false;
    }
  };

  for (const line of lines) {
    // Main Title (#)
    if (line.startsWith('# ')) {
      closeList();
      html += `<h1 class="text-2xl font-bold text-white/90 mb-3">${line.substring(2)}</h1>`;
    }
    // Bolded Milestone Titles (**)
    else if (line.startsWith('**') && line.endsWith('**')) {
      closeList();
      html += `<h2 class="text-xl font-semibold text-white/80 mt-4 mb-2">${line.substring(2, line.length - 2)}</h2>`;
    }
    // List items (-)
    else if (line.trim().startsWith('- ')) {
      if (!inList) {
        html += '<ul class="list-disc list-inside space-y-1 pl-2">';
        inList = true;
      }
      html += `<li class="text-white/70 leading-relaxed">${line.trim().substring(2)}</li>`;
    }
    // Paragraphs (anything else)
    else if (line.trim() !== '') {
      closeList();
      html += `<p class="text-white/80 mb-2 leading-relaxed">${line}</p>`;
    } else {
        // If the line is empty, it might signify the end of a list or a paragraph break.
        closeList();
    }
  }

  // If the text ends with a list, we need to close the <ul> tag.
  closeList();

  return html;
}


export function MarkdownReport({ content }: MarkdownReportProps) {
  const htmlContent = parseMarkdown(content);
  return (
    <div className="max-w-[85%] text-lg break-words" dangerouslySetInnerHTML={{ __html: htmlContent }} />
  );
}