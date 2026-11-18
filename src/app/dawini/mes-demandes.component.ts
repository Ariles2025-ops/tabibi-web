import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, of } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { ProfilService } from '../moi/profil.service';
import { wilayaParCode } from '../seo/referentiel-seo';
import { LangueService } from '../partage/langue.service';
import { SelecteurLangueComponent } from '../partage/selecteur-langue.component';
import { Besoin, DawiniService, DemandeBesoin, libelleReponses, libelleStatutBesoin, libelleWilaya } from './dawini.service';

/** Champs du formulaire de publication, vides. */
function formulaireVide(wilayaCode = ''): Required<DemandeBesoin> {
  return { medicament: '', wilayaCode, commune: '', precision: '' };
}

/** Une wilaya du referentiel (assets/referentiel.json) : code officiel attendu par l'API + libelle FR. */
interface OptionWilaya { code: string; nom: string; }

/**
 * Dawini, cote patient : publication d'un besoin de medicament (POST /api/dawini/besoins) puis « Mes demandes »
 * (GET /api/dawini/besoins/mes), les plus recentes d'abord, avec le statut et le nombre de reponses ; chaque
 * demande mene a ses reponses. Les pharmacies de la wilaya voient le besoin sans l'identite du patient.
 */
@Component({
    selector: 'app-mes-demandes',
    imports: [CommonModule, FormsModule, RouterLink, SelecteurLangueComponent],
    template: `
    <main style="max-width:720px;margin:32px auto;padding:0 16px" [attr.dir]="l.ar() ? 'rtl' : null" [attr.lang]="l.ar() ? 'ar' : null">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin:0 0 8px">
        <h1 style="color:var(--vert);margin:0">{{ l.t('Dawini', 'داويني') }}</h1>
        <app-selecteur-langue />
      </div>
      <p style="color:var(--text3);margin:0 0 20px">
        {{ l.t('Vous cherchez un médicament ? Publiez votre demande : les pharmacies de votre wilaya y répondent (disponibilité, prix), sans connaître votre identité.', 'تبحث عن دواء؟ انشر طلبك: تردّ صيدليات ولايتك بتوفّر الدواء وسعره، دون معرفة هويتك.') }}
      </p>


      <ng-container *ngIf="connecte()">
        <form (ngSubmit)="publier()" style="display:grid;gap:12px;margin:0 0 28px">
          <div style="display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(240px,1fr))">
            <label style="display:grid;gap:4px;color:var(--text3);font-size:.9rem">
              {{ l.t('Médicament recherché *', 'الدواء المطلوب *') }}
              <input class="champ" [(ngModel)]="demande.medicament" name="medicament" required [placeholder]="l.t('Ex. Amoxicilline 1 g', 'مثال: أموكسيسيلين 1 غ')" style="color:var(--tbi-ink);font-size:1rem">
            </label>
            <label style="display:grid;gap:4px;color:var(--text3);font-size:.9rem">
              {{ l.t('Wilaya *', 'الولاية *') }}
              <select class="champ" [(ngModel)]="demande.wilayaCode" name="wilayaCode" required style="color:var(--tbi-ink);font-size:1rem">
                <option value="">{{ l.t('Choisissez votre wilaya', 'اختر ولايتك') }}</option>
                <option *ngFor="let w of wilayas()" [value]="w.code">{{ w.code }} — {{ nomWilaya(w) }}</option>
              </select>
            </label>
            <label style="display:grid;gap:4px;color:var(--text3);font-size:.9rem">
              {{ l.t('Commune', 'البلدية') }}
              <input class="champ" [(ngModel)]="demande.commune" name="commune" [placeholder]="l.t('Ex. Bab Ezzouar', 'مثال: باب الزوار')" style="color:var(--tbi-ink);font-size:1rem">
            </label>
            <label style="display:grid;gap:4px;color:var(--text3);font-size:.9rem">
              {{ l.t('Précision (dosage, forme, urgence)', 'تفاصيل (الجرعة، الشكل، الاستعجال)') }}
              <input class="champ" [(ngModel)]="demande.precision" name="precision" [placeholder]="l.t('Ex. Boîte de 14 comprimés', 'مثال: علبة من 14 قرصًا')" style="color:var(--tbi-ink);font-size:1rem">
            </label>
          </div>
          <p style="color:var(--text3);font-size:.9rem;margin:0">{{ l.t('* Champs obligatoires.', '* حقول إلزامية.') }}</p>
          <p *ngIf="succes()" style="color:var(--vert);margin:0">{{ succes() }}</p>
          <p *ngIf="erreurFormulaire()" style="color:#b3261e;margin:0">{{ erreurFormulaire() }}</p>
          <div>
            <button type="submit" class="bouton" [disabled]="enCours()">{{ enCours() ? l.t('Publication…', 'جارٍ النشر…') : l.t('Publier ma demande', 'نشر طلبي') }}</button>
          </div>
        </form>

        <h2 style="font-size:1.1rem;margin:0 0 12px">{{ l.t('Mes demandes', 'طلباتي') }}</h2>
        <p *ngIf="charge()">{{ l.t('Chargement…', 'جارٍ التحميل…') }}</p>
        <p *ngIf="erreur()" style="color:#b3261e">{{ erreur() }}</p>

        <ul style="list-style:none;padding:0;margin:0;display:grid;gap:10px">
          <li *ngFor="let b of besoins()" style="background:#fff;box-shadow:var(--s1);border:1px solid var(--border);border-radius:12px">
            <a [routerLink]="['/dawini', b.id]"
               style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;padding:14px;color:inherit;text-decoration:none">
              <span>
                <strong>{{ b.medicament }}</strong>
                <span style="color:var(--text3)"> · {{ libelleStatut(b.statut) }}</span><br>
                <span style="color:var(--text3)">
                  {{ wilaya(b.wilayaCode) }}<ng-container *ngIf="b.commune"> · {{ b.commune }}</ng-container>
                  · <ng-container *ngIf="!l.ar()">publiée le {{ b.publieLe | date:'d MMMM à HH:mm' }}</ng-container><ng-container *ngIf="l.ar()">نُشر في <span dir="ltr">{{ b.publieLe | date:'dd/MM/yyyy HH:mm' }}</span></ng-container>
                </span>
              </span>
              <span style="color:var(--vert);font-weight:600">{{ libelleReponses(b.nombreReponses) }}</span>
            </a>
          </li>
        </ul>
        <p *ngIf="!charge() && !erreur() && besoins().length === 0">{{ l.t('Aucune demande pour le moment.', 'لا توجد طلبات حاليًا.') }}</p>
      </ng-container>
    </main>
  `
})
export class MesDemandesComponent implements OnInit {
  l = inject(LangueService);
  /** Nom de la wilaya (referentiel) plutot que son code, dans la langue de l'ecran. */
  wilaya = (code: string | null | undefined) => libelleWilaya(code, this.l.ar());

