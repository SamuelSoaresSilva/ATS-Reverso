import { GoogleGenAI } from '@google/genai';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { readTextFile } from '../../utils/file';
import { Resume, ResumeSchema } from '../../schemas/resume.schema';

dotenv.config();

// Inicializa a API do Google Gemini
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn('AVISO: GEMINI_API_KEY não foi encontrada nas variáveis de ambiente (.env).');
}

const ai = new GoogleGenAI({ apiKey });

export class GeminiService {
  private modelName = 'gemini-3.5-flash';

  /**
   * Converte um currículo em formato de texto livre (ou schema legado) em um JSON estruturado seguindo o schema do projeto.
   */
  async parseRawResume(rawText: string): Promise<Resume> {
    const parserPromptPath = path.join(__dirname, '../../prompts/parser.prompt.md');
    const systemInstruction = await readTextFile(parserPromptPath);

    // Carrega o schema de validação JSON bruto para passar ao Gemini
    const schemaPath = path.join(__dirname, '../../../schemaCurriculo.json');
    const rawSchema = JSON.parse(await readTextFile(schemaPath));

    const response = await ai.models.generateContent({
      model: this.modelName,
      contents: [
        {
          role: 'user',
          parts: [{ text: `Texto do currículo:\n\n${rawText}` }]
        }
      ],
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: rawSchema,
        temperature: 0,
      }
    });

    if (!response.text) {
      throw new Error('A API do Gemini retornou uma resposta vazia ao analisar o currículo.');
    }

    return JSON.parse(response.text) as Resume;
  }

  /**
   * Adapta e otimiza um currículo estruturado para uma vaga específica e contexto de empresa.
   */
  async optimizeResume(
    baseResume: Resume,
    jobDescription: string,
    companyName: string
  ): Promise<Resume> {
    const optimizePromptPath = path.join(__dirname, '../../prompts/optimize.prompt.md');
    const systemInstruction = await readTextFile(optimizePromptPath);

    const schemaPath = path.join(__dirname, '../../../schemaCurriculo.json');
    const rawSchema = JSON.parse(await readTextFile(schemaPath));

    const promptText = `
### CURRÍCULO BASE DO CANDIDATO (JSON):
${JSON.stringify(baseResume, null, 2)}

### DESCRIÇÃO DA VAGA:
${jobDescription}

### NOME DA EMPRESA:
${companyName}
`;

    const response = await ai.models.generateContent({
      model: this.modelName,
      contents: [
        {
          role: 'user',
          parts: [{ text: promptText }]
        }
      ],
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: rawSchema,
        temperature: 0,
      }
    });

    if (!response.text) {
      throw new Error('A API do Gemini retornou uma resposta vazia ao otimizar o currículo.');
    }

    return JSON.parse(response.text) as Resume;
  }
}
