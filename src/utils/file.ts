import * as fs from 'fs/promises';
import * as path from 'path';
import pdf from 'pdf-parse';
import mammoth from 'mammoth';

/**
 * Lê o conteúdo de um arquivo de texto.
 */
export async function readTextFile(filePath: string): Promise<string> {
  return fs.readFile(filePath, 'utf-8');
}

/**
 * Extrai o texto cru de um arquivo PDF.
 */
export async function extractTextFromPdf(filePath: string): Promise<string> {
  const buffer = await fs.readFile(filePath);
  const data = await pdf(buffer);
  return data.text;
}

/**
 * Extrai o texto cru de um arquivo Word (DOCX).
 */
export async function extractTextFromDocx(filePath: string): Promise<string> {
  const buffer = await fs.readFile(filePath);
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

/**
 * Lê qualquer um dos formatos suportados (PDF, DOCX, TXT, JSON) e retorna seu texto ou conteúdo JSON.
 */
export async function readResumeFile(filePath: string): Promise<{ type: 'json' | 'text'; content: string }> {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.json') {
    const text = await readTextFile(filePath);
    return { type: 'json', content: text };
  } else if (ext === '.pdf') {
    const text = await extractTextFromPdf(filePath);
    return { type: 'text', content: text };
  } else if (ext === '.docx') {
    const text = await extractTextFromDocx(filePath);
    return { type: 'text', content: text };
  } else if (ext === '.txt' || ext === '.md') {
    const text = await readTextFile(filePath);
    return { type: 'text', content: text };
  } else {
    // Tenta ler como texto simples
    const text = await readTextFile(filePath);
    return { type: 'text', content: text };
  }
}
