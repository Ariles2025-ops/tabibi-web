import { VISIO_ACTIVE } from '../lancement';
import { routes } from '../app.routes';
import { VisioBientotComponent } from './visio-bientot.component';

/** Garde : tant que la visio n'est pas ouverte, ses pages affichent « Bientôt » (aucune fausse promesse). */
describe('Téléconsultation « Bientôt »', () => {
  it('les pages téléconsultation patient et médecin mènent au message « Bientôt »', async () => {
    expect(VISIO_ACTIVE).toBeFalse();
    const patient = routes.find((r) => r.path === 'teleconsultations');
    const medecin = routes.find((r) => r.path === 'medecin')?.children?.find((r) => r.path === 'teleconsultations');
    expect(await (patient?.loadComponent as () => Promise<unknown>)()).toBe(VisioBientotComponent);
    expect(await (medecin?.loadComponent as () => Promise<unknown>)()).toBe(VisioBientotComponent);
  });
});
