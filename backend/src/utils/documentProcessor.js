import mammoth from 'mammoth';
import * as xlsx from 'xlsx';
import officeParser from 'officeparser';
import { extractPdfText } from './pdf.js';

/**
 * Extract text from various document formats
 * @param {Buffer} buffer - The raw file buffer
 * @param {string} mimetype - The MIME type of the file
 * @param {string} filename - The original filename
 * @returns {Promise<string>} - The extracted text
 */
export async function extractTextFromBuffer(buffer, mimetype, filename) {
  const extension = filename.split('.').pop().toLowerCase();

  try {
    // 1. PDF Handler
    if (mimetype === 'application/pdf' || extension === 'pdf') {
      return await extractPdfText(buffer);
    }

    // 2. Word (DOCX) Handler
    if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || extension === 'docx') {
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    }

    // 3. Spreadsheet (XLSX, XLS, CSV) Handler
    if (['xlsx', 'xls', 'csv'].includes(extension) || mimetype.includes('spreadsheet') || mimetype.includes('excel')) {
      const workbook = xlsx.read(buffer, { type: 'buffer' });
      let sheetData = '';
      workbook.SheetNames.forEach(name => {
        sheetData += `\n--- Sheet: ${name} ---\n`;
        sheetData += xlsx.utils.sheet_to_txt(workbook.Sheets[name]);
      });
      return sheetData;
    }

    // 4. Presentation (PPTX) Handler
    if (mimetype === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' || extension === 'pptx') {
      return new Promise((resolve, reject) => {
        officeParser.parseOffice(buffer, (data, err) => {
          if (err) return reject(err);
          resolve(data);
        });
      });
    }

    // 5. JSON Handler
    if (mimetype === 'application/json' || extension === 'json') {
      const json = JSON.parse(buffer.toString('utf-8'));
      return JSON.stringify(json, null, 2);
    }

    // 6. Markdown/Text Handler
    if (['txt', 'md', 'markdown'].includes(extension) || mimetype.includes('text')) {
      return buffer.toString('utf-8');
    }

    // Fallback: Attempt to read as text if unknown
    return buffer.toString('utf-8');
  } catch (error) {
    console.error(`Error extracting text from ${filename}:`, error);
    throw new Error(`The aura engine could not parse this format: ${extension.toUpperCase()}`);
  }
}
