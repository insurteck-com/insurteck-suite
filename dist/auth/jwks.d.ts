import { JwtPayload } from 'jsonwebtoken';
export interface ConfiguracionJwks {
    url: string;
    emisor: string;
    audiencia: string;
}
export interface SesionSuite extends JwtPayload {
    sub: string;
    organizacionId: string;
    versionSesion: number;
}
/**
 * LO QUE LANZA ESTE FICHERO CUANDO LA SESIÓN NO VALE.
 *
 * Un tipo propio y no un `Error` pelado: quien llama tiene que poder distinguir «esta sesión no
 * sirve» de «no se pudo hablar con Identity», y con `Error` a secas la única forma sería comparar
 * mensajes — que es lo primero que alguien reescribe. El gateway de eventos del CRM lo usa para
 * elegir entre cerrar con 4401 (ríndete) y 4503 (reintenta), y equivocarse ahí deja a todo el
 * mundo fuera por un hipo de la red, o a ciento cincuenta navegadores reintentando con un token
 * muerto para siempre.
 */
export declare class SesionInvalida extends Error {
}
export declare function esFalloDeToken(error: unknown): boolean;
type Traer = (url: string) => Promise<{
    keys: Record<string, string>[];
}>;
export declare function traerPorHttp(url: string): Promise<{
    keys: Record<string, string>[];
}>;
/**
 * VERIFICA UNA SESIÓN DE LA SUITE CONTRA EL JUEGO DE CLAVES DE IDENTITY.
 *
 * ── Tres decisiones, cada una por lo que cuesta equivocarse ──────────────────────────
 *
 *  1. **El algoritmo se DECLARA.** Sin `algorithms: ['RS256']`, `jsonwebtoken` acepta el que diga
 *     la cabecera del token. Como la clave pública ES pública, cualquiera puede firmar un HS256
 *     con ella y entrar. Es la confusión de algoritmo, y sólo se cierra declarándolo.
 *  2. **Una firma mala NO refresca el JWKS.** Si lo hiciera, mandar basura sería una petición a
 *     Identity por intento — un amplificador gratis. Sólo refresca un `kid` DESCONOCIDO, y como
 *     mucho una vez por minuto.
 *  3. **Sin claves no se entra.** La caché sirve mientras dure; si no hay nada, se rechaza. Un
 *     `?? {}` aquí abriría la puerta el día que Identity esté caído, que es justo el día peor.
 */
export declare class VerificadorJwks {
    private readonly cfg;
    private readonly traer;
    private readonly ahora;
    private claves;
    /**
     * EL FRENO CUENTA SÓLO LOS REFRESCOS PROVOCADOS POR UN `kid` DESCONOCIDO, no todas las traídas.
     *
     * Atado a cualquier traída, la primera carga —la que llena la caché vacía— armaba el freno, y
     * entonces **una rotación tardaba hasta un minuto en verse**: llega un token con la clave nueva,
     * el freno dice «acabas de preguntar» y se rechaza una sesión legítima. Lo destapó el test de la
     * rotación al ponerse rojo por el motivo contrario al que esperaba.
     *
     * Separarlos da las dos cosas: la rotación se recoge en cuanto llega el primer token nuevo, y
     * quien mande basura con kids inventados sigue provocando como mucho una petición por minuto.
     */
    private ultimoRefrescoPorKidDesconocido;
    constructor(cfg: ConfiguracionJwks, traer?: Traer, ahora?: () => number);
    verificar(token: string): Promise<SesionSuite>;
    private pemDe;
    private refrescar;
}
/** El `kid` de la cabecera, sin verificar nada. Sólo sirve para ELEGIR con qué verificar. */
export declare function kidDe(token: string): string | null;
export {};
