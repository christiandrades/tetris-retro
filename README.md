# Tetris Retro

> Tetris retrô com estética neon colorida e o recurso exclusivo **Prisma Pulse**.  
> Construído com Angular · © 2026 Christian Andrade & KrDevs

---

## Funcionalidades

- Jogabilidade clássica do Tetris (7 tetrominós, wall kick, peça fantasma, hold)
- Estética retrô CRT com scanlines e brilho neon nos blocos
- Velocidade progressiva — a cada 10 linhas o nível aumenta
- **Prisma Pulse** — mecânica exclusiva (ver abaixo)

### ✦ Prisma Pulse — recurso exclusivo

Limpe linhas para encher o **Medidor Prisma** (cada linha = 20%).  
Quando o medidor atingir 100% o **Modo Prisma** ativa por **10 segundos**:

| Efeito | Descrição |
|---|---|
| Tabuleiro arco-íris | O tabuleiro pulsa com um halo neon em mudança |
| Explosão Prisma | Cada linha limpa detona todos os blocos da mesma cor no tabuleiro para pontos bônus |
| x2 pontuação | Todos os pontos ganhos durante o Modo Prisma são dobrados |

Planeje suas colocações para configurar explosões em cadeia e obter pontuações massivas!

---

## Controles

| Tecla | Ação |
|---|---|
| `← →` | Mover peça |
| `↑` | Girar |
| `↓` | Queda suave |
| `Space` | Queda dura |
| `C` | Segurar peça |
| `P` | Pausar / Retomar |
| `Enter` | Reiniciar (tela de game over) |

---

## Como Começar

### Pré-requisitos

- [Node.js](https://nodejs.org/) 18+
- Angular CLI 19+

```bash
npm install -g @angular/cli
```

### Instalar & Executar

```bash
git clone https://github.com/christiandrades/tetris-retro.git
cd tetris-retro
npm install
ng serve
```

Abra `http://localhost:4200` no navegador.

### Build para Produção

```bash
ng build --configuration production
```

Os arquivos estáticos são gerados em `dist/tetris-retro/browser/`. Sirva com qualquer host estático (Nginx, GitHub Pages, Netlify, Vercel, etc.).

---

## Estrutura do Projeto

```
src/
└── app/
    ├── game/
    │   ├── game.component.ts     # Lógica do jogo, renderização, Prisma Pulse
    │   ├── game.component.html   # Template
    │   └── game.component.scss   # Estilos neon retrô
    ├── app.ts                    # Componente raiz
    ├── app.html
    └── app.scss
```

---

## Licença

[MIT](./LICENSE) © 2026 Christian Andrade & KrDevs

---

# Tetris Retro

> Retro Tetris with colorful neon aesthetics and the exclusive **Prisma Pulse** feature.  
> Built with Angular · © 2026 Christian Andrade & KrDevs

---

## Features

- Classic Tetris gameplay (7 tetrominoes, wall kick, ghost piece, hold)
- Retro CRT scanline aesthetic with neon block glow
- Progressive speed — each 10 lines advances the level
- **Prisma Pulse** — exclusive mechanic (see below)

### ✦ Prisma Pulse — exclusive feature

Clear lines to fill the **Prisma Meter** (each line = 20 %).  
When the meter reaches 100 % **Prisma Mode** activates for **10 seconds**:

| Effect | Description |
|---|---|
| Rainbow board | The board pulses with a shifting neon halo |
| Prisma Explosion | Every line cleared detonates all same-color blocks on the board for bonus points |
| x2 score | All points earned during Prisma Mode are doubled |

Plan your placements to set up chain explosions for massive scores!

---

## Controls

| Key | Action |
|---|---|
| `← →` | Move piece |
| `↑` | Rotate |
| `↓` | Soft drop |
| `Space` | Hard drop |
| `C` | Hold piece |
| `P` | Pause / Resume |
| `Enter` | Restart (game over screen) |

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- Angular CLI 19+

```bash
npm install -g @angular/cli
```

### Install & Run

```bash
git clone https://github.com/christiandrades/tetris-retro.git
cd tetris-retro
npm install
ng serve
```

Open `http://localhost:4200` in your browser.

### Production Build

```bash
ng build --configuration production
```

Static files are output to `dist/tetris-retro/browser/`. Serve with any static host (Nginx, GitHub Pages, Netlify, Vercel, etc.).

---

## Project Structure

```
src/
└── app/
    ├── game/
    │   ├── game.component.ts     # Game logic, rendering, Prisma Pulse
    │   ├── game.component.html   # Template
    │   └── game.component.scss   # Neon retro styles
    ├── app.ts                    # Root component
    ├── app.html
    └── app.scss
```

---

## License

[MIT](./LICENSE) © 2026 Christian Andrade & KrDevs
