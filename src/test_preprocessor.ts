import { RendererService } from './services/renderer/renderer.service';

function runTests() {
  const renderer = new RendererService();
  const preProcessXml = (renderer as any).preProcessXml.bind(renderer);

  console.log('--- Iniciando Testes Unitários do Pré-processador ---');

  // Teste 1: Substituição de loops de arrays simples (hard_skills)
  const test1Input = '<w:t>{% for skill in competencias.hard_skills %}{{skill}}{% if not loop.last %}, {% endif %}{% endfor %}</w:t>';
  const test1Expected = '<w:t>{competencias_hard_skills_joined}</w:t>';
  const test1Result = preProcessXml(test1Input);
  if (test1Result === test1Expected) {
    console.log('✓ Teste 1 (inline array) passou.');
  } else {
    console.error('✗ Teste 1 falhou!');
    console.error(`Recebido: ${test1Result}`);
    console.error(`Esperado: ${test1Expected}`);
  }

  // Teste 2: Substituição de loops estruturados
  const test2Input = '{% for exp in experiencias_profissionais %}{{exp.cargo}}{% endfor %}';
  const test2Expected = '{#experiencias_profissionais}{cargo}{/experiencias_profissionais}';
  const test2Result = preProcessXml(test2Input);
  if (test2Result === test2Expected) {
    console.log('✓ Teste 2 (loops de objetos) passou.');
  } else {
    console.error('✗ Teste 2 falhou!');
    console.error(`Recebido: ${test2Result}`);
    console.error(`Esperado: ${test2Expected}`);
  }

  // Teste 3: Substituição de condicionais
  const test3Input = '{% if cert.instituicao_emissora %}– {{cert.instituicao_emissora}}{% endif %}';
  const test3Expected = '{#instituicao_emissora}– {instituicao_emissora}{/instituicao_emissora}';
  const test3Result = preProcessXml(test3Input);
  if (test3Result === test3Expected) {
    console.log('✓ Teste 3 (condicionais) passou.');
  } else {
    console.error('✗ Teste 3 falhou!');
    console.error(`Recebido: ${test3Result}`);
    console.error(`Esperado: ${test3Expected}`);
  }

  // Teste 4: Variáveis simples e dados de contato
  const test4Input = '{{dados_contato.nome_completo}} | {{conquista}}';
  const test4Expected = '{dados_contato_nome_completo} | {.}';
  const test4Result = preProcessXml(test4Input);
  if (test4Result === test4Expected) {
    console.log('✓ Teste 4 (variáveis e dados de contato) passou.');
  } else {
    console.error('✗ Teste 4 falhou!');
    console.error(`Recebido: ${test4Result}`);
    console.error(`Esperado: ${test4Expected}`);
  }

  // Teste 5: Loops estruturados aninhados (remoção de prefixo exp.)
  const test5Input = '{% for conquista in exp.conquistas_e_atividades %}{{conquista}}{% endfor %}';
  const test5Expected = '{#conquistas_e_atividades}{.}{/conquistas_e_atividades}';
  const test5Result = preProcessXml(test5Input);
  if (test5Result === test5Expected) {
    console.log('✓ Teste 5 (loops aninhados com prefixo removido) passou.');
  } else {
    console.error('✗ Teste 5 falhou!');
    console.error(`Recebido: ${test5Result}`);
    console.error(`Esperado: ${test5Expected}`);
  }

  console.log('--- Testes Unitários Concluídos ---');
}

runTests();
