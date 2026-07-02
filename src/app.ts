import * as path from 'path';
import * as fs from 'fs/promises';
import { ParserService } from './services/parser/parser.service';
import { GeminiService } from './services/gemini/gemini.service';
import { ValidatorService } from './services/validator/validator.service';
import { RendererService } from './services/renderer/renderer.service';
import { readTextFile } from './utils/file';

/**
 * Função para exibir instruções de uso do CLI.
 */
function showUsage() {
  console.log(`
Uso: npm start -- --resume <caminho_curriculo> --vacancy <caminho_vaga> --company <nome_empresa> [--output <pasta_saida>]

Parâmetros:
  -r, --resume   Caminho para o currículo base (suporta JSON, PDF, DOCX, TXT, MD)
  -v, --vacancy  Caminho para o arquivo de texto com a descrição da vaga (TXT ou MD)
  -c, --company  Nome da empresa contratante
  -o, --output   (Opcional) Diretório onde serão salvos os resultados (padrão: ./output)
`);
}

/**
 * Ponto de entrada da CLI.
 */
async function main() {
  const args = process.argv.slice(2);
  
  let resumePath = '';
  let vacancyPath = '';
  let companyName = '';
  let outputDir = path.join(process.cwd(), 'output');

  // Processa argumentos CLI básicos
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--resume' || arg === '-r') {
      resumePath = args[++i];
    } else if (arg === '--vacancy' || arg === '-v') {
      vacancyPath = args[++i];
    } else if (arg === '--company' || arg === '-c') {
      companyName = args[++i];
    } else if (arg === '--output' || arg === '-o') {
      outputDir = args[++i];
    } else if (arg === '--help' || arg === '-h') {
      showUsage();
      process.exit(0);
    }
  }

  if (!resumePath || !vacancyPath || !companyName) {
    console.error('Erro: Parâmetros obrigatórios ausentes.');
    showUsage();
    process.exit(1);
  }

  try {
    console.log('--- Iniciando Gerador Inteligente de Currículos ---');
    console.log(`Currículo Base: ${resumePath}`);
    console.log(`Descrição da Vaga: ${vacancyPath}`);
    console.log(`Empresa: ${companyName}`);
    console.log(`Pasta de Saída: ${outputDir}`);

    // Inicializa os serviços
    const parserService = new ParserService();
    const geminiService = new GeminiService();
    const validatorService = new ValidatorService();
    const rendererService = new RendererService();

    // Garante que a pasta de saída exista
    await fs.mkdir(outputDir, { recursive: true });

    // 1. Parse do Currículo Base
    console.log('\n[1/5] Lendo e estruturando currículo base...');
    const baseResume = await parserService.parseResume(resumePath);
    
    // Salva o JSON estruturado inicial para auditoria
    const rawJsonPath = path.join(outputDir, '1_curriculo_base_estruturado.json');
    await fs.writeFile(rawJsonPath, JSON.stringify(baseResume, null, 2), 'utf-8');
    console.log(`Currículo base estruturado salvo em: ${rawJsonPath}`);

    // 2. Leitura da Descrição da Vaga
    console.log('\n[2/5] Lendo descrição da vaga...');
    const jobDescription = await readTextFile(vacancyPath);

    // 3. Otimização do Currículo usando o Gemini
    console.log('\n[3/5] Adaptando currículo para a vaga e empresa via Gemini...');
    const optimizedResume = await geminiService.optimizeResume(baseResume, jobDescription, companyName);

    // 4. Validação do Schema do Currículo Otimizado
    console.log('\n[4/5] Validando o JSON otimizado com Zod...');
    const validatedResume = validatorService.validate(optimizedResume);

    // Salva o JSON final otimizado
    const optimizedJsonPath = path.join(outputDir, '2_curriculo_otimizado.json');
    await fs.writeFile(optimizedJsonPath, JSON.stringify(validatedResume, null, 2), 'utf-8');
    console.log(`JSON otimizado e validado salvo em: ${optimizedJsonPath}`);

    // 5. Renderização dos Documentos (DOCX e PDF)
    console.log('\n[5/5] Gerando os documentos finais...');
    const templatePath = path.join(process.cwd(), 'Blueprint_Template_Curriculo_ATS.docx');
    
    const docxOutputPath = path.join(outputDir, 'Curriculo_Customizado.docx');
    const pdfOutputPath = path.join(outputDir, 'Curriculo_Customizado.pdf');

    // Gera DOCX
    console.log('- Gerando arquivo DOCX...');
    await rendererService.renderDocx(templatePath, docxOutputPath, validatedResume);
    console.log(`Documento DOCX salvo com sucesso em: ${docxOutputPath}`);

    // Gera PDF (se compatível)
    console.log('- Convertendo DOCX para PDF...');
    await rendererService.convertDocxToPdf(docxOutputPath, pdfOutputPath);
    
    const pdfExists = await fs.access(pdfOutputPath).then(() => true).catch(() => false);
    if (pdfExists) {
      console.log(`Documento PDF salvo com sucesso em: ${pdfOutputPath}`);
    }

    console.log('\n--- Processo Concluído com Sucesso! ---');

  } catch (err: any) {
    console.error('\nErro fatal durante o processamento:');
    console.error(err.message);
    process.exit(1);
  }
}

main();
