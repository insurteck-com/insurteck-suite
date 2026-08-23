# `@insurteck/suite`

Lo que los productos de la suite Insurteck necesitan **igual**, y cuya divergencia sería un fallo.

Hoy: el verificador de la sesión de la suite (`VerificadorJwks`), que vivía copiado en dos
repositorios y habría sido cuatro.

## La regla de qué entra aquí

**Algo entra sólo si dos o más servicios lo necesitan IGUAL y una divergencia entre ellos sería un
fallo.**

No entran los tipos de dominio de un producto —una `Poliza` de Core y una del ERP **no son la misma
`Poliza`**, y compartir el tipo obligaría a los dos a desplegar a la vez, que es justo lo que
«desplegar por separado» significa no hacer—, ni los clientes HTTP, ni nada que dependa de NestJS:
esto lo consume también el frontend, que no compila contra el backend.

Un paquete compartido empieza con un verificador y acaba con la mitad del dominio dentro.

## Cómo se consume

Por el **tarball de la etiqueta**, nunca por rama:

```json
"@insurteck/suite": "https://github.com/insurteck-com/insurteck-suite/archive/refs/tags/v0.1.1.tar.gz"
```

**Y no como dependencia de git, aunque sea lo obvio.** Se probó con un `docker build` de verdad y
murió: `node:22-alpine` **no trae cliente de git**, y además npm normaliza la URL a `git+ssh://`,
donde no hay clave. La alternativa era `apk add git` más un `git config url…insteadOf` en el
Dockerfile de cada consumidor — dos líneas en cuatro repositorios, para siempre, que alguien
olvidará. El mecanismo que no pide nada a nadie gana.

Un tarball no ejecuta `prepare`, así que **`dist/` viaja commiteado**, y `dist-al-dia.spec.ts` se
pone rojo si se queda viejo: sin eso, alguien corrige el verificador, los tests pasan —corren sobre
`src/`— y los cuatro consumidores siguen con el binario anterior.

Por etiqueta y nunca por rama: con una rama, `npm install` en dos máquinas el mismo día trae
versiones distintas, y eso con la pieza que verifica las sesiones.

## Es público, y es una decisión

Así desaparece el token del `docker build`, del CI y de cada máquina. A cambio, `publico.spec.ts`
se pone rojo si alguien mete una clave, una cadena de conexión o un host interno. Lo que cubre y lo
que no está escrito en su cabecera.

## Diseño

`docs/superpowers/specs/2026-08-23-paquete-compartido-de-la-suite-design.md`, en el repositorio de
Core.
