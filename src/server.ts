import express from 'express';
import multer from 'multer';
import * as path from 'path';
import * as fs from 'fs/promises';
import { EventEmitter } from 'events';
import { ParserService } from './services/parser/parser.service';
import { GeminiService } from './services/gemini/gemini.service';
import { ValidatorService } from './services/validator/validator.service';
import { RendererService } from './services/renderer/renderer.service';
import { readTextFile } from './utils/file';

const app = express();
const port = process.env.PORT || 3000;

// Emissor de eventos global para gerenciar logs e status dos fluxos de execução
const runEvents = new EventEmitter();
runEvents.setMaxListeners(100);

// Configuração do Multer para upload de arquivos
const uploadDir = path.join(process.cwd(), 'output', 'temp_uploads');
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve arquivos estáticos da pasta 'public'
app.use(express.static(path.join(process.cwd(), 'public')));

/**
 * Função assíncrona que executa toda a pipeline e transmite logs detalhados
 */
async function processResumePipeline(
  runId: string,
  resumeFilePath: string,
  resumeOriginalName: string,
  vacancyContent: string,
  companyName: string
) {
  const runOutputDir = path.join(process.cwd(), 'output', 'api_runs', runId);
  
  // Função utilitária para emitir logs de progresso
  const logProgress = (message: string, step: number, status: 'info' | 'success' | 'error' = 'info') => {
    console.log(`[API] [Run ${runId}] Passo ${step}: ${message}`);
    runEvents.emit(runId, { type: 'log', message, step, status });
  };

  try {
    await fs.mkdir(runOutputDir, { recursive: true });
    logProgress('Diretório temporário criado com sucesso no servidor.', 1);

    const parserService = new ParserService();
    const geminiService = new GeminiService();
    const validatorService = new ValidatorService();
    const rendererService = new RendererService();

    // 1. Parser do currículo
    logProgress('Iniciando análise e estruturação do currículo base...', 1);
    const baseResume = await parserService.parseResume(resumeFilePath);
    logProgress('Currículo base lido e estruturado com sucesso no formato JSON.', 1, 'success');

    // 2. Otimização com Gemini
    logProgress('Enviando dados do currículo e descrição da vaga para a API do Google Gemini...', 2);
    const optimizedResume = await geminiService.optimizeResume(baseResume, vacancyContent, companyName);
    logProgress('Retorno bem-sucedido da IA do Gemini. Currículo otimizado com STAR e palavras-chave.', 2, 'success');

    // 3. Validação Zod
    logProgress('Iniciando validação estrita do JSON retornado contra o schema Zod...', 3);
    const validatedResume = validatorService.validate(optimizedResume);
    logProgress('Validação Zod bem-sucedida! O JSON segue 100% o schema esperado.', 3, 'success');

    // Salva o JSON final para auditoria
    const jsonPath = path.join(runOutputDir, 'curriculo_otimizado.json');
    await fs.writeFile(jsonPath, JSON.stringify(validatedResume, null, 2), 'utf-8');
    logProgress('JSON estruturado de auditoria gravado em disco.', 3);

    // Obtém o nome base original do currículo e sanitiza o nome da empresa
    const originalExt = path.extname(resumeOriginalName);
    const originalBaseName = path.basename(resumeOriginalName, originalExt);
    const sanitizedBase = originalBaseName.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_');
    const sanitizedCompany = companyName.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_');
    const finalFileName = `${sanitizedBase}_${sanitizedCompany}`;

    // 4. Renderização DOCX
    logProgress(`Iniciando preenchimento do template DOCX (${finalFileName}.docx) via docxtemplater...`, 4);
    const templatePath = path.join(process.cwd(), 'Blueprint_Template_Curriculo_ATS.docx');
    const docxPath = path.join(runOutputDir, `${finalFileName}.docx`);
    await rendererService.renderDocx(templatePath, docxPath, validatedResume);
    logProgress('Arquivo DOCX compilado e salvo com sucesso.', 4, 'success');

    // 5. Renderização PDF
    logProgress('Iniciando conversão para PDF usando MS Word COM Object (PowerShell)...', 4);
    const pdfPath = path.join(runOutputDir, `${finalFileName}.pdf`);
    await rendererService.convertDocxToPdf(docxPath, pdfPath);

    // Verifica se o PDF foi criado
    const pdfExists = await fs.access(pdfPath).then(() => true).catch(() => false);
    if (pdfExists) {
      logProgress('Arquivo PDF gerado e salvo com sucesso no servidor.', 4, 'success');
    } else {
      logProgress('AVISO: Conversão direta para PDF indisponível (Word COM Object ou ambiente não compatível).', 4, 'info');
    }

    // Limpa uploads temporários
    await fs.unlink(resumeFilePath).catch(() => {});

    // Envia evento de sucesso completo
    logProgress('Otimização concluída! Liberando downloads.', 4, 'success');
    runEvents.emit(runId, {
      type: 'success',
      docx: `/download/${runId}/${finalFileName}.docx`,
      pdf: pdfExists ? `/download/${runId}/${finalFileName}.pdf` : null,
      json: `/download/${runId}/curriculo_otimizado.json`,
      data: validatedResume
    });

  } catch (err: any) {
    console.error(`[API] [Run ${runId}] Erro fatal na geração:`, err);
    logProgress(`Erro fatal no processamento: ${err.message}`, 4, 'error');
    
    // Limpa uploads temporários
    await fs.unlink(resumeFilePath).catch(() => {});

    runEvents.emit(runId, {
      type: 'error',
      message: err.message
    });
  }
}