  /** Nom de la wilaya d'une option de la liste deroulante : arabe si l'ecran est en arabe et que le nom est connu. */
  nomWilaya(w: OptionWilaya): string {
    return this.l.ar() ? (wilayaParCode(w.code)?.nomAr ?? w.nom) : w.nom;
  }
  private auth = inject(AuthService);
  private service = inject(DawiniService);
  private profils = inject(ProfilService);
  private http = inject(HttpClient);

  /** null tant que l'etat de connexion n'est pas connu. */
  connecte = signal<boolean | null>(null);
  demande = formulaireVide();
  /** Wilayas du referentiel, pour la liste deroulante. */
  wilayas = signal<OptionWilaya[]>([]);
  /** Wilaya du profil du patient, preselectionnee (et conservee apres publication). */
  private wilayaProfil = '';
  besoins = signal<Besoin[]>([]);
  charge = signal(false);
  enCours = signal(false);
  succes = signal('');
  /** Erreur du formulaire de publication (distincte de celle de la liste). */
  erreurFormulaire = signal('');
  erreur = signal('');

  async ngOnInit() {
    this.http
      .get<{ wilayas?: OptionWilaya[] }>('/assets/referentiel.json')
      .pipe(catchError(() => of({ wilayas: [] as OptionWilaya[] })))
      .subscribe((ref) => this.wilayas.set(ref?.wilayas ?? []));
    await this.auth.pret();
    const connecte = this.auth.estConnecte();
    this.connecte.set(connecte);
    if (!connecte) {
      this.auth.seConnecter();
      return;
    }
    this.preselectionnerWilaya();
    this.charger();
  }

