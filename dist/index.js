"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.traerPorHttp = exports.kidDe = exports.esFalloDeToken = exports.VerificadorJwks = exports.SesionInvalida = void 0;
/**
 * LA PUERTA DEL PAQUETE.
 *
 * Todo lo que sale de aquí lo importa más de un servicio. Lo que se exporte «por si acaso» acaba
 * siendo API pública de cuatro repositorios sin que nadie lo haya decidido: se exporta lo que
 * alguien usa hoy, y se amplía cuando haga falta.
 */
var jwks_1 = require("./auth/jwks");
Object.defineProperty(exports, "SesionInvalida", { enumerable: true, get: function () { return jwks_1.SesionInvalida; } });
Object.defineProperty(exports, "VerificadorJwks", { enumerable: true, get: function () { return jwks_1.VerificadorJwks; } });
Object.defineProperty(exports, "esFalloDeToken", { enumerable: true, get: function () { return jwks_1.esFalloDeToken; } });
Object.defineProperty(exports, "kidDe", { enumerable: true, get: function () { return jwks_1.kidDe; } });
Object.defineProperty(exports, "traerPorHttp", { enumerable: true, get: function () { return jwks_1.traerPorHttp; } });
