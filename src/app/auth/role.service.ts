import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Moi, MoiService } from '../moi/moi.service';
import { AuthService } from './auth.service';

/**
 * Profil et roles de l'utilisateur connecte, lus une seule fois sur GET /api/moi
 * apres l'initialisation OIDC et gardes en cache pour toute la session de la page.
 */
@Injectable({ providedIn: 'root' })
export class RoleService {
  private auth = inject(AuthService);
  private moiService = inject(MoiService);
  private profil = signal<Moi | null>(null);
  private chargement: Promise<Moi | null> | null = null;

  /** Profil renvoye par /api/moi ; null tant qu'il n'est pas charge ou si l'utilisateur n'est pas connecte. */
  moi = this.profil.asReadonly();
  /** Roles de l'utilisateur (ex. PATIENT, MEDECIN, ADMIN) ; vide si non connecte. */
  roles = computed(() => this.moi()?.roles ?? []);
  estMedecin = computed(() => this.roles().includes('MEDECIN'));

  /**
   * Charge le profil une seule fois (les appels suivants renvoient la meme promesse).
   * Resout null si l'utilisateur n'est pas connecte ou si l'appel echoue (un nouvel appel reessaiera).
   */
  charger(): Promise<Moi | null> {
    if (!this.chargement) {
      this.chargement = this.auth.pret().then(() => this.lireProfil());
    }
    return this.chargement;
  }

  private async lireProfil(): Promise<Moi | null> {
    if (!this.auth.estConnecte()) return null;
    try {
      const moi = await firstValueFrom(this.moiService.moi());
      this.profil.set(moi);
      return moi;
    } catch (e) {
      console.error('Chargement du profil (/api/moi) impossible', e);
      this.chargement = null;
      return null;
    }
  }
}
