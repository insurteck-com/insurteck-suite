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

Dependencia de git **fijada por etiqueta**, nunca por rama:

```json
"@insurteck/suite": "github:insurteck-com/insurteck-suite#v0.1.0"
```

Con una rama, `npm install` en dos máquinas el mismo día trae dos versiones distintas — y eso con
la pieza que verifica las sesiones.

`npm` ejecuta el script `prepare` al instalar una dependencia de git, así que aquí se compila solo:
no hace falta publicar `dist/`.

## Es público, y es una decisión

Así desaparece el token del `docker build`, del CI y de cada máquina. A cambio, `publico.spec.ts`
se pone rojo si alguien mete una clave, una cadena de conexión o un host interno. Lo que cubre y lo
que no está escrito en su cabecera.

## Diseño

`docs/superpowers/specs/2026-08-23-paquete-compartido-de-la-suite-design.md`, en el repositorio de
Core.
