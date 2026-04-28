<div align="center">

# 🎮 Tetris Retro

**Tetris clássico reimaginado com estética neon, Modo Prisma e arquitetura Angular moderna**

[![Angular](https://img.shields.io/badge/Angular-21-DD0031?logo=angular&logoColor=white)](https://angular.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/testes-40%20specs%20✓-brightgreen)](#testes)
[![PWA](https://img.shields.io/badge/PWA-ready-5A0FC8?logo=pwa&logoColor=white)](#pwa--instalação)
[![License](https://img.shields.io/badge/licença-MIT-blue)](./LICENSE)
[![Demo](https://img.shields.io/badge/demo-live-ff69b4?logo=github)](https://christiandrades.github.io/tetris-retro)

*Construído por [Christian Andrade](https://github.com/christiandrades) · © 2026 KrDevs*

</div>

---

## 📋 Sumário

- [Visão Geral](#visão-geral)
- [Funcionalidades](#funcionalidades)
- [✦ Prisma Pulse](#-prisma-pulse--mecânica-exclusiva)
- [Arquitetura & Clean Code](#arquitetura--clean-code)
- [Tech Stack](#tech-stack)
- [Testes](#testes)
- [PWA & Instalação](#pwa--instalação)
- [Controles](#controles)
- [Como Rodar Localmente](#como-rodar-localmente)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Roadmap](#roadmap)
- [Licença](#licença)

---

## Visão Geral

**Tetris Retro** é uma implementação completa do Tetris clássico construída do zero com Angular 21 e Canvas 2D API, sem dependências de bibliotecas de jogos externas. O projeto foi desenvolvido com foco em qualidade de software: arquitetura limpa, testes unitários abrangentes e suporte a PWA para instalação offline.

Além da jogabilidade clássica fiel ao original, o jogo apresenta o **Modo Prisma** — uma mecânica exclusiva de power-up que transforma completamente a dinâmica de pontuação e cria momentos de alta tensão para o jogador.

> **Motivação**: Este projeto nasceu como laboratório prático para consolidar conhecimentos em Angular standalone components, game loop com `requestAnimationFrame`, design de software orientado a SRP e desenvolvimento orientado a testes com Jasmine/Karma.

---

## Funcionalidades

- **7 tetrominós** clássicos (I, O, T, S, Z, J, L) com rotação correta
- **Ghost piece** — projeta a posição de queda da peça atual
- **Hold** — guarda uma peça para usar depois (máx. 1 hold por peça)
- **Hard drop** com `Space` e soft drop com `↓`
- **Estética CRT retrô** — scanlines, glow neon nos blocos, paleta de cores vibrante
- **Velocidade progressiva** — a cada 10 linhas limpad, o nível sobe e o intervalo de queda reduz
- **Sistema de pontuação** fiel ao Tetris oficial (100 / 300 / 500 / 800 × nível)
- **Modo Prisma** — mecânica exclusiva de power-up (detalhes abaixo)
- **PWA** — instalável em desktop e mobile, funciona offline

---

## ✦ Prisma Pulse — Mecânica Exclusiva

O **Modo Prisma** é a mecânica central que diferencia este projeto. Funciona como um power-up estratégico que recompensa jogo habilidoso.

### Como funciona

```
Limpe linhas → Enche o Medidor Prisma (+20% por linha)
                         ↓
              Medidor atinge 100%
                         ↓
           ⚡ MODO PRISMA ATIVA (20 segundos) ⚡
```

### Efeitos ativos durante o Modo Prisma

| Efeito | Detalhe |
|---|---|
| 🌈 **Tabuleiro arco-íris** | O tabuleiro pulsa com um halo neon em transição de cores |
| 💥 **Prisma Explosion** | Ao limpar uma linha, todos os blocos da cor dominante são destruídos automaticamente (+50 pts por bloco) |
| ✖️2 **Pontuação dobrada** | Todos os pontos ganhos durante o Modo Prisma são multiplicados por 2 |
| ⏱️ **Timer de 20s** | Contagem regressiva visível na HUD; ao expirar, o modo desativa e o medidor reinicia |

### Exemplo de combo

Com nível 1, ao limpar 2 linhas cheias de blocos ciano durante o Modo Prisma:
- Prisma Explosion: `20 blocos × 50 pts × nível 1 = 1.000 pts`
- Limpeza de 2 linhas: `300 × 1 × 2 (multiplicador) = 600 pts`
- **Total: 1.600 pts em uma jogada**

---

## Arquitetura & Clean Code

O componente central `game.component.ts` foi refatorado seguindo os princípios de **Clean Code** e **SRP (Single Responsibility Principle)**. Cada método faz uma coisa, e os nomes falam por si.

### Decomposição de responsabilidades

```
gameLoop()
 ├── update()                 → física e lógica de estado
 │    ├── dropPiece()         → queda automática com base no dropIntervalMs
 │    └── lockPiece()         → fixa a peça no tabuleiro + clearLines()
 │
 └── renderFrame()            → renderização no Canvas
      ├── renderGrid()        → células fixas do tabuleiro
      ├── renderGhostPiece()  → projeção semi-transparente
      ├── renderPiece()       → peça atual
      └── renderHUD()         → score, level, hold, next, prisma

clearLines()
 ├── findCompletedRows()      → detecta linhas completas
 ├── removeRows()             → splice + unshift linha vazia
 ├── updateScore()            → aplica LINE_SCORE_TABLE × nível × multiplicador prisma
 ├── advanceLevel()           → incrementa nível a cada 10 linhas
 └── updatePrismaMeter()      → acumula progresso ou dispara activatePrisma()
```

### Constantes semânticas

```typescript
// Antes
const SCORES = [0, 100, 300, 500, 800];
this.dropDelay = 1000;

// Depois
const LINE_SCORE_TABLE        = [0, 100, 300, 500, 800];
const PRISMA_DURATION_SECONDS = 20;
const PRISMA_METER_FILL_PER_LINE     = 20;
const PRISMA_EXPLOSION_PTS_PER_BLOCK = 50;
private dropIntervalMs = 1000;
```

---

## Tech Stack

| Camada | Tecnologia |
|---|---|
| Framework | Angular 21 (Standalone Components) |
| Linguagem | TypeScript 5.9 |
| Renderização | Canvas 2D API (sem bibliotecas externas) |
| Game Loop | `requestAnimationFrame` + delta time |
| Testes | Jasmine 5.4 + Karma 6.4 + `@angular/build:karma` |
| PWA | Web App Manifest + Service Worker customizado |
| Estilos | SCSS com variáveis CSS para tema neon |
| Build | `@angular/build:application` (esbuild) |
| CI-ready | `ChromeHeadlessNoSandbox` no Karma para pipelines |

---

## Testes

O projeto possui **40 specs unitárias** cobrindo os quatro pilares da lógica do jogo:

```
40 specs, 0 failures
```

### Cobertura por grupo

| Grupo | Specs | O que cobre |
|---|---|---|
| Sanidade | 3 | Criação do componente, dimensões do tabuleiro, estado inicial |
| **Modo Prisma** | 8 | Acúmulo de progresso, ativação em 100%, timer 20s, countdown, x2 score, Prisma Explosion, bloqueio de acúmulo durante o modo |
| Colisão & Movimentação | 7 | Parede esquerda/direita, chão, célula bloqueada, posição válida, teclas ArrowLeft/ArrowRight, pausa |
| Limpeza & Pontuação | 8 | Remoção de linha, inserção de linha vazia, score 1/2/3/4 linhas, multiplicador por nível, contador de linhas, avanço de nível, redução de dropIntervalMs, linha incompleta |
| Hold & Rotação | 6 | Primeiro hold, spawn após hold, troca por hold secundário, bloqueio de hold duplo, canHold=false, ciclo de 4 rotações (peça T), reinício de estado no restart |

### Executar os testes

```bash
# Modo watch (browser interativo)
ng test

# Headless (CI / sem Chrome instalado)
CHROME_BIN=/usr/bin/chromium ng test --watch=false
```

Os testes usam `fakeAsync/tick` para controlar o timer de 20 segundos do Modo Prisma sem aguardar em tempo real, e `spyOn(window, 'requestAnimationFrame')` para suprimir o game loop durante os testes.

---

## PWA & Instalação

O projeto é uma **Progressive Web App** totalmente funcional.

🔗 **[https://christiandrades.github.io/tetris-retro](https://christiandrades.github.io/tetris-retro)**

### Instalação no Desktop (Chrome / Edge)

1. Acesse o link acima
2. Clique no ícone de instalação na barra de endereço (⊕)
3. Confirme a instalação
4. O jogo abre como app nativo, sem barra do navegador

### Instalação no Mobile (iOS / Android)

- **iOS Safari**: "Compartilhar" → "Adicionar à Tela de Início"
- **Android Chrome**: Banner automático ou "Menu" → "Adicionar à tela inicial"

### Comportamento offline

O Service Worker implementa duas estratégias:
- **Cache First** para assets (JS, CSS, ícones) — instantâneo após primeira visita
- **Network First** para navegação — sempre tenta buscar a versão mais recente; cai para o cache se offline

---

## Controles

| Tecla | Ação |
|---|---|
| `←` `→` | Mover peça horizontalmente |
| `↑` | Girar peça (sentido horário) |
| `↓` | Queda suave |
| `Space` | Hard drop (queda instantânea) |
| `C` | Segurar peça atual (hold) |
| `P` | Pausar / Retomar |
| `Enter` | Reiniciar jogo (na tela de Game Over) |

---

## Como Rodar Localmente

### Pré-requisitos

- [Node.js](https://nodejs.org/) 18+
- Angular CLI 21

```bash
npm install -g @angular/cli
```

### Instalar e executar

```bash
git clone https://github.com/christiandrades/tetris-retro.git
cd tetris-retro
npm install
ng serve
```

Abra [http://localhost:4200](http://localhost:4200) no navegador.

### Build de produção

```bash
ng build --configuration production
```

Os arquivos estáticos são gerados em `dist/tetris-retro/browser/`. Compatível com qualquer host estático: GitHub Pages, Netlify, Vercel, Nginx, etc.

---

## Estrutura do Projeto

```
tetris-retro/
├── public/
│   ├── manifest.webmanifest        # Manifesto PWA (nome, ícones, theme_color)
│   ├── sw.js                       # Service Worker customizado (Cache First / Network First)
│   └── icons/
│       ├── icon-192x192.png        # Ícone PWA médio
│       └── icon-512x512.png        # Ícone PWA grande
│
├── src/
│   ├── index.html                  # Meta tags PWA + registro do Service Worker
│   ├── styles.scss                 # Estilos globais (tema neon)
│   └── app/
│       ├── app.ts                  # Componente raiz (standalone)
│       └── game/
│           ├── game.component.ts   # Lógica do jogo, Canvas 2D, Modo Prisma
│           ├── game.component.html # Template (canvas + HUD)
│           ├── game.component.scss # Estilos neon retrô (CRT, scanlines, glow)
│           └── game.component.spec.ts  # 40 specs unitárias (Jasmine/Karma)
│
├── karma.conf.js                   # Config Karma com detecção automática de Chrome
├── tsconfig.spec.json              # TypeScript config para testes
├── angular.json                    # Targets: build, serve, test
└── package.json
```

---

## Roadmap

- [ ] High scores persistidos via `localStorage`
- [ ] Suporte a toque / swipe para mobile
- [ ] Modo 2 jogadores (tabuleiros lado a lado)
- [ ] Efeitos sonoros 8-bit
- [ ] Leaderboard online (integração com backend)
- [ ] Temas visuais alternativos (minimal, Gameboy, Matrix)

---

## Licença

[MIT](./LICENSE) © 2026 Christian Andrade · [KrDevs](https://github.com/christiandrades)

---

<div align="center">

**Feito com ☕ e muita linha de código em Alagoas, Brasil**

</div>
