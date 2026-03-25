import pdf from 'pdf-parse-fork';

/**
 * Extracts text from a PDF buffer using pdf-parse-fork (ESM friendly).
 */
export async function extractPdfText(buffer) {
  try {
    const data = await pdf(buffer);
    return data?.text || '';
  } catch (error) {
    console.error('PDF Extraction Error:', error);
    throw new Error('Failed to extract text from PDF: ' + error.message);
  }
}
