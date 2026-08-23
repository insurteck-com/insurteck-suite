/**
 * LA PUERTA DEL PAQUETE.
 *
 * Todo lo que sale de aquí lo importa más de un servicio. Lo que se exporte «por si acaso» acaba
 * siendo API pública de cuatro repositorios sin que nadie lo haya decidido: se exporta lo que
 * alguien usa hoy, y se amplía cuando haga falta.
 */
export { ConfiguracionJwks, SesionInvalida, SesionSuite, VerificadorJwks, esFalloDeToken, kidDe, traerPorHttp, } from './auth/jwks';
