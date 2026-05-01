import {
  Component, OnInit, OnDestroy,
  ViewChild, ElementRef, HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';

// ── Board configuration ───────────────────────────────────────────────────────
const BOARD_COLS = 10;
const BOARD_ROWS = 20;
const BLOCK_SIZE = 32;

// ── Scoring ───────────────────────────────────────────────────────────────────
// Base points for clearing 1, 2, 3 or 4 lines simultaneously (index = count)
const LINE_SCORE_TABLE = [0, 100, 300, 500, 800];

// ── Prisma Mode ───────────────────────────────────────────────────────────────
const PRISMA_DURATION_SECONDS      = 20;  // how long the mode lasts
const PRISMA_METER_FILL_PER_LINE   = 20;  // % added to meter per cleared line
const PRISMA_EXPLOSION_PTS_PER_BLOCK = 50; // bonus per block removed on explosion

// ── Neon colors for each tetromino type (I O T S Z J L) ──────────────────────
const PIECE_COLORS = [
  '#00f0f0', '#f0f000', '#a000f0',
  '#00f000', '#f00000', '#0000f0', '#f0a000',
];

// ── Tetromino shapes indexed by [type][rotation] ──────────────────────────────
const SHAPES: number[][][][] = [
  // I
  [[[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
   [[0,0,1,0],[0,0,1,0],[0,0,1,0],[0,0,1,0]],
   [[0,0,0,0],[0,0,0,0],[1,1,1,1],[0,0,0,0]],
   [[0,1,0,0],[0,1,0,0],[0,1,0,0],[0,1,0,0]]],
  // O
  [[[1,1],[1,1]]],
  // T
  [[[0,1,0],[1,1,1],[0,0,0]],[[0,1,0],[0,1,1],[0,1,0]],
   [[0,0,0],[1,1,1],[0,1,0]],[[0,1,0],[1,1,0],[0,1,0]]],
  // S
  [[[0,1,1],[1,1,0],[0,0,0]],[[0,1,0],[0,1,1],[0,0,1]],
   [[0,0,0],[0,1,1],[1,1,0]],[[1,0,0],[1,1,0],[0,1,0]]],
  // Z
  [[[1,1,0],[0,1,1],[0,0,0]],[[0,0,1],[0,1,1],[0,1,0]],
   [[0,0,0],[1,1,0],[0,1,1]],[[0,1,0],[1,1,0],[1,0,0]]],
  // J
  [[[1,0,0],[1,1,1],[0,0,0]],[[0,1,1],[0,1,0],[0,1,0]],
   [[0,0,0],[1,1,1],[0,0,1]],[[0,1,0],[0,1,0],[1,1,0]]],
  // L
  [[[0,0,1],[1,1,1],[0,0,0]],[[0,1,0],[0,1,0],[0,1,1]],
   [[0,0,0],[1,1,1],[1,0,0]],[[1,1,0],[0,1,0],[0,1,0]]],
];

class Piece {
  type:     number;
  rotation: number = 0;
  x:        number = 3;
  y:        number = 0;

  constructor(type: number) { this.type = type; }

  get shape(): number[][] {
    return SHAPES[this.type][this.rotation % SHAPES[this.type].length];
  }

  get color(): string {
    return PIECE_COLORS[this.type];
  }
}

@Component({
  selector: 'app-game',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './game.component.html',
  styleUrl: './game.component.scss',
})
export class GameComponent implements OnInit, OnDestroy {
  @ViewChild('gameCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('nextCanvas', { static: true }) nextRef!:   ElementRef<HTMLCanvasElement>;
  @ViewChild('holdCanvas', { static: true }) holdRef!:   ElementRef<HTMLCanvasElement>;

  private gameCtx!: CanvasRenderingContext2D;
  private nextCtx!: CanvasRenderingContext2D;
  private holdCtx!: CanvasRenderingContext2D;

  board:   (string | null)[][] = [];
  current!: Piece;
  next!:    Piece;
  held:     Piece | null = null;
  canHold = true;

  score = 0;
  lines = 0;
  level = 1;

  prismaProgress = 0; // 0–100 %
  prismaActive   = false;
  prismaTimeLeft = 0;

  gameOver = false;
  paused   = false;

  private animationFrameId!:     number;
  private prismaCountdownTimer!: ReturnType<typeof setInterval>;
  private dropIntervalMs   = 1000;
  private dropAccumulatedMs = 0;
  private lastFrameTime     = 0;

  // ── Touch state ───────────────────────────────────────────────────────────
  private touchStartX     = 0;
  private touchStartY     = 0;
  private touchLastX      = 0;
  private touchLastY      = 0;
  private touchStartTime  = 0;
  private touchHasGesture = false;

  // Thresholds (in CSS pixels, device-independent)
  private readonly TOUCH_CELL_PX   = 28; // horizontal pixels per cell move
  private readonly TOUCH_DROP_PX   = 24; // vertical pixels per soft-drop step
  private readonly TAP_MAX_PX      = 12; // max displacement to be counted as tap
  private readonly HARD_DROP_SPEED = 0.4; // px/ms minimum for hard-drop flick

  // Bound references kept for proper removeEventListener cleanup
  private boundTouchStart!: (e: TouchEvent) => void;
  private boundTouchMove!:  (e: TouchEvent) => void;
  private boundTouchEnd!:   (e: TouchEvent) => void;

  ngOnInit(): void {
    this.gameCtx = this.canvasRef.nativeElement.getContext('2d')!;
    this.nextCtx = this.nextRef.nativeElement.getContext('2d')!;
    this.holdCtx = this.holdRef.nativeElement.getContext('2d')!;
    this.initTouchListeners();
    this.restart();
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.animationFrameId);
    clearInterval(this.prismaCountdownTimer);
    this.removeTouchListeners();
  }

  // ── Board ─────────────────────────────────────────────────────────────────

  private resetBoard(): void {
    this.board = Array.from({ length: BOARD_ROWS }, () => Array(BOARD_COLS).fill(null));
  }

  private spawn(): void {
    this.current   = this.next;
    this.current.x = Math.floor(BOARD_COLS / 2) - Math.floor(this.current.shape[0].length / 2);
    this.current.y = 0;
    this.next      = new Piece(Math.floor(Math.random() * 7));
    this.canHold   = true;
    if (this.collides(this.current, 0, 0)) this.gameOver = true;
  }

  private collides(
    piece: Piece,
    offsetX: number,
    offsetY: number,
    targetRotation?: number,
  ): boolean {
    const shape = targetRotation !== undefined
      ? SHAPES[piece.type][targetRotation % SHAPES[piece.type].length]
      : piece.shape;

    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (!shape[row][col]) continue;

        const boardX = piece.x + col + offsetX;
        const boardY = piece.y + row + offsetY;

        if (boardX < 0 || boardX >= BOARD_COLS || boardY >= BOARD_ROWS) return true;
        if (boardY >= 0 && this.board[boardY][boardX]) return true;
      }
    }
    return false;
  }

  private lock(): void {
    for (let row = 0; row < this.current.shape.length; row++) {
      for (let col = 0; col < this.current.shape[row].length; col++) {
        if (!this.current.shape[row][col]) continue;
        const boardY = this.current.y + row;
        const boardX = this.current.x + col;
        if (boardY >= 0) this.board[boardY][boardX] = this.current.color;
      }
    }
    this.clearLines();
    this.spawn();
  }

  // ── Line clearing ─────────────────────────────────────────────────────────

  private clearLines(): void {
    const completedRows = this.findCompletedRows();
    if (!completedRows.length) return;

    if (this.prismaActive) this.prismaExplosion(completedRows);

    this.removeRows(completedRows);
    this.updateScore(completedRows.length);
    this.advanceLevel();
    this.updatePrismaMeter(completedRows.length);
  }

  private findCompletedRows(): number[] {
    const completed: number[] = [];
    for (let row = BOARD_ROWS - 1; row >= 0; row--) {
      if (this.board[row].every(cell => cell !== null)) completed.push(row);
    }
    return completed;
  }

  private removeRows(completedRows: number[]): void {
    for (const row of completedRows) {
      this.board.splice(row, 1);
      this.board.unshift(Array(BOARD_COLS).fill(null));
    }
  }

  private updateScore(lineCount: number): void {
    const baseScore        = LINE_SCORE_TABLE[lineCount] ?? 800;
    const prismaMultiplier = this.prismaActive ? 2 : 1;
    this.score += baseScore * this.level * prismaMultiplier;
    this.lines += lineCount;
  }

  private advanceLevel(): void {
    this.level         = Math.floor(this.lines / 10) + 1;
    this.dropIntervalMs = Math.max(100, 1000 - (this.level - 1) * 90);
  }

  private updatePrismaMeter(linesCleared: number): void {
    if (this.prismaActive) return;
    this.prismaProgress = Math.min(100, this.prismaProgress + linesCleared * PRISMA_METER_FILL_PER_LINE);
    if (this.prismaProgress >= 100) this.activatePrisma();
  }

  // ── Prisma Mode ───────────────────────────────────────────────────────────

  private activatePrisma(): void {
    this.prismaActive   = true;
    this.prismaTimeLeft = PRISMA_DURATION_SECONDS;
    this.prismaProgress = 0;
    this.prismaCountdownTimer = setInterval(() => {
      if (--this.prismaTimeLeft <= 0) {
        this.prismaActive = false;
        clearInterval(this.prismaCountdownTimer);
      }
    }, 1000);
  }

  // Finds the dominant color among cleared rows and removes every matching
  // cell still on the board, awarding bonus points for each one removed.
  private prismaExplosion(completedRows: number[]): void {
    const colorFrequency: Record<string, number> = {};
    for (const row of completedRows) {
      for (const cell of this.board[row]) {
        if (cell) colorFrequency[cell] = (colorFrequency[cell] ?? 0) + 1;
      }
    }

    const dominantColor = Object.entries(colorFrequency)
      .sort((a, b) => b[1] - a[1])[0]?.[0];
    if (!dominantColor) return;

    let explosionBonus = 0;
    for (let row = 0; row < BOARD_ROWS; row++) {
      for (let col = 0; col < BOARD_COLS; col++) {
        if (this.board[row][col] === dominantColor) {
          this.board[row][col] = null;
          explosionBonus += PRISMA_EXPLOSION_PTS_PER_BLOCK;
        }
      }
    }
    this.score += explosionBonus * this.level;
  }

  // ── Touch input ───────────────────────────────────────────────────────────

  // Attach listeners with { passive: false } so preventDefault() is allowed,
  // which blocks native scroll/zoom while the user is interacting with the board.
  private initTouchListeners(): void {
    const canvas = this.canvasRef.nativeElement;
    this.boundTouchStart = (e) => this.onTouchStart(e);
    this.boundTouchMove  = (e) => this.onTouchMove(e);
    this.boundTouchEnd   = (e) => this.onTouchEnd(e);
    canvas.addEventListener('touchstart', this.boundTouchStart, { passive: false });
    canvas.addEventListener('touchmove',  this.boundTouchMove,  { passive: false });
    canvas.addEventListener('touchend',   this.boundTouchEnd,   { passive: false });
  }

  private removeTouchListeners(): void {
    const canvas = this.canvasRef.nativeElement;
    canvas.removeEventListener('touchstart', this.boundTouchStart);
    canvas.removeEventListener('touchmove',  this.boundTouchMove);
    canvas.removeEventListener('touchend',   this.boundTouchEnd);
  }

  private onTouchStart(e: TouchEvent): void {
    e.preventDefault();
    const t = e.changedTouches[0];
    this.touchStartX     = t.clientX;
    this.touchStartY     = t.clientY;
    this.touchLastX      = t.clientX;
    this.touchLastY      = t.clientY;
    this.touchStartTime  = Date.now();
    this.touchHasGesture = false;
  }

  // touchmove: real-time horizontal moves + continuous soft drop while dragging.
  private onTouchMove(e: TouchEvent): void {
    e.preventDefault();
    if (this.gameOver || this.paused) return;

    const t  = e.changedTouches[0];
    const dx = t.clientX - this.touchLastX;
    const dy = t.clientY - this.touchLastY;

    if (Math.abs(dx) >= this.TOUCH_CELL_PX) {
      const dir = dx > 0 ? 1 : -1;
      if (!this.collides(this.current, dir, 0)) this.current.x += dir;
      this.touchLastX      = t.clientX;
      this.touchHasGesture = true;
    }

    if (dy >= this.TOUCH_DROP_PX) {
      if (!this.collides(this.current, 0, 1)) this.current.y++;
      else this.lock();
      this.touchLastY      = t.clientY;
      this.touchHasGesture = true;
    }
  }

  // touchend: classify the gesture as tap, hard-drop flick or swipe-up (hold).
  private onTouchEnd(e: TouchEvent): void {
    e.preventDefault();

    if (this.gameOver) { this.restart(); return; }
    if (this.paused)   { this.paused = false; return; }

    const t      = e.changedTouches[0];
    const totalDx = t.clientX - this.touchStartX;
    const totalDy = t.clientY - this.touchStartY;
    const dt      = Date.now() - this.touchStartTime;

    const absDx = Math.abs(totalDx);
    const absDy = Math.abs(totalDy);

    // Tap — minimal movement in any direction → rotate
    if (absDx < this.TAP_MAX_PX && absDy < this.TAP_MAX_PX) {
      this.rotate();
      return;
    }

    // Fast downward flick → hard drop
    if (absDy > absDx && totalDy > 0 && (totalDy / dt) >= this.HARD_DROP_SPEED) {
      this.hardDrop();
      return;
    }

    // Swipe up → hold
    if (absDy > absDx && totalDy < -40) {
      this.hold();
    }
  }

  // ── Keyboard input ────────────────────────────────────────────────────────

  @HostListener('window:keydown', ['$event'])
  onKey(event: KeyboardEvent): void {
    if (this.gameOver) {
      if (event.key === 'Enter') this.restart();
      return;
    }
    if (event.key === 'p' || event.key === 'P') {
      this.paused = !this.paused;
      return;
    }
    if (this.paused) return;

    switch (event.key) {
      case 'ArrowLeft':
        if (!this.collides(this.current, -1, 0)) this.current.x--;
        break;
      case 'ArrowRight':
        if (!this.collides(this.current, 1, 0)) this.current.x++;
        break;
      case 'ArrowDown':
        if (!this.collides(this.current, 0, 1)) this.current.y++;
        else this.lock();
        break;
      case 'ArrowUp':
        this.rotate();
        break;
      case ' ':
        this.hardDrop();
        break;
      case 'c':
      case 'C':
        this.hold();
        break;
    }
    event.preventDefault();
  }

  private rotate(): void {
    const nextRotation = (this.current.rotation + 1) % SHAPES[this.current.type].length;
    if      (!this.collides(this.current,  0, 0, nextRotation)) { this.current.rotation = nextRotation; }
    else if (!this.collides(this.current,  1, 0, nextRotation)) { this.current.x++; this.current.rotation = nextRotation; }
    else if (!this.collides(this.current, -1, 0, nextRotation)) { this.current.x--; this.current.rotation = nextRotation; }
  }

  private hardDrop(): void {
    while (!this.collides(this.current, 0, 1)) this.current.y++;
    this.lock();
  }

  private hold(): void {
    if (!this.canHold) return;
    if (!this.held) {
      this.held = this.current;
      this.spawn();
    } else {
      [this.current, this.held] = [this.held, this.current];
      this.current.x        = Math.floor(BOARD_COLS / 2) - Math.floor(this.current.shape[0].length / 2);
      this.current.y        = 0;
      this.current.rotation = 0;
    }
    this.canHold = false;
  }

  private ghostY(): number {
    let dropOffset = 0;
    while (!this.collides(this.current, 0, dropOffset + 1)) dropOffset++;
    return this.current.y + dropOffset;
  }

  // ── Game lifecycle ────────────────────────────────────────────────────────

  restart(): void {
    clearInterval(this.prismaCountdownTimer);
    cancelAnimationFrame(this.animationFrameId);
    this.score             = 0;
    this.lines             = 0;
    this.level             = 1;
    this.dropIntervalMs    = 1000;
    this.dropAccumulatedMs = 0;
    this.lastFrameTime     = 0;
    this.held              = null;
    this.canHold           = true;
    this.gameOver          = false;
    this.paused            = false;
    this.prismaProgress    = 0;
    this.prismaActive      = false;
    this.prismaTimeLeft    = 0;
    this.resetBoard();
    this.next = new Piece(Math.floor(Math.random() * 7));
    this.spawn();
    this.animationFrameId = requestAnimationFrame(timestamp => this.gameLoop(timestamp));
  }

  // ── Render ────────────────────────────────────────────────────────────────

  private gameLoop(timestamp: number): void {
    if (!this.gameOver && !this.paused) {
      this.dropAccumulatedMs += timestamp - this.lastFrameTime;
      if (this.dropAccumulatedMs >= this.dropIntervalMs) {
        if (!this.collides(this.current, 0, 1)) this.current.y++;
        else this.lock();
        this.dropAccumulatedMs = 0;
      }
    }
    this.lastFrameTime = timestamp;
    this.renderFrame();
    this.animationFrameId = requestAnimationFrame(t => this.gameLoop(t));
  }

  private renderFrame(): void {
    const ctx = this.gameCtx;
    ctx.fillStyle = '#080810';
    ctx.fillRect(0, 0, BOARD_COLS * BLOCK_SIZE, BOARD_ROWS * BLOCK_SIZE);

    this.renderGrid(ctx);
    this.renderLockedBlocks();
    this.renderGhostPiece();
    this.renderPiece(ctx, this.current, this.current.x, this.current.y);
    this.renderPreviews();

    if (this.prismaActive) this.renderPrismaOverlay();
    if (this.gameOver)     this.renderOverlayScreen('GAME OVER', 'ENTER to restart', '#ff0055');
    if (this.paused)       this.renderOverlayScreen('PAUSED',    'P to resume',       '#00f0f0');
  }

  private renderGrid(ctx: CanvasRenderingContext2D): void {
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth   = 0.5;
    for (let row = 0; row < BOARD_ROWS; row++) {
      for (let col = 0; col < BOARD_COLS; col++) {
        ctx.strokeRect(col * BLOCK_SIZE, row * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
      }
    }
  }

  private renderLockedBlocks(): void {
    for (let row = 0; row < BOARD_ROWS; row++) {
      for (let col = 0; col < BOARD_COLS; col++) {
        if (this.board[row][col]) {
          this.renderBlock(this.gameCtx, col, row, this.board[row][col]!);
        }
      }
    }
  }

  private renderGhostPiece(): void {
    const ghostRow = this.ghostY();
    const shape    = this.current.shape;

    this.gameCtx.globalAlpha = 0.25;
    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (!shape[row][col]) continue;
        this.gameCtx.strokeStyle = this.current.color;
        this.gameCtx.lineWidth   = 1.5;
        this.gameCtx.strokeRect(
          (this.current.x + col) * BLOCK_SIZE + 2,
          (ghostRow + row) * BLOCK_SIZE + 2,
          BLOCK_SIZE - 4,
          BLOCK_SIZE - 4,
        );
      }
    }
    this.gameCtx.globalAlpha = 1;
  }

  private renderPiece(
    ctx: CanvasRenderingContext2D,
    piece: Piece,
    originCol: number,
    originRow: number,
  ): void {
    for (let row = 0; row < piece.shape.length; row++) {
      for (let col = 0; col < piece.shape[row].length; col++) {
        if (piece.shape[row][col]) {
          this.renderBlock(ctx, originCol + col, originRow + row, piece.color);
        }
      }
    }
  }

  private renderPreviews(): void {
    const previews: [CanvasRenderingContext2D, Piece | null, number][] = [
      [this.nextCtx, this.next, 1],
      [this.holdCtx, this.held, this.canHold ? 1 : 0.35],
    ];

    for (const [ctx, piece, opacity] of previews) {
      ctx.fillStyle = '#080810';
      ctx.fillRect(0, 0, 128, 128);
      if (!piece) continue;
      ctx.globalAlpha = opacity;
      const offsetCol = Math.floor((4 - piece.shape[0].length) / 2);
      const offsetRow = Math.floor((4 - piece.shape.length)    / 2);
      this.renderPiece(ctx, piece, offsetCol, offsetRow);
      ctx.globalAlpha = 1;
    }
  }

  private renderBlock(
    ctx: CanvasRenderingContext2D,
    col: number,
    row: number,
    color: string,
  ): void {
    const pixelX    = col * BLOCK_SIZE + 1;
    const pixelY    = row * BLOCK_SIZE + 1;
    const innerSize = BLOCK_SIZE - 2;

    ctx.fillStyle = color;
    ctx.fillRect(pixelX, pixelY, innerSize, innerSize);

    // Bevel highlight on top and left edges
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.fillRect(pixelX, pixelY, innerSize, 4);
    ctx.fillRect(pixelX, pixelY, 4, innerSize);

    // Neon glow pass
    ctx.shadowColor = color;
    ctx.shadowBlur  = 10;
    ctx.fillStyle   = color;
    ctx.fillRect(pixelX, pixelY, innerSize, innerSize);
    ctx.shadowBlur  = 0;
  }

  private renderPrismaOverlay(): void {
    const rainbowHue = (Date.now() / 18) % 360;
    const pulseAlpha = 0.07 + Math.abs(Math.sin(Date.now() / 350)) * 0.07;

    this.gameCtx.fillStyle = `hsla(${rainbowHue},100%,60%,${pulseAlpha})`;
    this.gameCtx.fillRect(0, 0, BOARD_COLS * BLOCK_SIZE, BOARD_ROWS * BLOCK_SIZE);

    this.gameCtx.strokeStyle = `hsl(${rainbowHue},100%,65%)`;
    this.gameCtx.lineWidth   = 3;
    this.gameCtx.shadowColor = `hsl(${rainbowHue},100%,65%)`;
    this.gameCtx.shadowBlur  = 20;
    this.gameCtx.strokeRect(2, 2, BOARD_COLS * BLOCK_SIZE - 4, BOARD_ROWS * BLOCK_SIZE - 4);
    this.gameCtx.shadowBlur  = 0;
  }

  private renderOverlayScreen(title: string, subtitle: string, color: string): void {
    const canvasWidth  = BOARD_COLS * BLOCK_SIZE;
    const canvasHeight = BOARD_ROWS * BLOCK_SIZE;

    this.gameCtx.fillStyle = 'rgba(0,0,0,0.72)';
    this.gameCtx.fillRect(0, 0, canvasWidth, canvasHeight);

    this.gameCtx.textAlign   = 'center';
    this.gameCtx.shadowColor = color;
    this.gameCtx.shadowBlur  = 22;
    this.gameCtx.fillStyle   = color;
    this.gameCtx.font        = 'bold 26px "Press Start 2P", monospace';
    this.gameCtx.fillText(title, canvasWidth / 2, canvasHeight / 2 - 18);

    this.gameCtx.shadowBlur = 0;
    this.gameCtx.fillStyle  = 'rgba(255,255,255,0.7)';
    this.gameCtx.font       = '9px "Press Start 2P", monospace';
    this.gameCtx.fillText(subtitle, canvasWidth / 2, canvasHeight / 2 + 22);
  }
}
