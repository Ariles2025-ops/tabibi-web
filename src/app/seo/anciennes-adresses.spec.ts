import { decouperSeo, redirectionIndex, redirectionSeo } from './anciennes-adresses';

describe('Anciennes adresses (redirections 301)', () => {
  it('decoupe wilaya-specialite', () => {
    expect(decouperSeo('tipaza-neurologue')).toEqual({ specialite: 'neurologue', wilaya: 'tipaza' });
    expect(decouperSeo('mostaganem-endocrinologue')).toEqual({ specialite: 'endocrinologue', wilaya: 'mostaganem' });
  });
  it('gere les tirets dans la wilaya et dans la specialite', () => {
    expect(decouperSeo('bordj-bou-arreridj-cardiologue')).toEqual({ specialite: 'cardiologue', wilaya: 'bordj-bou-arreridj' });
    expect(decouperSeo('ain-temouchent-gastro-enterologue')).toEqual({ specialite: 'gastro-enterologue', wilaya: 'ain-temouchent' });
    expect(decouperSeo('boumerdes-gastro-enterologue')).toEqual({ specialite: 'gastro-enterologue', wilaya: 'boumerdes' });
  });
  it('combinaison inconnue : specialite seule, sinon rien', () => {
    expect(decouperSeo('wilayainconnue-neurologue')).toEqual({ specialite: 'neurologue' });
    expect(decouperSeo('n-importe-quoi')).toEqual({});
  });
  it('redirectionSeo', () => {
    expect(redirectionSeo('/seo/tipaza-neurologue')).toBe('/specialites/neurologue/tipaza');
    expect(redirectionSeo('/ar/seo/tipaza-neurologue')).toBe('/ar/specialites/neurologue/tipaza');
    expect(redirectionSeo('/seo/xx-yy')).toBe('/');
    expect(redirectionSeo('/ar/seo/xx-yy')).toBe('/ar');
    expect(redirectionSeo('/autre')).toBeNull();
  });
  it('redirectionIndex', () => {
    expect(redirectionIndex('cardiologue', 'alger')).toBe('/specialites/cardiologue/alger');
    expect(redirectionIndex('cardiologue', 'zzz')).toBe('/specialites/cardiologue');
    expect(redirectionIndex(undefined, undefined)).toBe('/');
  });
});
