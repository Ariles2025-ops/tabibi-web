import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, of } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { RoleService } from '../auth/role.service';
import { instantLisible } from '../partage/dates-lisibles';
import { LangueService } from '../partage/langue.service';
import { WILAYAS_SEO } from '../seo/referentiel-seo';
import {
  ANNEE_NAISSANCE_MIN,
  DemandeProfil,
  LANGUE_PAR_DEFAUT,
  LANGUES,
  LONGUEUR_MAX_NOM,
  LONGUEUR_MAX_WILAYA,
  Profil,
  ProfilService,
  dateLocaleIso,
  nettoyerProfil,
  validerProfil,
} from './profil.service';

/** Libelles arabes des wilayas, par code (referentiel SEO). */
const WILAYAS_AR = new Map(WILAYAS_SEO.map((w) => [w.code, w.nomAr]));

/** Champs du formulaire, vides (langue fr par defaut, comme cote API). */
function formulaireVide(): DemandeProfil {
  return { nomComplet: '', telephone: '', dateNaissance: '', wilayaCode: '', langue: LANGUE_PAR_DEFAUT };
}

/**
 * Mon profil (utilisateur connecte, tous roles) : formulaire prerempli depuis GET /api/moi/profil (404 = jamais
 * renseigne → formulaire vide), enregistre par PUT /api/moi/profil. Validation cote client coherente avec le
 * backend ; un 400 affiche le motif { erreur } renvoye.
 */
