import * as fs from 'fs/promises';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { Resume } from '../../schemas/resume.schema';

const execAsync = promisify(exec);

export class RendererService {
  /**
   * Prepara os dados do currículo injetando os campos joined para as listas simples.
   */
  private prepareData(resume: Resume): any {
    const data = JSON.parse(JSON.stringify(resume));

    // Adiciona as strings formatadas por vírgula para as competências simples na raiz para evitar dot notation
    if (data.competencias) {
      data.competencias_hard_skills_joined = (data.competencias.hard_skills || []).join(', ');
      data.competencias_sistemas_ferramentas_joined = (data.competencias.sistemas_ferramentas || []).join(', ');
      data.competencias_soft_skills_idiomas_joined = (data.competencias.soft_skills_idiomas || []).join(', ');
    }

    // Copia todas as propriedades de dados_contato para a raiz com prefixo dados_contato_
    if (data.dados_contato) {
      for (const [key, value] of Object.entries(data.dados_contato)) {
        data[`dados_contato_${key}`] = value;
      }
    }

    return data;
  }

  /**
   * Remove marcações e divisões de run do Word XML que separam delimitadores como "{{", "}}" ou "{%".
   */
  private cleanXmlRuns(xmlContent: string): string {
    const mergeRegex = /<\/w:t><\/w:r>(?:<w:proofErr [^>]*>|<w:proofErr[^>]*\/>|<w:bookmarkStart[^>]*\/>|<w:bookmarkEnd[^>]*\/>)*<w:r(?: [^>]*)?>(?:<w:rPr>[\s\S]*?<\/w:rPr>)?<w:t(?: [^>]*)?>/g;
    return xmlContent.replace(mergeRegex, '');
  }

  /**
   * Traduz a sintaxe Jinja do XML do documento para a sintaxe do docxtemplater.
   */
  private preProcessXml(xmlContent: string): string {
    const cleanedXml = this.cleanXmlRuns(xmlContent);

    // 1. Substitui loops de arrays simples de competências por seus campos joined correspondentes achatados
    // Ex: {% for skill in competencias.hard_skills %}{{skill}}{% if not loop.last %}, {% endif %}{% endfor %}
    // -> {competencias_hard_skills_joined}
    const inlineArrayRegex = /\{%\s*for\s+(\w+)\s+in\s+([a-zA-Z0-9_.]+)\s*%\}\s*\{\{\s*\1\s*\}\}\s*\{%\s*if\s+not\s+loop\.last\s*%\}\s*(.*?)\s*\{%\s*endif\s*%\}\s*\{%\s*endfor\s*%\}/g;
    let processed = cleanedXml.replace(inlineArrayRegex, (match, itemVar, collectionPath) => {
      const flatPath = collectionPath.replace(/\./g, '_');
      return `{${flatPath}_joined}`;
    });

    // 2. Traduz blocos condicionais e de loops estruturados usando uma pilha (stack)
    // Coopera para converter {% for exp in experiencias_profissionais %} em {#experiencias_profissionais} e {% endfor %} em {/experiencias_profissionais}
    // E {% if cert.instituicao_emissora %} em {#instituicao_emissora} e {% endif %} em {/instituicao_emissora}
    const tagStack: string[] = [];
    const blockRegex = /\{%\s*(for\s+\w+\s+in\s+([a-zA-Z0-9_.]+)|if\s+([a-zA-Z0-9_.]+)|endfor|endif)\s*%\}/g;
    
    processed = processed.replace(blockRegex, (match, fullCmd, forPath, ifPath) => {
      if (forPath) {
        let cleanPath = forPath;
        if (forPath.startsWith('exp.')) cleanPath = forPath.substring(4);
        else if (forPath.startsWith('edu.')) cleanPath = forPath.substring(4);
        else if (forPath.startsWith('cert.')) cleanPath = forPath.substring(5);

        tagStack.push(cleanPath);
        return `{#${cleanPath}}`;
      } else if (ifPath) {
        // Pega apenas o último termo do caminho da propriedade (ex: cert.ano -> ano)
        const propName = ifPath.includes('.') ? ifPath.split('.').pop()! : ifPath;
        tagStack.push(propName);
        return `{#${propName}}`;
      } else if (fullCmd === 'endfor' || fullCmd === 'endif') {
        const popped = tagStack.pop();
        if (!popped) {
          console.warn('Alerta de Preprocessamento: Pilha de tags vazia ao fechar bloco.');
          return '';
        }
        return `{/${popped}}`;
      }
      return match;
    });

    // 3. Traduz variáveis simples
    // Ex: {{exp.cargo}} -> {cargo}, {{dados_contato.email}} -> {dados_contato_email}, {{conquista}} -> {.}
    const variableRegex = /\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g;
    processed = processed.replace(variableRegex, (match, varName) => {
      if (varName.startsWith('dados_contato.')) {
        const flatName = varName.replace(/\./g, '_');
        return `{${flatName}}`;
      } else if (varName.startsWith('exp.')) {
        return `{${varName.substring(4)}}`;
      } else if (varName.startsWith('edu.')) {
        return `{${varName.substring(4)}}`;
      } else if (varName.startsWith('cert.')) {
        return `{${varName.substring(5)}}`;
      } else if (['skill', 'tool', 'item', 'conquista'].includes(varName)) {
        return '{.}';
      } else {
        return `{${varName}}`;
      }
    });

    return processed;
  }