async function processTestRenderPipeline(
  runId: string,
  validatedResume: any,
  companyName: string
) {
  const runOutputDir = path.join(process.cwd(), 'output', 'api_runs', runId);
  
  // Função utilitária para emitir logs de progresso
  const logProgress = (message: string, step: number, status: 'info' | 'success' | 'error' = 'info') => {
    console.log(`[API] [Run ${runId} - TEST] Passo ${step}: ${message}`);
    runEvents.emit(runId, { type: 'log', message, step, status });
  };

  try {
    await fs.mkdir(runOutputDir, { recursive: true });
    logProgress('Diretório temporário de teste criado com sucesso.', 1);

    const rendererService = new RendererService();

    // Salva o JSON final para auditoria
    const jsonPath = path.join(runOutputDir, 'curriculo_otimizado.json');
    await fs.writeFile(jsonPath, JSON.stringify(validatedResume, null, 2), 'utf-8');
    logProgress('JSON estruturado gravado em disco.', 2);

    const sanitizedCompany = companyName.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_');
    const finalFileName = `Teste_Layout_${sanitizedCompany}`;

    // 3. Renderização DOCX
    logProgress(`Iniciando preenchimento do template DOCX (${finalFileName}.docx) via docxtemplater...`, 3);
    const templatePath = path.join(process.cwd(), 'Blueprint_Template_Curriculo_ATS.docx');
    const docxPath = path.join(runOutputDir, `${finalFileName}.docx`);
    await rendererService.renderDocx(templatePath, docxPath, validatedResume);
    logProgress('Arquivo DOCX de teste compilado com sucesso.', 3, 'success');

    // 4. Renderização PDF
    logProgress('Iniciando conversão para PDF usando MS Word COM Object (PowerShell)...', 4);
    const pdfPath = path.join(runOutputDir, `${finalFileName}.pdf`);
    await rendererService.convertDocxToPdf(docxPath, pdfPath);

    // Verifica se o PDF foi criado
    const pdfExists = await fs.access(pdfPath).then(() => true).catch(() => false);
    if (pdfExists) {
      logProgress('Arquivo PDF gerado e salvo com sucesso no servidor.', 4, 'success');
    } else {
      logProgress('AVISO: Conversão direta para PDF indisponível (Word COM Object ou ambiente não compatível).', 4, 'info');
    }

    // Envia evento de sucesso completo
    logProgress('Otimização de teste concluída! Liberando downloads.', 4, 'success');
    runEvents.emit(runId, {
      type: 'success',
      docx: `/download/${runId}/${finalFileName}.docx`,
      pdf: pdfExists ? `/download/${runId}/${finalFileName}.pdf` : null,
      json: `/download/${runId}/curriculo_otimizado.json`,
      data: validatedResume
    });

  } catch (err: any) {
    console.error(`[API] [Run ${runId}] Erro fatal na geração de teste:`, err);
    logProgress(`Erro fatal no processamento: ${err.message}`, 4, 'error');

    runEvents.emit(runId, {
      type: 'error',
      message: err.message
    });
  }
}

