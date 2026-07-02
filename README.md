# ATS-Reverso: Gerador Inteligente de Currículos Otimizados

O **ATS-Reverso** é uma solução inteligente baseada em Inteligência Artificial projetada para adequar currículos de candidatos a vagas de emprego específicas, aumentando as chances de compatibilidade com sistemas **ATS (Applicant Tracking Systems)**. 

O sistema analisa o currículo original (em PDF, Word ou Markdown), extrai suas informações essenciais, cruza com as necessidades de uma vaga e com os valores da empresa de destino, e reconstrói o documento de forma otimizada — aplicando metodologias consolidadas como o **método STAR** e mantendo a veracidade das informações.

> [tutorial](https://www.youtube.com/watch?v=b2dY0TC2L9w)
---

## 🚀 Funcionalidades Principais

* **Parser Inteligente via IA:** Converte arquivos de currículo nos formatos `.docx`, `.pdf`, `.txt`, `.md` ou `.json` em uma estrutura JSON padronizada e limpa.
* **Otimização Estratégica (Gemini 3.5 Flash):**
  * **Resumo Profissional:** Reescreve o resumo com foco na vaga, destacando as competências comportamentais e técnicas mais relevantes.
  * **Método STAR:** Transforma as conquistas e experiências em descrições focadas em Situação, Tarefa, Ação e Resultados reais, utilizando verbos de ação fortes no passado.
  * **Palavras-chave (Keywords):** Reorganiza e realça hard skills e ferramentas alinhadas à descrição da vaga.
  * **Veracidade Inviolável:** A IA **nunca** altera datas, nomes de empresas, títulos de cursos, formações acadêmicas ou certificações.
* **Validação de Schema (Zod & JSON Schema):** Garante que o retorno do Gemini respeite estritamente o formato de dados esperado pelo renderizador.
* **Preenchimento Automático de Template (.docx):** Utiliza um template estruturado e pré-processado para preenchimento de variáveis e loops com `docxtemplater`.
* **Exportação para PDF:** Converte o arquivo DOCX finalizado em PDF (suporta conversão nativa no Windows via MS Word COM Object).
* **Modo de Teste de Layout:** Permite que desenvolvedores ou usuários técnicos editem os dados diretamente no editor de JSON interno e gerem o currículo imediatamente para testar o visual do template, sem gastar tokens da API do Gemini.
* **Console de Logs SSE:** Terminal integrado em tempo real no frontend que permite acompanhar cada passo da execução técnica (parsing, otimização, validação e renderização).

---

## 🛠️ Stack Tecnológica

### Backend (Node.js & TypeScript)
* **Express:** Servidor HTTP para servir a aplicação web e lidar com endpoints.
* **Google GenAI SDK (`@google/genai`):** Integração moderna com o Gemini 3.5 Flash.
* **Zod:** Validação e parsing de tipos e schemas em tempo real.
* **Mammoth & PDF-Parse:** Extração de texto cru de arquivos DOCX e PDF.
* **PizZip & Docxtemplater:** Manipulação e injeção de dados no template do Microsoft Word.
* **Multer:** Gerenciamento seguro de uploads de currículos e descrições de vagas.

### Frontend
* **HTML5, Vanilla CSS & Vanilla JavaScript:** Interface de usuário de alta performance, sem frameworks complexos, focada em usabilidade e beleza estética.
* **FontAwesome & Google Fonts (Outfit & JetBrains Mono):** Tipografia moderna e ícones interativos.

---

## 📂 Estrutura do Projeto

```
curriculoPorVaga/
├── public/                      # Interface Web da aplicação
│   ├── index.html               # Estrutura visual da aplicação (Single Page)
│   ├── style.css                # Estilização moderna e responsiva
│   └── script.js                # Lógica do cliente, gerência de abas, SSE e download
├── src/                         # Código-fonte principal (TypeScript)
│   ├── server.ts                # Servidor Express, rotas SSE e pipeline de execução
│   ├── app.ts                   # Ponto de entrada padrão
│   ├── schemas/                 # Definição e validação do formato do Currículo (Zod)
│   ├── services/                # Serviços de negócio (IA, parser, renderer, validator)
│   ├── prompts/                 # Prompts de engenharia do Gemini (Markdown)
│   └── utils/                   # Utilitários de leitura/escrita de arquivos
├── Blueprint_Template_Curriculo_ATS.docx  # Template Word usado para gerar os arquivos
├── schemaCurriculo.json         # JSON Schema utilizado na resposta estruturada da IA
└── package.json                 # Dependências e scripts de execução
```

---

## ⚙️ Configuração e Instalação

### Pré-requisitos
1. **Node.js** (Versão 18 ou superior).
2. **Microsoft Word** instalado localmente (Opcional, apenas necessário se desejar gerar PDFs automaticamente usando o Windows).

### Passo 1: Clonar o Repositório
```bash
git clone https://github.com/SamuelSoaresSilva/ATS-Reverso.git
cd ATS-Reverso
```

### Passo 2: Instalar Dependências
```bash
npm install
```

### Passo 3: Configurar Variáveis de Ambiente
Crie um arquivo chamado `.env` na raiz do projeto baseado no `.env.example`:
```env
PORT=3000
GEMINI_API_KEY=sua_chave_de_api_do_gemini_aqui
PDF_CONVERTER_TYPE=word
```
> ⚠️ **Nota sobre o PDF:** Se você não estiver no Windows ou não possuir o Word instalado, a aplicação gerará apenas o arquivo `.docx` final e exibirá um aviso no console de logs sobre a indisponibilidade do PDF.

---

## 🏃 Como Rodar a Aplicação

### Modo Desenvolvimento
Para rodar o servidor em modo de desenvolvimento com reinicialização automática (nodemon):
```bash
npm run dev:server
```

### Modo Produção / Execução Padrão
Para iniciar o servidor normalmente:
```bash
npm run server
```

Acesse o endereço em seu navegador:
👉 **[http://localhost:3000](http://localhost:3000)**

---

## 📝 Guia de Uso (Como Otimizar Seu Currículo)

### Método 1: Otimização Automática por IA (Aba: Otimização IA)
1. **Upload do Currículo:** Arraste ou clique para selecionar seu currículo base (formatos `.docx`, `.pdf`, `.txt`, `.md`, ou `.json`).
2. **Identificação da Empresa:** Digite o nome da empresa desejada.
3. **Descrição da Vaga:** Insira a descrição completa da vaga de emprego no campo de texto (requisitos, responsabilidades, etc.).
4. **Gerar:** Clique em **"Otimizar Currículo"**. 
5. **Logs & Download:** Acompanhe a pipeline pelo painel de logs avançados. Ao finalizar, serão liberados os botões de download do seu novo currículo nos formatos **DOCX**, **PDF** (se disponível) e **JSON estruturado**.

### Método 2: Validação & Teste de Layout (Aba: Teste de Layout)
*Útil para ajustar manualmente os textos e testar como o template Word se comporta com diferentes volumes de texto.*
1. **Editar Dados:** Altere os textos diretamente na caixa do editor JSON estruturado.
2. **Nome da Empresa:** Digite o nome fictício ou real da empresa para gerar o nome do arquivo.
3. **Gerar:** Clique em **"Renderizar Layout de Teste"**. O sistema irá construir o `.docx` e o `.pdf` correspondentes sem chamar a API do Gemini.

---

## 🔒 Privacidade e Segurança
Todos os arquivos carregados e arquivos processados são temporários e mantidos na pasta `output/` do servidor local. Eles são apagados automaticamente do armazenamento temporário após a execução bem-sucedida ou falha da pipeline. Nenhum dado é persistido em nuvem de terceiros (exceto o texto enviado de forma segura para processamento da API do Gemini).
