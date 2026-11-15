import { VISIO_ACTIVE } from '../lancement';
import { routes } from '../app.routes';
import { VisioBientotComponent } from './visio-bientot.component';

/** Garde : tant que la visio n'est pas ouverte, ses pages affichent « Bientôt » (aucune fausse promesse). */
describe('Téléconsultation « Bientôt »', () => {
  it('les pages téléconsultation patient et médecin mènent au message « Bientôt »', () => {
    expect(VISIO_ACTIVE).toBeFalse();
    const patient = routes.find((r) => r.path === 'teleconsultations');
    const medecin = routes.find((r) => r.path === 'medecin')?.children?.find((r) => r.path === 'teleconsultations');
    expect(patient?.component).toBe(VisioBientotComponent);
    expect(medecin?.component).toBe(VisioBientotComponent);
  });
});
