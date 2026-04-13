# FileConv — File Format Converter

Convert between Markdown, TXT, PDF, and DOCX files. Serverless, no database, no build step.

**Live:** https://fileconv.suneeldk.in

## Features

| Conversion | Description |
|---|---|
| MD → TXT | Strips all Markdown syntax |
| MD → PDF | Client-side generation |
| MD → DOCX | Preserves headings, lists, code blocks |
| TXT → MD | Auto-detects structure |
| PDF → MD | Text extraction |
| DOCX → MD | Full formatting conversion |

## Deploy

```bash
# Vercel CLI
vercel

# Or connect GitHub repo to Vercel
```

## Local Development

```bash
npm install
npx vercel dev
```

## Tech Stack

- Frontend: Vanilla HTML/CSS/JS
- API: Vercel serverless functions
- Libraries: marked, turndown, docx, mammoth, pdf-parse, jspdf

## Limits

- Max file size: 10 MB