import { estStatutOrdonnance, infoAnnulationOrdonnance, libelleStatutOrdonnance } from './statut-ordonnance';

describe('libelleStatutOrdonnance', () => {
  it('traduit les statuts connus, sans tenir compte de la casse ni des espaces', () => {
    expect(libelleStatutOrdonnance('EMISE')).toBe('Émise');
    expect(libelleStatutOrdonnance(' delivree ')).toBe('Délivrée');
    expect(libelleStatutOrdonnance('annulee')).toBe('Annulée');
  });

  it('rend rien pour un statut absent', () => {
    expect(libelleStatutOrdonnance(null)).toBe('');
  });
});

describe('estStatutOrdonnance', () => {
  it('compare sans tenir compte de la casse ni des espaces', () => {
    expect(estStatutOrdonnance('annulee', 'ANNULEE')).toBeTrue();
    expect(estStatutOrdonnance(' Emise ', 'EMISE')).toBeTrue();
    expect(estStatutOrdonnance('EMISE', 'ANNULEE')).toBeFalse();
    expect(estStatutOrdonnance(null, 'EMISE')).toBeFalse();
  });
});

describe('infoAnnulationOrdonnance', () => {
  it('ajoute le motif nettoyé, comme infoStatutOrdonnance de l\'appli', () => {
    expect(infoAnnulationOrdonnance(' Erreur de dosage ', false)).toBe('Annulée par le médecin : Erreur de dosage');
    expect(infoAnnulationOrdonnance('خطأ في الجرعة', true)).toBe('ألغاها الطبيب: خطأ في الجرعة');
  });

  it('n\'affiche pas de « : » orphelin pour un motif absent ou blanc', () => {
    expect(infoAnnulationOrdonnance(null, false)).toBe('Annulée par le médecin');
    expect(infoAnnulationOrdonnance('   ', false)).toBe('Annulée par le médecin');
    expect(infoAnnulationOrdonnance('  ', true)).toBe('ألغاها الطبيب');
  });
});
