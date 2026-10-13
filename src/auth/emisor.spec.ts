import { AUDIENCIA, EMISOR_POR_DEFECTO, VAR_EMISOR, emisor } from './emisor';

/**
 * Se le pasa un entorno FALSO en vez de tocar `process.env`.
 *
 * Jest corre las suites en paralelo dentro del mismo proceso por fichero, pero mutar `process.env`
 * y restaurarlo en un `afterEach` deja una ventana en la que otro test del mismo fichero ve el
 * valor ajeno si algo falla a medias. Con un parámetro no hay ventana ni restauración que olvidar.
 */
describe('el emisor de la suite', () => {
  it('sale de SUITE_JWT_EMISOR cuando está puesta', () => {
    expect(emisor({ [VAR_EMISOR]: 'https://identidad.corredora-cliente.cl' })).toBe(
      'https://identidad.corredora-cliente.cl',
    );
  });

  it('cae al de siempre cuando falta, para no romper lo ya desplegado', () => {
    expect(emisor({})).toBe(EMISOR_POR_DEFECTO);
  });

  // El caso del `.env` a medio rellenar. Firmar con emisor vacío produce tokens que no acepta
  // nadie, y el 401 resultante no menciona la palabra emisor por ninguna parte.
  it('una cadena vacía o de espacios cuenta como ausente', () => {
    expect(emisor({ [VAR_EMISOR]: '' })).toBe(EMISOR_POR_DEFECTO);
    expect(emisor({ [VAR_EMISOR]: '   ' })).toBe(EMISOR_POR_DEFECTO);
  });

  it('recorta los espacios de los bordes', () => {
    expect(emisor({ [VAR_EMISOR]: '  https://x.cl  ' })).toBe('https://x.cl');
  });

  // La audiencia NO se configura, y esto lo fija: identifica a la suite como destinataria, no al
  // despliegue. Un cliente con su propio Identity sigue emitiendo para los mismos productos.
  it('la audiencia es constante', () => {
    expect(AUDIENCIA).toBe('insurteck-suite');
  });

  // Cambiar este valor invalida TODAS las sesiones en circulación: los verificadores que aún
  // esperen el anterior rechazan con 401. Si algún día se cambia, que sea a sabiendas.
  it('el valor por defecto es el que ya está en circulación', () => {
    expect(EMISOR_POR_DEFECTO).toBe('https://identity.app.insurteck.com');
  });
});