// Endpoint de Teste: ignora a API do Gemini e compila a partir do JSON diretamente
app.post('/generate-test', async (req, res) => {
  const { resumeData, company } = req.body;

  if (!resumeData) {
    res.status(400).json({ error: 'Os dados do currículo no formato JSON são obrigatórios.' });
    return;
  }

  const companyName = company || 'Teste';
  const runId = 'test_' + Date.now();

  try {
    const validatorService = new ValidatorService();
    const validatedResume = validatorService.validate(resumeData);

    // Inicia o processamento em background (sem await)
    processTestRenderPipeline(
      runId,
      validatedResume,
      companyName
    );

    // Retorna imediatamente o identificador de execução
    res.json({ runId });
  } catch (err: any) {
    res.status(400).json({ error: `O JSON enviado não corresponde ao schema esperado: ${err.message}` });
  }
});

// Endpoint 1: Inicia o processo assincronamente e retorna o runId
app.post('/generate', upload.fields([
  { name: 'resume', maxCount: 1 },
  { name: 'vacancy', maxCount: 1 }
]), async (req, res) => {
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };
  const companyName = req.body.company;
  const vacancyTextBody = req.body.vacancy_text;

  if (!files || !files.resume || files.resume.length === 0) {
    res.status(400).json({ error: 'O arquivo de currículo base (campo "resume") é obrigatório.' });
    return;
  }

  if (!companyName) {
    res.status(400).json({ error: 'O nome da empresa (campo "company") é obrigatório.' });
    return;
  }

  let vacancyContent = '';
  if (files.vacancy && files.vacancy.length > 0) {
    const vacancyFile = files.vacancy[0];
    vacancyContent = await readTextFile(vacancyFile.path);
  } else if (vacancyTextBody) {
    vacancyContent = vacancyTextBody;
  } else {
    res.status(400).json({ error: 'A descrição da vaga é obrigatória.' });
    return;
  }

  const resumeFile = files.resume[0];
  const runId = Date.now().toString();

  // Inicia o processamento em background (sem await)
  processResumePipeline(
    runId,
    resumeFile.path,
    resumeFile.originalname,
    vacancyContent,
    companyName
  );

  // Retorna imediatamente o identificador de execução
  res.json({ runId });
});

// Endpoint 2: Rota SSE de logs e status em tempo real
app.get('/status-stream/:runId', (req, res) => {
  const runId = req.params.runId;

  // Configura headers do Server-Sent Events (SSE)
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Envia ping inicial de conexão ativa
  res.write('data: ' + JSON.stringify({ type: 'connected' }) + '\n\n');

  // Callback de eventos
  const onRunEvent = (data: any) => {
    res.write('data: ' + JSON.stringify(data) + '\n\n');
    
    // Se for sucesso ou erro, a execução terminou, fecha a conexão
    if (data.type === 'success' || data.type === 'error') {
      runEvents.off(runId, onRunEvent);
      res.end();
    }
  };

  // Registra ouvinte
  runEvents.on(runId, onRunEvent);

  // Limpa ouvintes se o cliente fechar a aba/conexão inesperadamente
  req.on('close', () => {
    runEvents.off(runId, onRunEvent);
  });
});

// Expõe arquivos estáticos do output para download das execuções da API
app.use('/output', express.static(path.join(process.cwd(), 'output')));

// Endpoint de Download que força o cabeçalho Content-Disposition
app.get('/download/:runId/:filename', async (req, res) => {
  const { runId, filename } = req.params;
  
  // Previne path traversal e resolve o caminho do arquivo
  const safeFilename = path.basename(filename);
  const filePath = path.resolve(process.cwd(), 'output', 'api_runs', runId, safeFilename);
  
  try {
    await fs.access(filePath);
    res.download(filePath, safeFilename);
  } catch (err) {
    res.status(404).send('Arquivo não encontrado no servidor.');
  }
});

app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});
