# Arquitetura do Sistema - Gerador Inteligente de Currículos

## Objetivo

Desenvolver uma aplicação em **Node.js** capaz de gerar um currículo altamente aderente a uma vaga específica utilizando:

- Currículo base do candidato;
- Descrição da vaga;
- Nome da empresa;
- Template DOCX padronizado.

A geração do conteúdo será realizada utilizando a **API do Google Gemini**, enquanto toda a lógica de estruturação, validação e renderização será responsabilidade da aplicação.

O objetivo principal é garantir:

- Consistência entre execuções;
- Estrutura fixa;
- Texto padronizado;
- Alta compatibilidade com ATS (Applicant Tracking Systems).

---

# Arquitetura Geral

```
                    Currículo Base
                           │
                           ▼
                  Parser de Currículo
                           │
                           ▼
                  JSON Estruturado
                           │
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
Descrição da Vaga     Nome da Empresa    Guia de Estilo
        │                  │                  │
        └──────────────────┼──────────────────┘
                           ▼
                Motor de Preparação
                           │
                           ▼
                Prompt Builder (Gemini)
                           │
                           ▼
                    API Google Gemini
                           │
                           ▼
                JSON Estruturado Final
                           │
                           ▼
             Validação do Schema (Zod)
                           │
                           ▼
                  Renderização DOCX
                           │
                           ▼
                     Exportação PDF
```

---

# Stack Tecnológica

## Backend

- Node.js
- TypeScript
- Express (caso exista API)
- Zod
- dotenv

---

## IA

Google Gemini API

Responsabilidades da IA:

- Analisar a vaga
- Adaptar resumo profissional
- Reescrever experiências
- Destacar competências relevantes
- Priorizar palavras-chave da vaga
- Ajustar linguagem conforme empresa

A IA **não será responsável pela estrutura do currículo**.

Toda a estrutura permanecerá fixa.

---

## Templates

Será utilizado um template DOCX contendo marcações Jinja compatíveis com `docxtemplater`.

Exemplo:

```jinja
{{dados_contato.nome_completo}}

{{resumo_profissional}}

{% for exp in experiencias_profissionais %}
...
{% endfor %}
```

O layout nunca será alterado pela IA.

---

# Fluxo do Sistema

## 1. Entrada

Entradas obrigatórias:

- Currículo do candidato
- Descrição da vaga
- Nome da empresa

---

## 2. Parser do Currículo

Converter o currículo para um JSON padronizado.

Exemplo:

```json
{
  "dados_contato": {},
  "resumo_profissional": "",
  "competencias": {},
  "experiencias_profissionais": [],
  "formacao_academica": [],
  "certificacoes_cursos": []
}
```

Esse JSON será a única fonte de verdade.

---

## 3. Preparação da Vaga

A descrição será organizada em:

- Cargo
- Senioridade
- Hard Skills
- Soft Skills
- Ferramentas
- Idiomas
- Diferenciais

---

## 4. Contexto da Empresa

A aplicação poderá buscar informações como:

- Segmento
- Cultura
- Produtos
- Linguagem utilizada

Essas informações serão adicionadas ao prompt para personalização do texto.

---

# Engenharia de Prompt

O prompt enviado ao Gemini deverá conter:

- Currículo estruturado
- Despecificação da vaga
- Nome da empresa
- Schema esperado

Exemplo de responsabilidades do modelo:

- Melhorar o resumo profissional
- Reescrever bullets
- Destacar experiências relevantes
- Priorizar competências
- Metodo STAR

Sem alterar:

- Datas
- Empresas
- Formação
- Certificações

---

# Idempotência

O sistema deve produzir resultados altamente consistentes.

Para isso:

## Temperatura

```
temperature = 0
```

## Top P

```
topP = 0.1
```

---

# Regras Fixas

## Ordem das seções

Sempre:

1. Dados de contato
2. Resumo profissional
3. Competências
4. Experiência profissional
5. Formação acadêmica
6. Certificações

Nunca alterar essa ordem.

---

## Experiências

Cada experiência deve possuir:

- Cargo
- Empresa
- Período
- Situacao
- Tarefa
- Acao
- Resultado

A IA apenas melhora a escrita.

Nunca cria novas experiências.

---

## Bullets

Cada bullet deve:

- começar com verbo de ação;
- ser objetivo;
- destacar resultado sempre que possível;
- evitar frases genéricas.

---

## Resumo Profissional

Sempre possuir:

- apresentação profissional;
- principais tecnologias;
- principais competências;
- aderência ao cargo.

---

## Competências

Separadas em:

```text
Hard Skills

Sistemas e Ferramentas

Soft Skills & Idiomas
```

---

# Estrutura Esperada do JSON

```json
{
  "dados_contato": {},
  "resumo_profissional": "",
  "competencias": {
    "hard_skills": [],
    "sistemas_ferramentas": [],
    "soft_skills_idiomas": []
  },
  "experiencias_profissionais": [],
  "formacao_academica": [],
  "certificacoes_cursos": []
}
```

---

# Validação

Antes de gerar o DOCX, o JSON retornado pelo Gemini deverá ser validado utilizando **Zod**.

Caso o schema não seja válido:

- nova tentativa de geração;
- ou retorno de erro para revisão.

Nenhum documento será gerado com JSON inválido.

---

# Renderização

Após validação:

```
JSON
      │
      ▼
Template DOCX
      │
      ▼
Currículo DOCX
      │
      ▼
PDF
```

---

# Estrutura do Projeto

```
src/
│
├── api/
│
├── services/
│   ├── gemini/
│   ├── parser/
│   ├── renderer/
│   └── validator/
│
├── prompts/
│   ├── resume.prompt.md
│   ├── rewrite.prompt.md
│   └── company.prompt.md
│
├── templates/
│   └── resume.docx
│
├── schemas/
│   └── resume.schema.ts
│
├── types/
│
├── utils/
│
└── app.ts
```

---

# Responsabilidades

## Parser

- Ler currículo
- Produzir JSON estruturado

---

## Gemini

- Melhorar o conteúdo
- Adaptar para a vaga
- Reescrever textos
- Destacar competências

---

## Validator

- Garantir aderência ao schema
- Garantir consistência

---

## Renderer

- Preencher o template DOCX
- Exportar PDF

---

# Benefícios da Arquitetura

- Estrutura totalmente padronizada.
- Separação clara entre lógica de negócio e IA.
- Facilidade para trocar o modelo de IA futuramente.
- Renderização consistente utilizando um único template.
- Validação antes da geração do documento.
- Baixa variabilidade entre execuções.
- Facilidade de manutenção e evolução do sistema.
- Compatibilidade com ATS por manter uma estrutura previsível e limpa.