@Component({
    selector: 'app-profil',
    imports: [CommonModule, FormsModule, RouterLink],
    template: `
    <main style="max-width:640px;margin:32px auto;padding:0 16px" [attr.dir]="l.ar() ? 'rtl' : null" [attr.lang]="l.ar() ? 'ar' : null">
      <p style="margin:0 0 16px"><a routerLink="/moi" style="color:var(--vert)">{{ l.t('Retour à mon compte', 'العودة إلى حسابي') }}</a></p>
      <h1 style="color:var(--vert);margin:0 0 8px">{{ l.t('Mon profil', 'ملفي الشخصي') }}</h1>
      <p *ngIf="estPharmacie()" class="profil-intro-pharmacie" style="color:var(--text3);margin:0 0 20px">
        {{ l.t('Le nom de votre pharmacie est montré aux patients dans vos réponses ; la wilaya sert à afficher les demandes de votre zone. Seul le nom de la pharmacie est obligatoire.', 'يظهر اسم صيدليتك للمرضى في ردودك ؛ وتُستعمل الولاية لعرض الطلبات الواردة من منطقتك. اسم الصيدلية وحده إجباري.') }}
      </p>
      <p *ngIf="!estPharmacie()" style="color:var(--text3);margin:0 0 20px">
        {{ l.t('Ces informations servent aux praticiens et aux rappels de rendez-vous. Seul le nom complet est obligatoire.', 'تُستعمل هذه المعلومات من طرف الأطباء ولتذكيرات المواعيد. الاسم الكامل وحده إجباري.') }}
      </p>


      <ng-container *ngIf="connecte()">
        <p *ngIf="charge()">{{ l.t('Chargement…', 'جارٍ التحميل…') }}</p>
        <p *ngIf="erreurChargement()" style="color:#b3261e">{{ erreurChargement() }}</p>

        <form *ngIf="!charge() && !erreurChargement()" (ngSubmit)="enregistrer()" style="display:grid;gap:12px">
          <label style="display:grid;gap:4px;color:var(--text3);font-size:.9rem">
            {{ estPharmacie() ? l.t('Nom de la pharmacie *', 'اسم الصيدلية *') : l.t('Nom complet *', 'الاسم الكامل *') }}
            <input class="champ" [(ngModel)]="formulaire.nomComplet" name="nomComplet" required [maxlength]="longueurMaxNom"
                   [placeholder]="estPharmacie() ? l.t('Ex. Pharmacie El Amel', 'مثال: صيدلية الأمل') : l.t('Ex. Amina Belkacem', 'مثال: أمينة بلقاسم')" style="color:var(--tbi-ink);font-size:1rem">
          </label>
          <div style="display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(200px,1fr))">
            <label style="display:grid;gap:4px;color:var(--text3);font-size:.9rem">
              {{ l.t('Téléphone', 'الهاتف') }}
              <input class="champ" [(ngModel)]="formulaire.telephone" name="telephone" type="tel" placeholder="0550 12 34 56" dir="ltr"
                     style="color:var(--tbi-ink);font-size:1rem">
            </label>
            <label *ngIf="!estPharmacie()" style="display:grid;gap:4px;color:var(--text3);font-size:.9rem">
              {{ l.t('Date de naissance', 'تاريخ الميلاد') }}
              <input class="champ" [(ngModel)]="formulaire.dateNaissance" name="dateNaissance" type="date" [max]="hier" [min]="dateMin"
                     style="color:var(--tbi-ink);font-size:1rem">
            </label>
            <label style="display:grid;gap:4px;color:var(--text3);font-size:.9rem">
              {{ l.t('Wilaya', 'الولاية') }}
              <select class="champ" [(ngModel)]="formulaire.wilayaCode" name="wilayaCode" style="color:var(--tbi-ink);font-size:1rem">
                <option value="">{{ l.t('Non renseignée', 'غير محدّدة') }}</option>
                <option *ngIf="wilayaHorsListe()" [value]="formulaire.wilayaCode">{{ formulaire.wilayaCode }}</option>
                <option *ngFor="let w of wilayas()" [value]="w.code">{{ w.code }} — {{ nomWilaya(w) }}</option>
              </select>
            </label>
            <label style="display:grid;gap:4px;color:var(--text3);font-size:.9rem">
              {{ l.t('Langue préférée', 'اللغة المفضلة') }}
              <select class="champ" [(ngModel)]="formulaire.langue" name="langue" style="color:var(--tbi-ink);font-size:1rem">
                <option *ngFor="let l of langues" [value]="l.code">{{ l.libelle }}</option>
              </select>
            </label>
          </div>
          <p style="color:var(--text3);font-size:.9rem;margin:0">{{ l.t('* Champ obligatoire.', '* حقل إجباري.') }}</p>
          <p *ngIf="!estPharmacie()" class="profil-confidentialite" style="color:var(--text3);font-size:.9rem;margin:0">{{ l.t('Ces informations ne sont visibles que de vous et des praticiens que vous consultez.', 'هذه المعلومات لا يراها إلا أنت والأطباء الذين تستشيرهم.') }}</p>
          <p *ngIf="succes()" style="color:var(--vert);margin:0">{{ succes() }}</p>
          <p *ngIf="erreur()" style="color:#b3261e;margin:0">{{ erreur() }}</p>
          <div>
            <button type="submit" class="bouton" [disabled]="enCours()">{{ enCours() ? l.t('Enregistrement…', 'جارٍ الحفظ…') : l.t('Enregistrer', 'حفظ') }}</button>
          </div>
          <p *ngIf="profil() as p" class="profil-maj" style="color:var(--text3);font-size:.9rem;margin:0">
            <ng-container *ngIf="dateLisible(p.misAJourLe)">
              <ng-container *ngIf="!l.ar()">Dernière mise à jour le {{ p.misAJourLe | date:'d MMMM yyyy à HH:mm' }}.</ng-container>
              <ng-container *ngIf="l.ar()">آخر تحديث في <span dir="ltr">{{ p.misAJourLe | date:'dd/MM/yyyy HH:mm' }}</span>.</ng-container>
            </ng-container>
            <ng-container *ngIf="!dateLisible(p.misAJourLe)">{{ l.t('Profil non enregistré', 'الملف غير محفوظ') }}</ng-container>
          </p>
        </form>
      </ng-container>
    </main>
  `
})
export class ProfilComponent implements OnInit {
  l = inject(LangueService);
  private auth = inject(AuthService);
  private service = inject(ProfilService);
  private http = inject(HttpClient);
  private roles = inject(RoleService);
  /** Role PHARMACIE : textes et champs adaptes (nom affiche aux patients, pas de date de naissance). */
  estPharmacie = this.roles.estPharmacie;

  /** null tant que l'etat de connexion n'est pas connu. */
  connecte = signal<boolean | null>(null);
  /** Profil enregistre cote API ; null tant qu'il n'a jamais ete renseigne. */
  profil = signal<Profil | null>(null);

