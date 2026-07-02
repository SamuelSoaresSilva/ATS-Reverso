import { readResumeFile } from '../../utils/file';
import { Resume, ResumeSchema } from '../../schemas/resume.schema';
import { GeminiService } from '../gemini/gemini.service';

export class ParserService {
  private geminiService: GeminiService;

  constructor() {
    this.geminiService = new GeminiService();
  }

  /**
   * Analisa e converte qualquer formato de currículo suportado para o JSON padronizado.
   */
  async parseResume(filePath: string): Promise<Resume> {
    const { type, content } = await readResumeFile(filePath);

    if (type === 'json') {
      try {
        const parsed = JSON.parse(content);
        
        // Verifica se já está no formato correto usando Zod
        const validation = ResumeSchema.safeParse(parsed);
        if (validation.success) {
          return validation.data;
        }

        // Se o JSON não for válido no novo schema, podemos pedir para o Gemini remapear.
        // Isso lida automaticamente com schemas legados (como modeloCurriculo.schema.json).
        console.log('JSON de entrada não corresponde ao schema final. Usando o Gemini para remapear...');
        return await this.geminiService.parseRawResume(content);
      } catch (err: any) {
        console.warn(`Falha ao ler JSON: ${err.message}. Tratando como texto livre.`);
        return await this.geminiService.parseRawResume(content);
      }
    } else {
      // É texto extraído de PDF/DOCX/TXT/MD
      console.log('Extraindo dados de texto e convertendo para JSON padronizado via Gemini...');
      return await this.geminiService.parseRawResume(content);
    }
  }
}
