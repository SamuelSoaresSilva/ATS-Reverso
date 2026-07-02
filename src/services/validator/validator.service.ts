import { ResumeSchema, Resume } from '../../schemas/resume.schema';

export class ValidatorService {
  /**
   * Valida se um currículo estruturado segue exatamente o schema Zod definido.
   * Retorna os dados validados e limpos.
   * Lança um erro detalhado caso a validação falhe.
   */
  validate(data: any): Resume {
    const result = ResumeSchema.safeParse(data);
    
    if (!result.success) {
      const formattedErrors = result.error.errors.map(err => {
        return `- Campo "${err.path.join('.')}": ${err.message}`;
      }).join('\n');

      throw new Error(`Erro de validação do schema do currículo:\n${formattedErrors}`);
    }

    return result.data;
  }

  /**
   * Verifica se o objeto de currículo atende aos requisitos básicos sem lançar exceções.
   */
  isValid(data: any): boolean {
    return ResumeSchema.safeParse(data).success;
  }
}