  /** Preselectionne la wilaya du profil (GET /api/moi/profil) ; profil absent (404) ou en erreur : rien. */
  private preselectionnerWilaya() {
    this.profils.monProfil().pipe(catchError(() => of(null))).subscribe((profil) => {
      const code = profil?.wilayaCode?.trim();
      if (!code) return;
      this.wilayaProfil = code;
      if (!this.demande.wilayaCode) this.demande.wilayaCode = code;
    });
  }

  charger() {
    this.charge.set(true);
    this.erreur.set('');
    this.service.mesBesoins().subscribe({
      next: (liste) => {
        // Les plus recentes d'abord.
        this.besoins.set([...liste].sort((a, b) => Date.parse(b.publieLe) - Date.parse(a.publieLe)));
        this.charge.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.charge.set(false);
        if (e.status === 401) {
          this.auth.seConnecter();
        } else if (e.status === 403) {
          this.erreur.set(this.l.t('Cette page est réservée aux patients.', 'هذه الصفحة مخصصة للمرضى.'));
        } else {
          this.erreur.set(e.error?.erreur ?? this.l.t('Impossible de charger vos demandes.', 'تعذّر تحميل طلباتك.'));
        }
      },
    });
  }

  publier() {
    const medicament = this.demande.medicament.trim();
    const wilayaCode = this.demande.wilayaCode.trim();
    const commune = this.demande.commune.trim();
    const precision = this.demande.precision.trim();
    this.succes.set('');
    if (!medicament) {
      this.erreurFormulaire.set(this.l.t('Indiquez le médicament recherché.', 'أدخل اسم الدواء المطلوب.'));
      return;
    }
    if (!wilayaCode) {
      this.erreurFormulaire.set(this.l.t('Choisissez votre wilaya.', 'اختر ولايتك.'));
      return;
    }
    const demande: DemandeBesoin = { medicament, wilayaCode };
    if (commune) demande.commune = commune;
    if (precision) demande.precision = precision;
    this.erreurFormulaire.set('');
    this.enCours.set(true);
    this.service.publier(demande).subscribe({
      next: () => {
        this.enCours.set(false);
        this.demande = formulaireVide(this.wilayaProfil);
        this.succes.set(this.l.t('Demande publiée : les pharmacies de votre wilaya peuvent y répondre.', 'تم نشر الطلب: يمكن لصيدليات ولايتك الرد عليه.'));
        this.charger();
      },
      error: (e: HttpErrorResponse) => {
        this.enCours.set(false);
        if (e.status === 401) {
          this.auth.seConnecter();
        } else if (e.status === 403) {
          this.erreurFormulaire.set(this.l.t('Seul un compte patient peut publier une demande.', 'يمكن لحساب المريض فقط نشر طلب.'));
        } else if (e.status === 400) {
          this.erreurFormulaire.set(e.error?.erreur ?? this.l.t('La demande est incomplète.', 'الطلب غير مكتمل.'));
        } else {
          this.erreurFormulaire.set(e.error?.erreur ?? this.l.t('La publication a échoué, veuillez réessayer.', 'فشل النشر، يرجى المحاولة مرة أخرى.'));
        }
      },
    });
  }

  libelleStatut(statut: string): string {
    return libelleStatutBesoin(statut, this.l.ar());
  }

  libelleReponses(nombre: number): string {
    return libelleReponses(nombre, this.l.ar());
  }
}
