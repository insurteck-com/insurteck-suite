"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VerificadorJwks = exports.SesionInvalida = void 0;
exports.esFalloDeToken = esFalloDeToken;
exports.traerPorHttp = traerPorHttp;
exports.kidDe = kidDe;
// ESTE FICHERO ESTABA COPIADO EN CADA PRODUCTO, Y POR ESO EXISTE ESTE PAQUETE.
//
// Vivía idéntico en `insurteck-escritorio/src/auth/jwks.ts` y en `Insurteck-crm/src/auth/jwks.ts`,
// con su spec al lado en los dos, y habrían sido cuatro copias cuando Core y el ERP mudaran: el
// fichero que decide quién entra en la suite, duplicado cuatro veces. La regla era «al tocar aquí,
// tocar en todos», sostenida por un spec idéntico en cada repositorio — que es lo mejor que se
// puede hacer sin un paquete, y peor que declararlo una vez.
//
// Ahora se declara una vez. Lo que hay que sostener a cambio es la disciplina del §1 del diseño:
// aquí entra algo **sólo si dos o más servicios lo necesitan IGUAL y una divergencia sería un
// fallo**. Un paquete compartido empieza con un verificador y acaba con la mitad del dominio
// dentro, y entonces desplegar por separado deja de ser posible sin que nadie lo haya decidido.
const node_crypto_1 = require("node:crypto");
const jsonwebtoken_1 = require("jsonwebtoken");
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
class SesionInvalida extends Error {
}
exports.SesionInvalida = SesionInvalida;
function esFalloDeToken(error) {
    return error instanceof SesionInvalida;
}
/** Cuánto se espera antes de volver a preguntar por un `kid` que no aparece. */
const ESPERA_ENTRE_REFRESCOS_MS = 60_000;
/** Lo que tarda en rendirse al traer el juego. Sin esto, un Identity colgado cuelga esto también. */
const TIEMPO_LIMITE_MS = 5_000;
async function traerPorHttp(url) {
    const control = new AbortController();
    const temporizador = setTimeout(() => control.abort(), TIEMPO_LIMITE_MS);
    try {
        const res = await fetch(url, { signal: control.signal });
        if (!res.ok)
            throw new Error(`el JWKS contestó ${res.status}`);
        return (await res.json());
    }
    finally {
        clearTimeout(temporizador);
    }
}
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
class VerificadorJwks {
    cfg;
    traer;
    ahora;
    claves = new Map();
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
    ultimoRefrescoPorKidDesconocido = 0;
    constructor(cfg, traer = traerPorHttp, ahora = Date.now) {
        this.cfg = cfg;
        this.traer = traer;
        this.ahora = ahora;
    }
    async verificar(token) {
        const kid = kidDe(token);
        if (kid === null) {
            // Sin salir a la red: un token sin `kid` no puede casar con ninguna clave, y preguntar sería
            // regalar una petición por cada cadena malformada que llegue.
            throw new SesionInvalida('El token no declara kid: no se puede saber con qué clave verificarlo.');
        }
        let pem = await this.pemDe(kid);
        if (pem === null) {
            // Kid desconocido: PUEDE ser una rotación. Se refresca, con freno.
            if (this.ahora() - this.ultimoRefrescoPorKidDesconocido >= ESPERA_ENTRE_REFRESCOS_MS) {
                this.ultimoRefrescoPorKidDesconocido = this.ahora();
                await this.refrescar();
                pem = this.claves.get(kid) ?? null;
            }
            if (pem === null)
                throw new SesionInvalida(`El kid "${kid}" no está en el juego de claves.`);
        }
        // `verify` comprueba firma, emisor, audiencia y caducidad en la misma llamada, y lanza en
        // todos los casos. NO se refresca el JWKS si esto falla: ver la decisión 2.
        //
        // Lo que lanza se TRADUCE a SesionInvalida: los tipos de `jsonwebtoken` son detalle de esta
        // librería, y dejarlos salir haría que quien llama tuviera que conocerla para distinguir un
        // fallo de sesión de uno de infraestructura.
        try {
            return (0, jsonwebtoken_1.verify)(token, pem, {
                algorithms: ['RS256'],
                issuer: this.cfg.emisor,
                audience: this.cfg.audiencia,
            });
        }
        catch (e) {
            throw new SesionInvalida(e instanceof Error ? e.message : String(e));
        }
    }
    async pemDe(kid) {
        if (this.claves.size === 0)
            await this.refrescar();
        return this.claves.get(kid) ?? null;
    }
    async refrescar() {
        let juego;
        try {
            juego = await this.traer(this.cfg.url);
        }
        catch (e) {
            // Con algo en caché se sigue: un Identity caído no puede echar de la aplicación a quien ya
            // tenía sesión. Sin nada en caché, no se entra.
            if (this.claves.size > 0)
                return;
            throw new Error(`No se pudo traer el juego de claves de ${this.cfg.url}: ` +
                `${e instanceof Error ? e.message : String(e)}`);
        }
        const nuevas = new Map();
        for (const jwk of juego?.keys ?? []) {
            if (jwk?.kty !== 'RSA' || !jwk?.kid)
                continue;
            try {
                nuevas.set(jwk.kid, (0, node_crypto_1.createPublicKey)({ key: jwk, format: 'jwk' })
                    .export({ type: 'spki', format: 'pem' })
                    .toString());
            }
            catch {
                // Una clave ilegible del juego no tira las demás: publicar una mala no puede dejar sin
                // verificar a las buenas.
            }
        }
        // Se sustituye el mapa entero y no se fusiona: una clave retirada del JWKS tiene que dejar de
        // valer aquí. Fusionar convertiría una revocación en un no-op silencioso.
        if (nuevas.size > 0)
            this.claves = nuevas;
    }
}
exports.VerificadorJwks = VerificadorJwks;
/** El `kid` de la cabecera, sin verificar nada. Sólo sirve para ELEGIR con qué verificar. */
function kidDe(token) {
    const partes = String(token ?? '').split('.');
    if (partes.length !== 3)
        return null;
    try {
        const cabecera = JSON.parse(Buffer.from(partes[0], 'base64url').toString('utf8'));
        const kid = cabecera?.kid;
        return typeof kid === 'string' && kid !== '' ? kid : null;
    }
    catch {
        return null;
    }
}
