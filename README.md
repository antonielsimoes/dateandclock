# Agora — relógio material

Site estático que mostra **hora, data e dia da semana** em tempo real, com visual inspirado no Material Design 3 e na paleta de referência anexada.

![Prévia do site](preview-desktop.png)

## Como abrir

Não há dependências nem etapa de build. Basta abrir o `index.html` no navegador.

Para uma experiência completa (especialmente do botão **Copiar horário**, que usa a área de transferência), recomenda-se servir a pasta localmente:

```bash
python -m http.server 8080
```

Depois acesse `http://localhost:8080`.

## Recursos

- Relógio digital com segundos e relógio analógico sincronizados.
- Dia da semana e data completa em português.
- Calendário da semana atual com destaque para hoje.
- Progresso do dia e tempo restante até a meia-noite.
- Alternância entre formato 24 h e 12 h.
- Opção para ocultar os segundos no relógio digital e analógico.
- Tema claro/escuro com preferência salva no navegador.
- Botão para copiar o horário, com snackbar de confirmação.
- Layout responsivo, navegação por teclado e respeito a `prefers-reduced-motion`.

## Estrutura

| Arquivo | Função |
| --- | --- |
| `index.html` | Estrutura e conteúdo da página |
| `styles.css` | Sistema visual, layout e temas |
| `script.js` | Relógio, calendário, preferências e interações |
| `favicon.svg` | Ícone do site |
| `preview-desktop.png` | Prévia em desktop |
| `preview-tablet.png` | Prévia em tablet |
| `preview-mobile.png` | Prévia completa em mobile |
| `preview-dark.png` | Prévia do tema escuro |

## Paleta

As cores principais foram extraídas da imagem de referência:

| Cor | Hex |
| --- | --- |
| Roxo principal | `#4A2BC7` |
| Azul | `#0097FF` |
| Verde-água | `#41D9B5` |
| Lilás | `#DCCEF4` |
| Cinza de superfície | `#F2F2F2` |

Os tokens ficam no topo de `styles.css`, em `:root` e `[data-theme="dark"]`.

## Personalização do fuso

O fuso padrão é `America/Sao_Paulo`. Para trocar, altere a constante `TIME_ZONE` no início de `script.js` e atualize os textos de localização no `index.html`.
