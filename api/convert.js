// api/convert.js — Vercel serverless function

const busboy = require('busboy');
const {
  markdownToTxt,
  txtToMarkdown,
  markdownToDocx,
  docxToMarkdown,
  pdfToMarkdown,
  markdownToHtmlForPdf,
} = require('../lib/converters');

const MAX_BYTES = 10 * 1024 * 1024;

function parseForm(req) {
  return new Promise((resolve, reject) => {
    const fields = {};
    let fileBuffer = null;

    const bb = busboy({ headers: req.headers, limits: { fileSize: MAX_BYTES } });
    bb.on('field', (name, val) => { fields[name] = val; });
    bb.on('file', (name, stream, info) => {
      const chunks = [];
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('end', () => { fileBuffer = Buffer.concat(chunks); });
    });
    bb.on('close', () => resolve({ fields, fileBuffer }));
    bb.on('error', reject);
    req.pipe(bb);
  });
}

const CONVERSIONS = {
  'markdown:txt': (input) => ({ type: 'text', data: markdownToTxt(input), file: 'converted.txt', preview: markdownToTxt(input) }),
  'markdown:pdf': (input) => ({ type: 'html', data: markdownToHtmlForPdf(input), file: 'converted.pdf', preview: null }),
  'markdown:docx': async (input) => ({ type: 'binary', data: await markdownToDocx(input), file: 'converted.docx', preview: null }),
  'txt:markdown': (input) => ({ type: 'text', data: txtToMarkdown(input), file: 'converted.md', preview: txtToMarkdown(input) }),
  'pdf:markdown': async (_, buffer) => ({ type: 'text', data: await pdfToMarkdown(buffer), file: 'converted.md', preview: await pdfToMarkdown(buffer) }),
  'docx:markdown': async (_, buffer) => ({ type: 'text', data: await docxToMarkdown(buffer), file: 'converted.md', preview: await docxToMarkdown(buffer) }),
};

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');

  try {
    const { fields, fileBuffer } = await parseForm(req);
    const { source_format, target_format, text_input } = fields;
    const pairKey = `${source_format}:${target_format}`;

    if (!CONVERSIONS[pairKey]) {
      return res.status(400).json({ error: `Unsupported conversion: ${source_format} → ${target_format}` });
    }

    let inputText = text_input || '';

    if (!fileBuffer && !inputText.trim()) {
      return res.status(400).json({ error: 'Provide a file or paste text.' });
    }

    if (['pdf', 'docx'].includes(source_format) && !fileBuffer) {
      return res.status(400).json({ error: `${source_format.toUpperCase()} conversion requires a file upload.` });
    }

    if (fileBuffer && ['markdown', 'txt'].includes(source_format)) {
      inputText = fileBuffer.toString('utf-8');
    }

    const result = await CONVERSIONS[pairKey](inputText, fileBuffer);

    res.status(200).json({
      ok: true,
      resultType: result.type === 'binary' ? 'binary' : result.type === 'html' ? 'html-for-pdf' : 'text',
      resultData: Buffer.from(result.data, 'utf-8').toString('base64'),
      filename: result.file,
      previewText: result.preview,
    });

  } catch (err) {
    console.error('[convert error]', err);
    res.status(500).json({ error: err.message || 'Conversion failed.' });
  }
};
