/**
 * LA PUERTA DEL PAQUETE.
 *
 * Todo lo que sale de aquí lo importa más de un servicio. Lo que se exporte «por si acaso» acaba
 * siendo API pública de cuatro repositorios sin que nadie lo haya decidido: se exporta lo que
 * alguien usa hoy, y se amplía cuando haga falta.
 */
export { ConfiguracionJwks, SesionInvalida, SesionSuite, VerificadorJwks, esFalloDeToken, kidDe, traerPorHttp, } from './auth/jwks';
/**
 * El emisor y la audiencia de la suite. Los importan el FIRMANTE (Identity) y los cuatro
 * verificadores: es el dato que, si discrepa en una letra, produce 401 en todas partes sin que
 * ningún mensaje mencione la palabra emisor.
 */
export { AUDIENCIA, EMISOR_POR_DEFECTO, VAR_EMISOR, emisor, } from './auth/emisor';
