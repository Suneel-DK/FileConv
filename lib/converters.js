// lib/converters.js — all conversion logic

const { marked } = require('marked');
const TurndownService = require('turndown');
const { Document, Paragraph, HeadingLevel, TextRun } = require('docx');
const mammoth = require('mammoth');
const pdfParse = require('pdf-parse');

function markdownToTxt(mdText) {
  return mdText
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/!\[.*?\]\([^)]+\)/g, '')
    .replace(/^[-*+]\s+/gm, '• ')
    .replace(/^\d+\.\s+/gm, (m) => m)
    .replace(/^>\s+/gm, '')
    .replace(/^---+$/gm, '─'.repeat(40))
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function txtToMarkdown(txt) {
  return txt.split('\n').map(line => {
    const s = line.trim();
    if (!s) return '';
    if (/^[A-Z][A-Z\s\d:]{2,59}$/.test(s) && s === s.toUpperCase()) {
      return `## ${s.charAt(0) + s.slice(1).toLowerCase()}`;
    }
    if (/^[-*•]\s+/.test(s)) return `- ${s.replace(/^[-*•]\s+/, '')}`;
    return s;
  }).join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function markdownToHtml(mdText) {
  return marked.parse(mdText, { gfm: true, breaks: true });
}

async function markdownToDocx(mdText) {
  const lines = mdText.split('\n');
  const children = [];
  let inCode = false;
  let codeLines = [];

  for (const line of lines) {
    if (line.startsWith('```')) {
      if (inCode) {
        children.push(new Paragraph({
          children: [new TextRun({ text: codeLines.join('\n'), font: 'Courier New', size: 18 })],
          shading: { fill: 'F4F4F4' },
          spacing: { after: 120 },
        }));
        codeLines = [];
      }
      inCode = !inCode;
      continue;
    }
    if (inCode) { codeLines.push(line); continue; }

    if (line.startsWith('### ')) {
      children.push(new Paragraph({ text: line.slice(4), heading: HeadingLevel.HEADING_3 }));
    } else if (line.startsWith('## ')) {
      children.push(new Paragraph({ text: line.slice(3), heading: HeadingLevel.HEADING_2 }));
    } else if (line.startsWith('# ')) {
      children.push(new Paragraph({ text: line.slice(2), heading: HeadingLevel.HEADING_1 }));
    } else if (/^[-*+]\s/.test(line)) {
      children.push(new Paragraph({ text: line.slice(2), bullet: { level: 0 } }));
    } else if (line.trim() === '') {
      children.push(new Paragraph({ text: '' }));
    } else {
      const clean = line.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1').replace(/`([^`]+)`/g, '$1');
      children.push(new Paragraph({ text: clean, spacing: { after: 80 } }));
    }
  }

  const doc = new Document({ sections: [{ properties: {}, children }] });
  const { Packer } = require('docx');
  return Packer.toBuffer(doc);
}

async function docxToMarkdown(buffer) {
  const result = await mammoth.convertToHtml({ buffer });
  const td = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });
  return td.turndown(result.value);
}

async function pdfToMarkdown(buffer) {
  const data = await pdfParse(buffer);
  return txtToMarkdown(data.text);
}

module.exports = {
  markdownToTxt,
  txtToMarkdown,
  markdownToHtml,
  markdownToDocx,
  docxToMarkdown,
  pdfToMarkdown,
  markdownToHtmlForPdf: markdownToHtml,
};
