``` .docx
{{dados_contato.nome_completo}}
{{dados_contato.cargo_desejado}}
{{dados_contato.cidade}} - {{dados_contato.estado}}  |  {{dados_contato.telefone}}  |  {{dados_contato.email}}
LinkedIn: {{dados_contato.linkedin_url}}  |  GitHub/Portfólio: {{dados_contato.github_portfolio_url}}
RESUMO PROFISSIONAL
{{resumo_profissional}}
PRINCIPAIS COMPETÊNCIAS
•	Hard Skills: {% for skill in competencias.hard_skills %}{{skill}}{% if not loop.last %}, {% endif %}{% endfor %}
•	Sistemas e Ferramentas: {% for tool in competencias.sistemas_ferramentas %}{{tool}}{% if not loop.last %}, {% endif %}{% endfor %}
•	Soft Skills & Idiomas: {% for item in competencias.soft_skills_idiomas %}{{item}}{% if not loop.last %}, {% endif %}{% endfor %}
EXPERIÊNCIA PROFISSIONAL
{% for exp in experiencias_profissionais %}
{{exp.cargo}}  |  {{exp.empresa}}	{{exp.data_inicio}} – {{exp.data_fim}}
  {% for conquista in exp.conquistas_e_atividades %}
•	{{conquista}}
  {% endfor %}
{% endfor %}
FORMAÇÃO ACADÊMICA
{% for edu in formacao_academica %}
{{edu.curso}}  |  {{edu.instituicao}}	{{edu.ano_conclusao}}
{% endfor %}
CERTIFICAÇÕES E CURSOS COMPLEMENTARES
{% for cert in certificacoes_cursos %}
•	{{cert.nome_item}} {% if cert.instituicao_emissora %}– {{cert.instituicao_emissora}}{% endif %}{% if cert.ano %} ({{cert.ano}}){% endif %}
{% endfor %}

```