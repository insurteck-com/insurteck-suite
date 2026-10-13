/**
 * QUIÉN FIRMA LAS SESIONES DE LA SUITE, Y PARA QUIÉN.
 *
 * ── Por qué esto vive aquí y no en cada repositorio ──────────────────────────────────
 *
 * Es UN dato que tienen que saber cinco servicios: Identity lo pone dentro de cada token, y
 * Core, el CRM, el escritorio y el ERP lo exigen al verificarlo. Si el firmante y un verificador
 * discrepan en una letra, ese verificador rechaza TODO con 401 — y ningún mensaje menciona la
 * palabra emisor. Es el fallo más caro de diagnosticar de los que puede producir un literal.
 *
 * Hasta el 20/9/2026 había CUATRO copias del mismo valor, con TRES comportamientos distintos:
 *
 *   · `insurteck-identity/src/llave-suite.ts`      constante horneada, ni siquiera configurable
 *   · `insurteck-escritorio/src/app.module.ts`     `?? 'https://identity.app.insurteck.com'`
 *   · `Insurteck-crm/src/auth/sesion.module.ts`    `?? 'https://identity.app.insurteck.com'`
 *   · `Insurteck-core/.../sesion-suite.guard.ts`   sin respaldo
 *
 * Cuatro repositorios y tres criterios es exactamente «un fichero compartido a medias»: copiado y
 * luego tocado sólo en uno. Este paquete existe justamente para los datos de esta clase.
 *
 * ── Por qué aquí SÍ hay valor por defecto ───────────────────────────────────────────
 *
 * La norma de estos repositorios es quitarlos —`IDENTITY_LLAVE_SUITE` no tiene, y con razón—.
 * La diferencia está en cuál es el riesgo de cada cosa:
 *
 *   · Sin llave de firma no se puede firmar. Un valor por defecto sería *inventar* una, y eso
 *     mata todas las sesiones en cada arranque. Fallar es lo único correcto.
 *   · Sin emisor sí hay una respuesta correcta conocida: **el que ya está en circulación**.
 *     Fallar aquí rompería todos los despliegues existentes para protegerlos de un problema que
 *     sólo tienen los que aún no existen.
 *
 * El día que todos declaren la variable, `EMISOR_POR_DEFECTO` se borra y `emisor()` pasa a lanzar.
 * Es la fase de contraer, y queda escrita para que no se quede para siempre por inercia.
 */
/** La variable que lo configura. El MISMO nombre en el firmante y en los verificadores. */
export declare const VAR_EMISOR = "SUITE_JWT_EMISOR";
/**
 * El emisor con el que nació la suite.
 *
 * Es una IDENTIDAD, no una dirección: nadie hace una petición a esta URL. Que se parezca a un
 * hostname es la convención de los JWT, y por eso puede no coincidir con el sitio donde Identity
 * escucha de verdad. Cambiarlo invalida todas las sesiones en circulación.
 */
export declare const EMISOR_POR_DEFECTO = "https://identity.app.insurteck.com";
/**
 * Para quién es el token. NO se configura: identifica a la suite como destinataria, no al
 * despliegue. Un cliente con su propio Identity sigue emitiendo para `insurteck-suite`, porque
 * quien consume el token siguen siendo estos productos.
 */
export declare const AUDIENCIA = "insurteck-suite";
/**
 * El emisor efectivo.
 *
 * Se lee en cada llamada y no una vez al cargar: cualquier cadena es válida, así que no hay nada
 * que validar al arrancar, y leerlo aquí hace que un test pueda cambiarlo sin recargar el módulo.
 *
 * Una cadena vacía cuenta como ausente. Es el caso de un `.env` a medio rellenar —`SUITE_JWT_EMISOR=`
 * sin valor— y firmar con emisor vacío produce tokens que no acepta nadie.
 */
export declare function emisor(entorno?: NodeJS.ProcessEnv): string;
