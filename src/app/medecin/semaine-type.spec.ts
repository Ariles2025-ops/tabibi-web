import { messageSemaineType } from './semaine-type';

describe('messageSemaineType', () => {
  it('explique la raison des créneaux ignorés (FR)', () => {
    expect(messageSemaineType({ crees: 8, ignores: 12 }, false))
      .toBe('8 créneaux créés ; 12 ignorés (horaire déjà passé ou créneau déjà ouvert à ce moment).');
  });
  it("n'ajoute pas de raison quand rien n'est ignoré", () => {
    expect(messageSemaineType({ crees: 1, ignores: 0 }, false)).toBe('1 créneau créé.');
  });
  it('accorde correctement en arabe (singulier, duel, pluriel)', () => {
    expect(messageSemaineType({ crees: 1, ignores: 0 }, true)).toBe('تم إنشاء موعد واحد.');
    expect(messageSemaineType({ crees: 2, ignores: 0 }, true)).toBe('تم إنشاء موعدين.');
    expect(messageSemaineType({ crees: 5, ignores: 0 }, true)).toBe('تم إنشاء 5 مواعيد.');
    expect(messageSemaineType({ crees: 12, ignores: 0 }, true)).toBe('تم إنشاء 12 موعدًا.');
    expect(messageSemaineType({ crees: 0, ignores: 0 }, true)).toBe('لم يُنشأ أي موعد.');
    expect(messageSemaineType({ crees: 3, ignores: 1 }, true)).toContain('وتم تجاهل موعد واحد (');
  });
});