  /** Vrai si la date de mise a jour est lisible ; sinon « Profil non enregistre », comme l'appli (libelleMiseAJour). */
  dateLisible(iso: string | null | undefined): boolean {
    return instantLisible(iso) !== null;
  }
  formulaire: DemandeProfil = formulaireVide();
  langues = LANGUES;
  longueurMaxNom = LONGUEUR_MAX_NOM;
  longueurMaxWilaya = LONGUEUR_MAX_WILAYA;
  /** Wilayas du referentiel (assets/referentiel.json) : code attendu par l'API + libelle FR. */
  wilayas = signal<{ code: string; nom: string }[]>([]);
  /** Bornes du selecteur de date : la veille (date passee) et le 1er janvier suivant l'annee minimale. */
  hier = dateLocaleIso(new Date(Date.now() - 24 * 60 * 60 * 1000));
  dateMin = `${ANNEE_NAISSANCE_MIN + 1}-01-01`;
  charge = signal(false);
  enCours = signal(false);
  succes = signal('');
  /** Erreur du chargement initial (la page n'affiche alors pas le formulaire), distincte de celle du formulaire. */
  erreurChargement = signal('');
  erreur = signal('');

  async ngOnInit() {
    this.http
      .get<{ wilayas?: { code: string; nom: string }[] }>('/assets/referentiel.json')
      .pipe(catchError(() => of({ wilayas: [] })))
      .subscribe((ref) => this.wilayas.set(ref?.wilayas ?? []));
    void this.roles.charger();
    await this.auth.pret();
    const connecte = this.auth.estConnecte();
    this.connecte.set(connecte);
    if (!connecte) {
      this.auth.seConnecter();
      return;
    }
    this.charger();
  }

  charger() {
    this.charge.set(true);
    this.erreurChargement.set('');
    this.service.monProfil().subscribe({
      next: (p) => {
        this.charge.set(false);
        this.afficher(p);
      },
      error: (e: HttpErrorResponse) => {
        this.charge.set(false);
        if (e.status === 404) {
          // Jamais renseigne : formulaire vide.
          this.profil.set(null);
          this.formulaire = formulaireVide();
        } else if (e.status === 401) {
          this.auth.seConnecter();
        } else {
          this.erreurChargement.set(e.error?.erreur ?? this.l.t('Impossible de charger votre profil.', 'تعذّر تحميل ملفك الشخصي.'));
        }
      },
    });
  }

  enregistrer() {
    const demande = nettoyerProfil(this.formulaire);
    this.succes.set('');
    const motif = validerProfil(demande, new Date(), this.l.ar());
    if (motif) {
      this.erreur.set(motif);
      return;
    }
    this.erreur.set('');
    this.enCours.set(true);
    this.service.enregistrer(demande).subscribe({
      next: (p) => {
        this.enCours.set(false);
        this.afficher(p);
        this.succes.set(this.l.t('Profil enregistré.', 'تم حفظ الملف الشخصي.'));
      },
      error: (e: HttpErrorResponse) => {
        this.enCours.set(false);
        if (e.status === 401) {
          this.auth.seConnecter();
        } else if (e.status === 400) {
          this.erreur.set(e.error?.erreur ?? this.l.t('Le profil est invalide.', 'الملف الشخصي غير صالح.'));
        } else {
          this.erreur.set(
            e.error?.erreur ?? this.l.t("L'enregistrement du profil a échoué, veuillez réessayer.", 'تعذّر حفظ الملف الشخصي، يُرجى المحاولة مرة أخرى.'),
          );
        }
      },
    });
  }

  /** Affiche le profil et preremplit le formulaire (facultatifs absents → champs vides). */
  private afficher(p: Profil) {
    this.profil.set(p);
    this.formulaire = {
      nomComplet: p.nomComplet,
      telephone: p.telephone ?? '',
      dateNaissance: p.dateNaissance ?? '',
      wilayaCode: p.wilayaCode ?? '',
      langue: p.langue || LANGUE_PAR_DEFAUT,
    };
  }

  /** Libelle d'une wilaya : en arabe quand l'arabe est choisi et qu'il existe, sinon le libelle francais. */
  nomWilaya(w: { code: string; nom: string }): string {
    return (this.l.ar() && WILAYAS_AR.get(w.code)) || w.nom;
  }

  /** Vrai si le code enregistre n'est pas dans le referentiel : on le garde selectionnable pour ne pas le perdre. */
  wilayaHorsListe(): boolean {
    const code = (this.formulaire.wilayaCode ?? '').trim();
    return !!code && this.wilayas().length > 0 && !this.wilayas().some((w) => w.code === code);
  }
}
