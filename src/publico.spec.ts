import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * ESTE REPOSITORIO ES PÚBLICO, Y ESO NO SE SOSTIENE CON UNA PROMESA.
 *
 * Es público a propósito: así desaparece el token del `docker build`, del CI y de cada máquina —
 * una credencial menos que rotar, en el sitio donde más cuesta. Lo que hay dentro tampoco pide otra
 * cosa: un verificador de firmas y una clave pública son públicos por definición.
 *
 * Pero «no metas secretos aquí» es una promesa, y las promesas de este tipo duran hasta el primer
 * «un momento nada más». Esto se pone rojo antes.
 *
 * ── Lo que NO cubre, dicho y no escondido ────────────────────────────────────────────
 *
 * Mira patrones conocidos: claves privadas, cadenas de conexión, credenciales de AWS, tokens de
 * GitHub y hosts internos. Un secreto con una forma nueva pasa. No es un sustituto de mirar el
 * diff antes de publicar — es la red para cuando nadie lo mira.
 */
const FUENTE = join(__dirname);

const PROHIBIDO: Array<{ que: string; patron: RegExp }> = [
  { que: 'una clave privada', patron: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { que: 'una cadena de conexión a Postgres', patron: /postgres(?:ql)?:\/\/[^\s'"`]+/ },
  { que: 'una cadena de conexión a Redis', patron: /redis:\/\/[^\s'"`]+/ },
  { que: 'una credencial de AWS', patron: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/ },
  { que: 'un token de GitHub', patron: /\bgh[pousr]_[A-Za-z0-9]{20,}/ },
  // Los hosts internos no son secretos, pero dicen la topología: qué servicios hay, cómo se
  // llaman y dónde viven. Eso es media hora de trabajo regalada a quien esté mirando.
  { que: 'un host interno', patron: /\b[\w.-]+\.(?:internal|local|amazonaws\.com)\b/ },
  { que: 'una asignación de secreto con valor', patron: /\b(SECRET|PASSWORD|CREDENCIAL|TOKEN)\s*=\s*['"][^'"]{8,}['"]/i },
];

function fuentes(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? fuentes(join(dir, e.name)) : e.name.endsWith('.ts') ? [join(dir, e.name)] : [],
  );
}

describe('nada secreto viaja en un repositorio público', () => {
  const ficheros = fuentes(FUENTE);

  it('el barrido MIRA algo: si dejara de encontrar ficheros, diría lo mismo en verde', () => {
    // La canaria. Cero ficheros y cero hallazgos se leen igual, y sólo uno de los dos significa
    // que esto está funcionando.
    expect(ficheros.length).toBeGreaterThan(1);
  });

  it.each(PROHIBIDO)('no hay $que', ({ patron }) => {
    const hallazgos: string[] = [];
    for (const f of ficheros) {
      // El propio barrido contiene los patrones: se salta a sí mismo, o se acusaría siempre.
      if (f === join(FUENTE, 'publico.spec.ts')) continue;
      readFileSync(f, 'utf8')
        .split('\n')
        .forEach((linea, i) => {
          if (patron.test(linea)) hallazgos.push(`${f}:${i + 1}`);
        });
    }
    expect(hallazgos).toEqual([]);
  });
});
