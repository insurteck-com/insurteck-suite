import { generateKeyPairSync } from 'node:crypto';
import { sign } from 'jsonwebtoken';
import { SesionInvalida, VerificadorJwks } from './jwks';

// ¡OJO! ESTE SPEC ESTÁ COPIADO EN CADA PRODUCTO DE LA SUITE, igual que `jwks.ts`. Es lo que ata
// las copias: si una diverge, el spec de ese repositorio se pone rojo. Ver la cabecera de `jwks.ts`.

const AUDIENCIA = 'insurteck-suite';
const EMISOR = 'https://identity.app.insurteck.com';

function par(kid: string) {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const jwk = publicKey.export({ format: 'jwk' }) as Record<string, string>;
  return {
    privada: privateKey,
    jwk: { kty: jwk.kty, n: jwk.n, e: jwk.e, use: 'sig', alg: 'RS256', kid },
    token: () =>
      sign({ organizacionId: 'org_1', versionSesion: 1 }, privateKey, {
        algorithm: 'RS256',
        keyid: kid,
        subject: 'idt_1',
        issuer: EMISOR,
        audience: AUDIENCIA,
        expiresIn: 3600,
      }),
  };
}

function verificador(traer: jest.Mock, ahora: () => number = () => 1_000_000) {
  return new VerificadorJwks(
    { url: 'https://identity/api/v1/.well-known/jwks.json', emisor: EMISOR, audiencia: AUDIENCIA },
    traer,
    ahora,
  );
}

