import { z } from 'zod';

export const ContactSchema = z.object({
  nome_completo: z.string().min(1, 'Nome completo é obrigatório'),
  cargo_desejado: z.string().optional(),
  cidade: z.string().min(1, 'Cidade é obrigatória'),
  estado: z.string().min(1, 'Estado é obrigatório'),
  telefone: z.string().min(1, 'Telefone é obrigatório'),
  email: z.string().email('Email inválido'),
  linkedin_url: z.string().url('URL do LinkedIn inválida').or(z.literal('')).optional(),
  github_portfolio_url: z.string().url('URL do GitHub/Portfólio inválida').or(z.literal('')).optional(),
});

export const CompetenciesSchema = z.object({
  hard_skills: z.array(z.string()).min(1, 'Pelo menos uma hard skill é necessária'),
  sistemas_ferramentas: z.array(z.string()).min(1, 'Pelo menos um sistema/ferramenta é necessário'),
  soft_skills_idiomas: z.array(z.string()).min(1, 'Pelo menos um idioma ou soft skill é necessário'),
});

export const ExperienceSchema = z.object({
  cargo: z.string().min(1, 'Cargo é obrigatório'),
  empresa: z.string().min(1, 'Empresa é obrigatória'),
  data_inicio: z.string().min(1, 'Data de início é obrigatória'),
  data_fim: z.string().min(1, 'Data de fim é obrigatória'),
  conquistas_e_atividades: z.array(z.string()).min(1, 'Pelo menos uma conquista/atividade é necessária'),
});

export const EducationSchema = z.object({
  curso: z.string().min(1, 'Curso é obrigatório'),
  instituicao: z.string().min(1, 'Instituição é obrigatória'),
  ano_conclusao: z.string().min(1, 'Ano de conclusão é obrigatório'),
});

export const CertificationSchema = z.object({
  nome_item: z.string().min(1, 'Nome da certificação/curso é obrigatório'),
  instituicao_emissora: z.string().optional(),
  ano: z.string().optional(),
});

export const ResumeSchema = z.object({
  dados_contato: ContactSchema,
  resumo_profissional: z.string().min(1, 'Resumo profissional é obrigatório'),
  competencias: CompetenciesSchema,
  experiencias_profissionais: z.array(ExperienceSchema),
  formacao_academica: z.array(EducationSchema),
  certificacoes_cursos: z.array(CertificationSchema),
});

export type Contact = z.infer<typeof ContactSchema>;
export type Competencies = z.infer<typeof CompetenciesSchema>;
export type Experience = z.infer<typeof ExperienceSchema>;
export type Education = z.infer<typeof EducationSchema>;
export type Certification = z.infer<typeof CertificationSchema>;
export type Resume = z.infer<typeof ResumeSchema>;
