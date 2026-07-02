document.addEventListener('DOMContentLoaded', () => {
    // Referências do DOM
    const form = document.getElementById('generator-form');
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const fileInfo = document.getElementById('file-info');
    const fileNameSpan = document.getElementById('file-name');
    const btnRemoveFile = document.getElementById('btn-remove-file');
    const companyInput = document.getElementById('company');
    const vacancyText = document.getElementById('vacancy-text');
    const btnSubmit = document.getElementById('btn-submit');
    
    // Novas referências para Abas e Modo de Teste
    const tabOptimize = document.getElementById('tab-optimize');
    const tabTest = document.getElementById('tab-test');
    const testLayoutForm = document.getElementById('test-layout-form');
    const testCompanyInput = document.getElementById('test-company');
    const testJsonEditor = document.getElementById('test-json-editor');
    
    // Estados da UI
    const statePlaceholder = document.getElementById('state-placeholder');
    const stateLoading = document.getElementById('state-loading');
    const stateSuccess = document.getElementById('state-success');
    const progressBar = document.getElementById('progress-bar');
    
    // Elementos de Resultados
    const previewName = document.getElementById('preview-name');
    const previewRole = document.getElementById('preview-role');
    const previewSummary = document.getElementById('preview-summary');
    const previewSkills = document.getElementById('preview-skills');
    const downloadDocxBtn = document.getElementById('download-docx-btn');
    const downloadPdfBtn = document.getElementById('download-pdf-btn');
    const copyJsonBtn = document.getElementById('copy-json-btn');
    const btnReset = document.getElementById('btn-reset');
    
    // Passos do Loader
    const step1 = document.getElementById('step-1');
    const step2 = document.getElementById('step-2');
    const step3 = document.getElementById('step-3');
    const step4 = document.getElementById('step-4');

    // Terminal de Logs
    const toggleConsoleBtn = document.getElementById('toggle-console-btn');
    const consoleContainer = document.getElementById('console-container');
    const consoleLog = document.getElementById('console-log');
    const pulseDot = document.querySelector('.pulse-dot');
    
    let selectedFile = null;
    let generatedJsonData = null;
    let eventSource = null;

    // --- Drag & Drop ---
    
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.add('drag-over');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.remove('drag-over');
        }, false);
    });

    dropZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length > 0) {
            handleFileSelect(files[0]);
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (fileInput.files.length > 0) {
            handleFileSelect(fileInput.files[0]);
        }
    });

    btnRemoveFile.addEventListener('click', (e) => {
        e.stopPropagation();
        clearFile();
    });

    function handleFileSelect(file) {
        selectedFile = file;
        fileNameSpan.textContent = file.name;
        fileInfo.style.display = 'flex';
        dropZone.style.borderStyle = 'solid';
    }

    function clearFile() {
        selectedFile = null;
        fileInput.value = '';
        fileInfo.style.display = 'none';
        dropZone.style.borderStyle = 'dashed';
    }

    // --- Terminal de Logs Helpers ---

    function clearConsole() {
        consoleLog.innerHTML = '';
    }

    function addConsoleLine(message, status = 'system') {
        const line = document.createElement('div');
        line.className = `console-line ${status}`;
        
        const timestamp = new Date().toLocaleTimeString();
        
        let icon = '>';
        if (status === 'success') icon = '✓';
        if (status === 'error') icon = '✗';
        if (status === 'info') icon = 'i';

        line.innerHTML = `<span class="line-icon">${icon}</span> <span style="color: #6a6a85; margin-right: 4px;">[${timestamp}]</span> <span>${message}</span>`;
        consoleLog.appendChild(line);
        consoleLog.scrollTop = consoleLog.scrollHeight;
    }

    // --- Toggle Terminal Logs ---

    toggleConsoleBtn.addEventListener('click', () => {
        const isCollapsed = consoleContainer.style.display === 'none';
        
        if (isCollapsed) {
            consoleContainer.style.display = 'block';
            toggleConsoleBtn.classList.add('active');
            toggleConsoleBtn.querySelector('span').textContent = 'Ocultar Logs Avançados';
            toggleConsoleBtn.querySelector('.toggle-arrow').className = 'fa-solid fa-chevron-up toggle-arrow';
            consoleLog.scrollTop = consoleLog.scrollHeight;
        } else {
            consoleContainer.style.display = 'none';
            toggleConsoleBtn.classList.remove('active');
            toggleConsoleBtn.querySelector('span').textContent = 'Mostrar Logs Avançados';
            toggleConsoleBtn.querySelector('.toggle-arrow').className = 'fa-solid fa-chevron-down toggle-arrow';
        }
    });

    // --- Processo de Geração (SSE Streaming) ---

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!selectedFile) {
            alert('Por favor, faça o upload de um currículo base antes de continuar.');
            return;
        }

        const company = companyInput.value.trim();
        const vacancy = vacancyText.value.trim();

        if (!company || !vacancy) {
            alert('Por favor, preencha todos os campos obrigatórios.');
            return;
        }

        // Limpa logs e prepara terminal
        clearConsole();
        pulseDot.className = 'pulse-dot active';
        addConsoleLine('Iniciando envio dos arquivos para o servidor...', 'info');

        // Prepara dados de envio
        const formData = new FormData();
        formData.append('resume', selectedFile);
        formData.append('company', company);
        formData.append('vacancy_text', vacancy);

        // Transiciona estados da UI
        showState('loading');
        updateProgress(5, 1);

        try {
            // 1. POST request que retorna imediatamente o runId
            const response = await fetch('/generate', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Falha ao registrar tarefa de otimização.');
            }

            const { runId } = await response.json();
            addConsoleLine(`Tarefa registrada com sucesso! ID de Execução: ${runId}`, 'success');
            addConsoleLine('Conectando ao canal de streaming de status (SSE)...', 'info');

            // Fechar conexão SSE ativa anterior (se houver)
            if (eventSource) {
                eventSource.close();
            }

            // 2. Conecta via Server-Sent Events (SSE) para logs em tempo real
            eventSource = new EventSource(`/status-stream/${runId}`);

            eventSource.onmessage = (event) => {
                const data = JSON.parse(event.data);

                if (data.type === 'connected') {
                    addConsoleLine('Conectado com sucesso ao canal de streaming do servidor.', 'success');
                } 
                else if (data.type === 'log') {
                    addConsoleLine(data.message, data.status);
                    
                    // Atualiza a barra de progresso baseado no passo técnico recebido
                    let percentage = 10;
                    if (data.step === 1) percentage = 20;
                    else if (data.step === 2) percentage = 55;
                    else if (data.step === 3) percentage = 75;
                    else if (data.step === 4) percentage = 90;

                    updateProgress(percentage, data.step);
                } 
                else if (data.type === 'success') {
                    addConsoleLine('Pipeline finalizada com sucesso pelo servidor!', 'success');
                    pulseDot.className = 'pulse-dot success';
                    updateProgress(100, 4);

                    // Carrega os links de download e dados na UI
                    generatedJsonData = data.data;
                    renderResults(data);

                    setTimeout(() => {
                        showState('success');
                        eventSource.close();
                    }, 800);
                } 
                else if (data.type === 'error') {
                    addConsoleLine(`Erro na execução: ${data.message}`, 'error');
                    pulseDot.className = 'pulse-dot error';
                    alert(`Ocorreu um erro durante o processamento:\n${data.message}`);
                    
                    setTimeout(() => {
                        showState('placeholder');
                        eventSource.close();
                    }, 1000);
                }
            };

            eventSource.onerror = (err) => {
                console.error('Erro de conexão SSE:', err);
                addConsoleLine('Aviso: Perda de conexão temporária com a stream de logs.', 'error');
                eventSource.close();
            };

        } catch (err) {
            console.error(err);
            addConsoleLine(`Falha na submissão: ${err.message}`, 'error');
            pulseDot.className = 'pulse-dot error';
            alert(`Falha ao registrar o currículo:\n${err.message}`);
            showState('placeholder');
        }
    });

    // Reset da Aplicação
    btnReset.addEventListener('click', () => {
        form.reset();
        clearFile();
        generatedJsonData = null;
        if (eventSource) {
            eventSource.close();
        }
        clearConsole();
        addConsoleLine('Terminal resetado. Pronto para iniciar...', 'system');
        pulseDot.className = 'pulse-dot';
        showState('placeholder');
    });

    // Copiar JSON
    copyJsonBtn.addEventListener('click', () => {
        if (!generatedJsonData) return;
        
        navigator.clipboard.writeText(JSON.stringify(generatedJsonData, null, 2))
            .then(() => {
                const titleSpan = copyJsonBtn.querySelector('.action-title');
                const descSpan = copyJsonBtn.querySelector('.action-desc');
                const originalTitle = titleSpan.textContent;
                const originalDesc = descSpan.textContent;

                titleSpan.textContent = 'Copiado!';
                descSpan.textContent = 'JSON copiado para a área de transferência';
                copyJsonBtn.style.borderColor = 'var(--success-color)';

                setTimeout(() => {
                    titleSpan.textContent = originalTitle;
                    descSpan.textContent = originalDesc;
                    copyJsonBtn.style.borderColor = 'var(--panel-border)';
                }, 2000);
            })
            .catch(err => {
                console.error('Falha ao copiar JSON:', err);
            });
    });

    // --- Downloads via Blob (Bypass de Interceptadores e Proxy de Port Forwarding) ---

    async function triggerBlobDownload(url, defaultFileName) {
        try {
            addConsoleLine(`Iniciando download em lote via Blob do arquivo: ${defaultFileName}...`, 'info');
            const response = await fetch(url);
            if (!response.ok) throw new Error('Não foi possível obter o arquivo do servidor.');
            
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            
            const tempLink = document.createElement('a');
            tempLink.href = blobUrl;
            tempLink.download = defaultFileName;
            document.body.appendChild(tempLink);
            tempLink.click();
            
            document.body.removeChild(tempLink);
            URL.revokeObjectURL(blobUrl);
            addConsoleLine('Download concluído com sucesso!', 'success');
        } catch (err) {
            console.error('Erro no download via Blob:', err);
            addConsoleLine(`Erro no download via Blob. Executando fallback tradicional.`, 'error');
            window.open(url, '_blank');
        }
    }

    downloadDocxBtn.addEventListener('click', (e) => {
        const href = downloadDocxBtn.getAttribute('data-href');
        const filename = downloadDocxBtn.getAttribute('data-filename');
        if (href && filename) {
            e.preventDefault();
            triggerBlobDownload(href, filename);
        }
    });

    downloadPdfBtn.addEventListener('click', (e) => {
        const href = downloadPdfBtn.getAttribute('data-href');
        const filename = downloadPdfBtn.getAttribute('data-filename');
        if (href && filename) {
            e.preventDefault();
            triggerBlobDownload(href, filename);
        }
    });

    // --- Auxiliares de UI ---

    function showState(state) {
        statePlaceholder.style.display = 'none';
        stateLoading.style.display = 'none';
        stateSuccess.style.display = 'none';

        if (state === 'placeholder') {
            statePlaceholder.style.display = 'flex';
        } else if (state === 'loading') {
            stateLoading.style.display = 'flex';
        } else if (state === 'success') {
            stateSuccess.style.display = 'flex';
        }
    }

    function updateProgress(percentage, stepNumber) {
        progressBar.style.width = `${percentage}%`;

        // Limpa classes ativas dos passos
        [step1, step2, step3, step4].forEach((el, index) => {
            const currentStepNum = index + 1;
            el.className = 'step';
            
            const icon = el.querySelector('i');
            if (currentStepNum < stepNumber) {
                el.classList.add('completed');
                icon.className = 'fa-solid fa-circle-check';
            } else if (currentStepNum === stepNumber) {
                el.classList.add('active');
                icon.className = 'fa-regular fa-circle-dot';
            } else {
                icon.className = 'fa-regular fa-circle';
            }
        });
    }

    function renderResults(result) {
        const data = result.data;

        // Cabeçalhos
        previewName.textContent = data.dados_contato.nome_completo || 'Sem Nome';
        previewRole.textContent = data.dados_contato.cargo_desejado || 'Cargo não definido';
        
        // Resumo profissional
        previewSummary.textContent = data.resumo_profissional || 'Sem resumo.';

        // Competências
        previewSkills.innerHTML = '';
        const skills = [
            ...(data.competencias.hard_skills || []),
            ...(data.competencias.sistemas_ferramentas || [])
        ].slice(0, 10); // Exibe até as 10 principais

        skills.forEach(skill => {
            const pill = document.createElement('span');
            pill.className = 'skill-pill';
            pill.textContent = skill;
            previewSkills.appendChild(pill);
        });

        // Configura Links de Download com nomes de arquivos explícitos
        const docxFileName = result.docx.split('/').pop();
        downloadDocxBtn.setAttribute('data-href', result.docx);
        downloadDocxBtn.setAttribute('data-filename', docxFileName);
        downloadDocxBtn.href = result.docx;
        downloadDocxBtn.setAttribute('download', docxFileName);
        
        if (result.pdf) {
            const pdfFileName = result.pdf.split('/').pop();
            downloadPdfBtn.setAttribute('data-href', result.pdf);
            downloadPdfBtn.setAttribute('data-filename', pdfFileName);
            downloadPdfBtn.href = result.pdf;
            downloadPdfBtn.setAttribute('download', pdfFileName);
            downloadPdfBtn.classList.remove('disabled');
            downloadPdfBtn.querySelector('.action-desc').textContent = 'Alta Fidelidade';
        } else {
            downloadPdfBtn.removeAttribute('data-href');
            downloadPdfBtn.removeAttribute('data-filename');
            downloadPdfBtn.href = '#';
            downloadPdfBtn.removeAttribute('download');
            downloadPdfBtn.classList.add('disabled');
            downloadPdfBtn.querySelector('.action-desc').textContent = 'Indisponível localmente';
        }
    }

    const mockResumeData = {
      "dados_contato": {
        "nome_completo": "Alexandre Silva Santos",
        "cargo_desejado": "Full Stack Engineer (Java & Python)",
        "cidade": "São Paulo",
        "estado": "SP",
        "telefone": "+55 11 99999-9999",
        "email": "alexandre.santos.dev@example.com",
        "linkedin_url": "https://linkedin.com/in/alexandresilvasantos",
        "github_portfolio_url": "https://github.com/alexandredesenv"
      },
      "resumo_profissional": "Engenheiro de Software Full Stack com mais de 3 anos de experiência sólida no desenvolvimento de aplicações escaláveis utilizando Java, Spring Boot, Python e React. Especialista em arquitetura de microsserviços, modernização de sistemas legados e otimização de performance de banco de dados SQL (PostgreSQL/Oracle). Experiente na implementação de pipelines de build e deploy (CI/CD) com Docker, Kubernetes e provedores de nuvem. Proficiente em inglês avançado, com forte aptidão para colaborar de forma ágil em projetos de alta complexidade.",
      "competencias": {
        "hard_skills": [
          "Microsserviços",
          "APIs REST",
          "CI/CD",
          "Desenvolvimento Full-Stack",
          "Pipelines de Build/Deployment",
          "Metodologias Ágeis (Scrum)",
          "Arquitetura Multitenant",
          "Engenharia de Software",
          "Gestão de Requisitos",
          "Row Level Security (RLS)"
        ],
        "sistemas_ferramentas": [
          "Java (22)",
          "Python",
          "React",
          "Spring Boot",
          "SQL (Oracle/PostgreSQL)",
          "Docker",
          "Kubernetes",
          "Azure DevOps",
          "Maven",
          "Gradle",
          "Git",
          "Node.js",
          "TypeScript",
          "Kotlin",
          "Vue.js",
          "Angular",
          "Rancher",
          "Microsoft Azure",
          "Jira"
        ],
        "soft_skills_idiomas": [
          "Inglês (Avançado)",
          "Português (Nativo)",
          "Colaboração",
          "Comunicação Eficiente"
        ]
      },
      "experiencias_profissionais": [
        {
          "cargo": "Engenheiro de Software (Full Stack)",
          "empresa": "InovaTech Solutions",
          "data_inicio": "02/2024",
          "data_fim": "12/2025",
          "conquistas_e_atividades": [
            "Liderou a refatoração de sistemas legados complexos, migrando uma arquitetura monolítica em Java para microsserviços escaláveis com Kotlin, Spring Boot 3 e Angular, otimizando a manutenibilidade e a performance do sistema.",
            "Desenhou e implantou microsserviços robustos utilizando Spring Boot e Docker, integrando APIs internas e automatizando fluxos de geração de documentos.",
            "Desenvolveu uma ferramenta de CLI customizada com Node.js para automatizar a geração de código modular, reduzindo significativamente o tempo de setup de novos módulos e padronizando o boilerplate.",
            "Otimizou pipelines de build e deploy migrando de Gradle para Maven, estabelecendo práticas modernas de CI/CD e testes unitários para garantir entregas contínuas de alta qualidade."
          ]
        },
        {
          "cargo": "Engenheiro de Software (Full Stack)",
          "empresa": "DevCorp Sistemas",
          "data_inicio": "01/2025",
          "data_fim": "04/2025",
          "conquistas_e_atividades": [
            "Refatorou módulos críticos de cálculo financeiro legados em Java, alcançando um aumento de 80% na performance de processamento e reduzindo drasticamente bugs em produção.",
            "Implementou novas funcionalidades full-stack para sistemas de gestão financeira, assegurando conformidade regulatória e alta precisão em transações de grande escala.",
            "Colaborou ativamente com equipes multidisciplinares de produto para diagnosticar e solucionar bugs críticos em gateways de pagamento, aprimorando a experiência de milhares de usuários ativos."
          ]
        },
        {
          "cargo": "Consultor de Tecnologia / Analista FullStack",
          "empresa": "Global Tech Consulting",
          "data_inicio": "01/2026",
          "data_fim": "Até o presente",
          "conquistas_e_atividades": [
            "Liderou o desenvolvimento end-to-end de um sistema CRM multitenant escalável utilizando Java no backend e React no frontend, gerando uma interface moderna e responsiva.",
            "Projetou e implementou mecanismos de segurança avançados, incluindo Row Level Security (RLS) em bancos de dados SQL, assegurando o isolamento estrito de dados entre clientes.",
            "Gerenciou a infraestrutura e as estratégias de deploy (CI/CD), definindo a modelagem de dados SQL e gerando alta disponibilidade da aplicação.",
            "Traduziu requisitos de negócios complexos em especificações técnicas e arquiteturas de software escaláveis, alinhando as entregas às necessidades dos stakeholders."
          ]
        }
      ],
      "formacao_academica": [
        {
          "curso": "Bacharelado em Engenharia de Software",
          "instituicao": "Universidade de Tecnologia Fictícia (UTF)",
          "ano_conclusao": "2025"
        }
      ],
      "certificacoes_cursos": [
        {
          "nome_item": "IA e Inteligência Computacional",
          "instituicao_emissora": "Escola de Tecnologia e Inovação",
          "ano": "2023"
        },
        {
          "nome_item": "Java",
          "instituicao_emissora": "Escola de Tecnologia e Inovação",
          "ano": "2021"
        },
        {
          "nome_item": "Inglês",
          "instituicao_emissora": "Instituto de Idiomas Global",
          "ano": "2022"
        }
      ]
    };

    // Preenche o editor de JSON de teste
    testJsonEditor.value = JSON.stringify(mockResumeData, null, 2);

    // --- Gerenciamento de Abas ---
    tabOptimize.addEventListener('click', () => {
        tabOptimize.classList.add('active');
        tabTest.classList.remove('active');
        form.style.display = 'block';
        testLayoutForm.style.display = 'none';
        clearConsole();
        addConsoleLine('Terminal pronto para o modo Otimização IA.', 'system');
    });

    tabTest.addEventListener('click', () => {
        tabTest.classList.add('active');
        tabOptimize.classList.remove('active');
        form.style.display = 'none';
        testLayoutForm.style.display = 'block';
        clearConsole();
        addConsoleLine('Terminal pronto para o modo Teste de Layout.', 'system');
    });

    // --- Submissão do Modo de Teste de Layout ---
    testLayoutForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        let parsedJson;
        try {
            parsedJson = JSON.parse(testJsonEditor.value);
        } catch (err) {
            alert('Erro de sintaxe no JSON. Por favor, corrija o formato antes de continuar.');
            return;
        }

        const company = testCompanyInput.value.trim();

        // Limpa logs e prepara terminal
        clearConsole();
        pulseDot.className = 'pulse-dot active';
        addConsoleLine('Iniciando renderização direta a partir do JSON de teste (Bypass IA)...', 'info');

        // Transiciona estados da UI
        showState('loading');
        updateProgress(10, 1);

        try {
            // 1. POST request para /generate-test que envia JSON
            const response = await fetch('/generate-test', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    resumeData: parsedJson,
                    company: company
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Falha ao registrar tarefa de renderização.');
            }

            const { runId } = await response.json();
            addConsoleLine(`Tarefa de teste registrada! ID de Execução: ${runId}`, 'success');
            addConsoleLine('Conectando ao canal de streaming de status (SSE)...', 'info');

            // Fechar conexão SSE ativa anterior
            if (eventSource) {
                eventSource.close();
            }

            // 2. Conecta via Server-Sent Events (SSE) para logs em tempo real
            eventSource = new EventSource(`/status-stream/${runId}`);

            eventSource.onmessage = (event) => {
                const data = JSON.parse(event.data);

                if (data.type === 'connected') {
                    addConsoleLine('Conectado com sucesso ao canal de streaming do servidor.', 'success');
                } 
                else if (data.type === 'log') {
                    addConsoleLine(data.message, data.status);
                    
                    let percentage = 15;
                    if (data.step === 1) percentage = 30;
                    else if (data.step === 2) percentage = 50;
                    else if (data.step === 3) percentage = 80;
                    else if (data.step === 4) percentage = 95;

                    updateProgress(percentage, data.step);
                } 
                else if (data.type === 'success') {
                    addConsoleLine('Renderização de teste finalizada com sucesso!', 'success');
                    pulseDot.className = 'pulse-dot success';
                    updateProgress(100, 4);

                    generatedJsonData = data.data;
                    renderResults(data);

                    setTimeout(() => {
                        showState('success');
                        eventSource.close();
                    }, 800);
                } 
                else if (data.type === 'error') {
                    addConsoleLine(`Erro na execução de teste: ${data.message}`, 'error');
                    pulseDot.className = 'pulse-dot error';
                    alert(`Ocorreu um erro durante a renderização:\n${data.message}`);
                    
                    setTimeout(() => {
                        showState('placeholder');
                        eventSource.close();
                    }, 1000);
                }
            };

            eventSource.onerror = (err) => {
                console.error('Erro de conexão SSE:', err);
                addConsoleLine('Aviso: Perda de conexão temporária com a stream de logs.', 'error');
                eventSource.close();
            };

        } catch (err) {
            console.error(err);
            addConsoleLine(`Falha na submissão do teste: ${err.message}`, 'error');
            pulseDot.className = 'pulse-dot error';
            alert(`Falha ao renderizar layout:\n${err.message}`);
            showState('placeholder');
        }
    });
});
