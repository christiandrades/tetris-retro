import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { GameComponent } from './game.component';

// ── Utilitário ────────────────────────────────────────────────────────────────

/** Preenche uma linha inteira do tabuleiro com a cor informada. */
function fillRow(
  board: (string | null)[][],
  row: number,
  color = '#00f0f0',
): void {
  board[row].fill(color);
}

// ─────────────────────────────────────────────────────────────────────────────

describe('GameComponent', () => {
  let component: GameComponent;
  let fixture: ComponentFixture<GameComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GameComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(GameComponent);
    component = fixture.componentInstance;

    // Suprime o loop de animação para que os testes controlem o estado manualmente
    spyOn(window, 'requestAnimationFrame').and.returnValue(1 as unknown as number);
    spyOn(window, 'cancelAnimationFrame');

    fixture.detectChanges(); // dispara ngOnInit → restart()
  });

  afterEach(() => {
    component.ngOnDestroy();
  });

  // ── Sanidade ──────────────────────────────────────────────────────────────

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });

  it('deve inicializar tabuleiro com 20 linhas e 10 colunas, todas nulas', () => {
    expect(component.board.length).toBe(20);
    expect(component.board[0].length).toBe(10);
    component.board.forEach(row =>
      row.forEach(cell => expect(cell).toBeNull()),
    );
  });

  it('deve iniciar com score, lines e level nos valores padrão', () => {
    expect(component.score).toBe(0);
    expect(component.lines).toBe(0);
    expect(component.level).toBe(1);
  });

  // ── Modo Prisma ───────────────────────────────────────────────────────────

  describe('Modo Prisma', () => {

    it('deve iniciar inativo com progresso em 0%', () => {
      expect(component.prismaActive).toBeFalse();
      expect(component.prismaProgress).toBe(0);
    });

    it('deve acumular +20% de progresso por linha limpa', () => {
      fillRow(component.board, 19);
      (component as any).clearLines();
      expect(component.prismaProgress).toBe(20);

      fillRow(component.board, 19);
      (component as any).clearLines();
      expect(component.prismaProgress).toBe(40);
    });

    it('deve ativar ao atingir 100% do medidor', () => {
      component.prismaProgress = 80;
      fillRow(component.board, 19); // +20% → 100%
      (component as any).clearLines();

      expect(component.prismaActive).toBeTrue();
    });

    it('deve zerar o progresso ao ativar o modo', () => {
      component.prismaProgress = 80;
      fillRow(component.board, 19);
      (component as any).clearLines();

      expect(component.prismaProgress).toBe(0);
    });

    it('deve ativar com prismaTimeLeft = 20 segundos', fakeAsync(() => {
      (component as any).activatePrisma();

      expect(component.prismaActive).toBeTrue();
      expect(component.prismaTimeLeft).toBe(20);

      tick(20000);
    }));

    it('deve desativar automaticamente após 20 segundos', fakeAsync(() => {
      (component as any).activatePrisma();

      tick(19000);
      expect(component.prismaActive).toBeTrue();

      tick(1000);
      expect(component.prismaActive).toBeFalse();
    }));

    it('deve decrementar prismaTimeLeft a cada segundo', fakeAsync(() => {
      (component as any).activatePrisma();

      tick(5000);
      expect(component.prismaTimeLeft).toBe(15);

      tick(10000);
      expect(component.prismaTimeLeft).toBe(5);

      tick(5000);
    }));

    it('deve dobrar o score de limpeza durante o Modo Prisma', () => {
      component.score = 0;
      component.level = 1;
      component.prismaActive = true;

      fillRow(component.board, 19);
      (component as any).clearLines();

      // 1 linha = base 100 × level 1 × multiplicador 2 (prisma) = 200
      expect(component.score).toBe(200);
    });

    it('deve remover blocos da cor dominante via Prisma Explosion', () => {
      // Duas linhas cheias de ciano (dominante) + resíduos em outra linha
      component.board[18].fill('#00f0f0');
      component.board[19].fill('#00f0f0');
      component.board[17][0] = '#00f0f0'; // resíduo da cor dominante
      component.board[17][1] = '#00f0f0';

      component.prismaActive = true;
      const scoreBefore = component.score;

      (component as any).clearLines();

      // Resíduos ciano da linha 17 devem ter sido explodidos
      expect(component.board[17][0]).toBeNull();
      expect(component.board[17][1]).toBeNull();
      // Bônus de explosão é adicionado ao score
      expect(component.score).toBeGreaterThan(scoreBefore);
    });

    it('não deve acumular progresso enquanto o Modo Prisma estiver ativo', fakeAsync(() => {
      (component as any).activatePrisma();

      fillRow(component.board, 19);
      (component as any).clearLines();

      expect(component.prismaProgress).toBe(0); // não acumula durante o modo

      tick(20000);
    }));
  });

  // ── Colisão e movimentação ────────────────────────────────────────────────

  describe('Colisão e movimentação', () => {

    it('deve detectar colisão com a parede esquerda', () => {
      component.current.x = 0;
      expect((component as any).collides(component.current, -1, 0)).toBeTrue();
    });

    it('deve detectar colisão com a parede direita', () => {
      component.current.x = 9;
      expect((component as any).collides(component.current, 1, 0)).toBeTrue();
    });

    it('deve detectar colisão com o chão', () => {
      component.current.y = 19;
      expect((component as any).collides(component.current, 0, 1)).toBeTrue();
    });

    it('deve detectar colisão com célula bloqueada no tabuleiro', () => {
      component.current.x = 0;
      component.current.y = 0;
      component.board[1][0] = '#f0a000'; // célula bloqueada abaixo
      expect((component as any).collides(component.current, 0, 1)).toBeTrue();
    });

    it('não deve colidir em posição central válida', () => {
      component.current.x = 4;
      component.current.y = 0;
      expect((component as any).collides(component.current, 0, 0)).toBeFalse();
    });

    it('deve mover a peça para a esquerda via tecla ArrowLeft', () => {
      // Posiciona peça com margem à esquerda
      component.current.x = 5;
      const xInicial = component.current.x;

      component.onKey(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));

      expect(component.current.x).toBe(xInicial - 1);
    });

    it('deve mover a peça para a direita via tecla ArrowRight', () => {
      component.current.x = 3;
      const xInicial = component.current.x;

      component.onKey(new KeyboardEvent('keydown', { key: 'ArrowRight' }));

      expect(component.current.x).toBe(xInicial + 1);
    });

    it('deve alternar pausa via tecla P', () => {
      expect(component.paused).toBeFalse();
      component.onKey(new KeyboardEvent('keydown', { key: 'p' }));
      expect(component.paused).toBeTrue();
      component.onKey(new KeyboardEvent('keydown', { key: 'p' }));
      expect(component.paused).toBeFalse();
    });
  });

  // ── Limpeza de linhas e pontuação ─────────────────────────────────────────

  describe('Limpeza de linhas e pontuação', () => {

    beforeEach(() => {
      component.score         = 0;
      component.lines         = 0;
      component.level         = 1;
      component.prismaActive  = false;
      component.prismaProgress = 0;
    });

    it('deve remover linha completa e inserir linha vazia no topo', () => {
      fillRow(component.board, 19);
      (component as any).clearLines();

      // Linha do topo deve ser vazia
      expect(component.board[0].every((c: string | null) => c === null)).toBeTrue();
      // Linha do fundo também (a linha que foi removida virou a nova linha vazia no topo)
      expect(component.board[19].every((c: string | null) => c === null)).toBeTrue();
    });

    it('deve calcular score de 1 linha: 100 × nível', () => {
      fillRow(component.board, 19);
      (component as any).clearLines();
      expect(component.score).toBe(100);
    });

    it('deve calcular score de 2 linhas: 300 × nível', () => {
      fillRow(component.board, 18);
      fillRow(component.board, 19);
      (component as any).clearLines();
      expect(component.score).toBe(300);
    });

    it('deve calcular score de 3 linhas: 500 × nível', () => {
      fillRow(component.board, 17);
      fillRow(component.board, 18);
      fillRow(component.board, 19);
      (component as any).clearLines();
      expect(component.score).toBe(500);
    });

    it('deve calcular score de 4 linhas (Tetris): 800 × nível', () => {
      for (let r = 16; r <= 19; r++) fillRow(component.board, r);
      (component as any).clearLines();
      expect(component.score).toBe(800);
    });

    it('deve multiplicar score pelo nível atual', () => {
      component.level = 3;
      fillRow(component.board, 19);
      (component as any).clearLines();
      expect(component.score).toBe(300); // 100 × 3
    });

    it('deve incrementar o contador de linhas', () => {
      fillRow(component.board, 19);
      (component as any).clearLines();
      expect(component.lines).toBe(1);
    });

    it('deve avançar de nível após 10 linhas acumuladas', () => {
      component.lines = 9;
      fillRow(component.board, 19);
      (component as any).clearLines();
      expect(component.level).toBe(2);
    });

    it('deve reduzir o dropDelay ao avançar de nível', () => {
      const delayInicial = (component as any).dropDelay;
      component.lines = 9;
      fillRow(component.board, 19);
      (component as any).clearLines();
      expect((component as any).dropDelay).toBeLessThan(delayInicial);
    });

    it('não deve remover linha incompleta', () => {
      // Preenche linha 19 deixando uma célula vazia
      fillRow(component.board, 19);
      component.board[19][5] = null;

      (component as any).clearLines();

      expect(component.score).toBe(0);
      expect(component.lines).toBe(0);
      expect(component.board[19][5]).toBeNull(); // célula permanece vazia
    });
  });

  // ── Hold e rotação de peças ───────────────────────────────────────────────

  describe('Hold e rotação de peças', () => {

    it('deve salvar a peça atual no slot hold na primeira chamada', () => {
      const pecaAntes = component.current;
      (component as any).hold();
      expect(component.held).toBe(pecaAntes);
    });

    it('deve spawnar uma nova peça após o primeiro hold', () => {
      const pecaAntes = component.current;
      (component as any).hold();
      expect(component.current).not.toBe(pecaAntes);
    });

    it('deve trocar peça atual pela peça em hold na segunda chamada', () => {
      (component as any).hold();
      const pecaEmHold = component.held;
      component.canHold = true; // libera novo hold

      (component as any).hold();
      expect(component.current).toBe(pecaEmHold);
    });

    it('deve impedir hold duplo sem spawnar nova peça (canHold = false)', () => {
      (component as any).hold(); // primeiro hold — canHold vai a false
      const holdApos1 = component.held;

      (component as any).hold(); // segundo hold sem liberar — deve ignorar
      expect(component.held).toBe(holdApos1);
    });

    it('deve redefinir canHold = false após usar hold', () => {
      (component as any).hold();
      expect(component.canHold).toBeFalse();
    });

    it('deve rotacionar a peça alterando rotation', () => {
      component.current.x        = 4;
      component.current.y        = 0;
      const rotacaoInicial = component.current.rotation;

      (component as any).rotate();

      expect(component.current.rotation).not.toBe(rotacaoInicial);
    });

    it('deve completar ciclo de 4 rotações na peça T (type=2)', () => {
      // Peça T tem exatamente 4 rotações — após 4 giros deve voltar ao início
      component.current.type     = 2;
      component.current.x        = 4;
      component.current.y        = 5;
      component.current.rotation = 0;

      for (let i = 0; i < 4; i++) {
        (component as any).rotate();
      }

      expect(component.current.rotation % 4).toBe(0);
    });

    it('deve reiniciar canHold = true ao chamar restart()', () => {
      component.canHold = false;
      component.restart();
      expect(component.canHold).toBeTrue();
    });

    it('deve reiniciar estado do Modo Prisma ao chamar restart()', () => {
      component.prismaActive   = true;
      component.prismaProgress = 75;
      component.restart();

      expect(component.prismaActive).toBeFalse();
      expect(component.prismaProgress).toBe(0);
    });
  });
});
