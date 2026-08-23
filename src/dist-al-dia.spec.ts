import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * `dist/` VIAJA EN EL REPOSITORIO, Y ESO NECESITA UN TRINQUETE.
 *
 * ── Por qué está commiteado, que es lo primero que chirría ───────────────────────────
 *
 * Los consumidores no traen este paquete por `git`, sino por el **tarball de la etiqueta**:
 *
 *   https://github.com/insurteck-com/insurteck-suite/archive/refs/tags/vX.Y.Z.tar.gz
 *
 * Y eso es a propósito. Con una dependencia de git, `npm ci` necesita un cliente de git dentro de
 * la imagen —`node:22-alpine` NO LO TRAE— y además npm normaliza la URL a `git+ssh://`, donde no
 * hay clave. Se comprobó con un `docker build` de verdad: murió con `npm error syscall spawn git`.
 *
 * La alternativa era `apk add git` más un `git config url…insteadOf` en el Dockerfile de CADA
 * consumidor. Son dos líneas en cuatro repositorios, para siempre, que alguien olvidará — y el
 * fallo aparece al construir la imagen, lejos de aquí. **El mecanismo que no pide nada a nadie
 * gana.**
 *
 * Un tarball no ejecuta `prepare`, así que el compilado tiene que venir dentro. De ahí esto.
 *
 * ── Lo que este trinquete impide ─────────────────────────────────────────────────────
 *
 * Que `dist/` se quede viejo. Sin él, alguien corrige el verificador en `src/`, los tests de aquí
 * pasan —corren sobre `src/`— y **los cuatro consumidores siguen usando el binario anterior**. Un
 * arreglo de seguridad que se despliega y no cambia nada, en la pieza que decide quién entra.
 */
const RAIZ = join(__dirname, '..');

function ficherosDe(dir: string): Record<string, string> {
  const salida: Record<string, string> = {};
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const ruta = join(dir, e.name);
    if (e.isDirectory()) Object.assign(salida, ficherosDe(ruta));
    else salida[ruta.slice(RAIZ.length)] = readFileSync(ruta, 'utf8');
  }
  return salida;
}

describe('el compilado que se publica está al día', () => {
  it('`dist/` es exactamente lo que sale de compilar `src/`', () => {
    const antes = ficherosDe(join(RAIZ, 'dist'));
    execFileSync('npx', ['tsc', '-p', 'tsconfig.build.json'], { cwd: RAIZ, shell: true });
    const despues = ficherosDe(join(RAIZ, 'dist'));

    // Se compara el CONTENIDO y no una marca de tiempo: `tsc` reescribe ficheros idénticos, y un
    // trinquete que mirara fechas se pondría rojo siempre y acabaría desactivado.
    expect(despues).toEqual(antes);
  });
});