  /**
   * Renderiza o arquivo DOCX final.
   */
  async renderDocx(templatePath: string, outputPath: string, resume: Resume): Promise<void> {
    const templateContent = await fs.readFile(templatePath);
    
    // Carrega o arquivo zip usando PizZip
    const zip = new PizZip(templateContent);

    // Obtém o XML principal
    const xmlContent = zip.files['word/document.xml'].asText();

    // Pré-processa os placeholders Jinja para Mustache
    const processedXml = this.preProcessXml(xmlContent);

    // Atualiza o arquivo principal no zip
    zip.file('word/document.xml', processedXml);

    // Preenche os dados usando docxtemplater
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    const renderingData = this.prepareData(resume);
    doc.render(renderingData);

    const outBuffer = doc.getZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE',
    });

    await fs.writeFile(outputPath, outBuffer);
  }

  /**
   * Converte um arquivo DOCX para PDF usando o MS Word COM Object via PowerShell no Windows.
   */
  async convertDocxToPdf(docxPath: string, pdfPath: string): Promise<void> {
    const isWindows = process.platform === 'win32';
    const converterType = process.env.PDF_CONVERTER_TYPE || 'word';

    if (!isWindows || converterType !== 'word') {
      console.warn(
        'AVISO: A conversão direta para PDF só está disponível no Windows com o MS Word instalado.' +
        ' Gerando apenas o arquivo DOCX.'
      );
      return;
    }

    // Resolve caminhos absolutos
    const absDocx = path.resolve(docxPath);
    const absPdf = path.resolve(pdfPath);

    // Cria script PowerShell temporário para evitar problemas com aspas no terminal
    const tempScriptPath = path.join(path.dirname(docxPath), `_convert_${Date.now()}.ps1`);
    const psScript = `
$docxPath = $args[0]
$pdfPath = $args[1]
$word = New-Object -ComObject Word.Application
$word.Visible = $false
try {
    $doc = $word.Documents.Open($docxPath)
    $doc.SaveAs($pdfPath, 17) # 17 = wdFormatPDF
    $doc.Close()
    Write-Output "PDF gerado com sucesso."
} catch {
    Write-Error $_.Exception.Message
    exit 1
} finally {
    $word.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null
}
`;

    try {
      await fs.writeFile(tempScriptPath, psScript, 'utf-8');
      
      const command = `powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${tempScriptPath}" "${absDocx}" "${absPdf}"`;
      const { stdout, stderr } = await execAsync(command);

      if (stderr && stderr.trim().length > 0) {
        console.warn('Saída de erro do conversor PDF:', stderr);
      }
      console.log('Resposta do Conversor PDF:', stdout.trim());
    } catch (err: any) {
      throw new Error(`Falha ao converter DOCX para PDF via MS Word COM Object: ${err.message}`);
    } finally {
      // Remove o script temporário
      await fs.unlink(tempScriptPath).catch(() => {});
    }
  }
}