describe('VerificadorJwks', () => {
  it('verifica un token firmado por la clave que publica el JWKS', async () => {
    const a = par('k1');
    const traer = jest.fn().mockResolvedValue({ keys: [a.jwk] });
    const carga = await verificador(traer).verificar(a.token());
    expect(carga.sub).toBe('idt_1');
    expect(carga.organizacionId).toBe('org_1');
  });

  it('trae el JWKS UNA vez y reutiliza la caché', async () => {
    const a = par('k1');
    const traer = jest.fn().mockResolvedValue({ keys: [a.jwk] });
    const v = verificador(traer);
    await v.verificar(a.token());
    await v.verificar(a.token());
    await v.verificar(a.token());
    expect(traer).toHaveBeenCalledTimes(1);
  });

  it('NO vuelve a traer el JWKS cuando la firma es mala: sería un amplificador', async () => {
    // Quien mande basura con un kid CONOCIDO provocaría una petición a Identity por intento.
    const a = par('k1');
    const b = par('k1'); // mismo kid, otra clave: firma que no cuadra
    const traer = jest.fn().mockResolvedValue({ keys: [a.jwk] });
    const v = verificador(traer);
    await v.verificar(a.token());
    await expect(v.verificar(b.token())).rejects.toThrow();
    await expect(v.verificar(b.token())).rejects.toThrow();
    expect(traer).toHaveBeenCalledTimes(1);
  });

  it('SÍ vuelve a traer cuando el kid es desconocido: es como se ve una rotación', async () => {
    const vieja = par('k1');
    const nueva = par('k2');
    const traer = jest
      .fn()
      .mockResolvedValueOnce({ keys: [vieja.jwk] })
      .mockResolvedValueOnce({ keys: [vieja.jwk, nueva.jwk] });
    const v = verificador(traer);
    await v.verificar(vieja.token());
    const carga = await v.verificar(nueva.token());
    expect(carga.sub).toBe('idt_1');
    expect(traer).toHaveBeenCalledTimes(2);
  });

  it('no refresca más de una vez por minuto aunque el kid siga sin aparecer', async () => {
    const vieja = par('k1');
    const fantasma = par('k9');
    const traer = jest.fn().mockResolvedValue({ keys: [vieja.jwk] });
    let reloj = 1_000_000;
    const v = verificador(traer, () => reloj);
    await v.verificar(vieja.token());
    await expect(v.verificar(fantasma.token())).rejects.toThrow(/kid/i);
    await expect(v.verificar(fantasma.token())).rejects.toThrow(/kid/i);
    expect(traer).toHaveBeenCalledTimes(2); // la inicial + UN refresco

    reloj += 61_000;
    await expect(v.verificar(fantasma.token())).rejects.toThrow(/kid/i);
    expect(traer).toHaveBeenCalledTimes(3);
  });

  it('RECHAZA HS256 firmado con la clave pública (confusión de algoritmo)', async () => {
    const a = par('k1');
    const traer = jest.fn().mockResolvedValue({ keys: [a.jwk] });
    // La clave pública es pública: quien la lea del JWKS puede firmar HS256 con ella.
    const falso = sign({ organizacionId: 'org_1', versionSesion: 1 }, JSON.stringify(a.jwk), {
      algorithm: 'HS256',
      keyid: 'k1',
      subject: 'intruso',
      issuer: EMISOR,
      audience: AUDIENCIA,
      expiresIn: 3600,
    });
    await expect(verificador(traer).verificar(falso)).rejects.toThrow();
  });

  it('RECHAZA un token de otro emisor y de otra audiencia', async () => {
    const a = par('k1');
    const traer = jest.fn().mockResolvedValue({ keys: [a.jwk] });
    const otroEmisor = sign({}, a.privada, {
      algorithm: 'RS256',
      keyid: 'k1',
      subject: 'x',
      issuer: 'https://malo',
      audience: AUDIENCIA,
      expiresIn: 3600,
    });
    const otraAudiencia = sign({}, a.privada, {
      algorithm: 'RS256',
      keyid: 'k1',
      subject: 'x',
      issuer: EMISOR,
      audience: 'otra-cosa',
      expiresIn: 3600,
    });
    await expect(verificador(traer).verificar(otroEmisor)).rejects.toThrow();
    await expect(verificador(traer).verificar(otraAudiencia)).rejects.toThrow();
  });

  it('RECHAZA un token caducado', async () => {
    const a = par('k1');
    const traer = jest.fn().mockResolvedValue({ keys: [a.jwk] });
    const viejo = sign({}, a.privada, {
      algorithm: 'RS256',
      keyid: 'k1',
      subject: 'x',
      issuer: EMISOR,
      audience: AUDIENCIA,
      expiresIn: -10,
    });
    await expect(verificador(traer).verificar(viejo)).rejects.toThrow();
  });

  it('sin JWKS y sin caché NO deja pasar a nadie', async () => {
    // Ante la duda, no se entra. Un `?? {}` aquí abriría la puerta el día que Identity esté caído.
    const a = par('k1');
    const traer = jest.fn().mockRejectedValue(new Error('ECONNREFUSED'));
    await expect(verificador(traer).verificar(a.token())).rejects.toThrow(/no se pudo/i);
  });

  it('con Identity caído SIGUE valiendo lo que hay en caché', async () => {
    // Es lo contrario del caso anterior y por eso se prueba: un JWKS inalcanzable no puede echar
    // de la aplicación a todo el mundo que ya tenía sesión.
    const a = par('k1');
    const traer = jest
      .fn()
      .mockResolvedValueOnce({ keys: [a.jwk] })
      .mockRejectedValue(new Error('ECONNREFUSED'));
    const v = verificador(traer);
    await v.verificar(a.token());
    await expect(v.verificar(a.token())).resolves.toMatchObject({ sub: 'idt_1' });
  });

  it('lo que lanza por sesión mala es SesionInvalida; lo de red, NO', async () => {
    // El gateway de eventos del CRM elige entre 4401 (ríndete) y 4503 (reintenta) con esta
    // distinción. Sin ella tendría que comparar mensajes, que es lo primero que alguien reescribe.
    const a = par('k1');
    const b = par('k1');
    const traer = jest.fn().mockResolvedValue({ keys: [a.jwk] });
    await expect(verificador(traer).verificar(b.token())).rejects.toBeInstanceOf(SesionInvalida);

    const caido = jest.fn().mockRejectedValue(new Error('ECONNREFUSED'));
    await expect(verificador(caido).verificar(a.token())).rejects.not.toBeInstanceOf(
      SesionInvalida,
    );
  });

  it('un token sin kid se rechaza sin salir a la red', async () => {
    const a = par('k1');
    const traer = jest.fn().mockResolvedValue({ keys: [a.jwk] });
    const sinKid = sign({}, a.privada, {
      algorithm: 'RS256',
      subject: 'x',
      issuer: EMISOR,
      audience: AUDIENCIA,
      expiresIn: 3600,
    });
    await expect(verificador(traer).verificar(sinKid)).rejects.toThrow(/kid/i);
    expect(traer).not.toHaveBeenCalled();
  });

  it('una clave ilegible del juego no tira las buenas', async () => {
    // Publicar una clave mala no puede dejar sin verificar a las demás: el JWKS lo sirve otro
    // servicio, y un fallo suyo no debe convertirse en un corte de sesión aquí.
    const a = par('k1');
    const traer = jest.fn().mockResolvedValue({
      keys: [{ kty: 'RSA', kid: 'rota', n: 'no-es-base64url', e: 'AQAB' }, a.jwk],
    });
    await expect(verificador(traer).verificar(a.token())).resolves.toMatchObject({ sub: 'idt_1' });
  });
});
