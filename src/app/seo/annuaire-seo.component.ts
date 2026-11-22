import { Component, DestroyRef, OnInit, PLATFORM_ID, inject, signal } from '@angular/core';
import { CommonModule, DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AnnuaireService, CommuneApi, Medecin } from '../annuaire/annuaire.service';
import { TEXTES_SEO, TextesSeo } from './textes-seo';
import { CONTENU_SPECIALITES } from './contenu-specialites';
import { StatutHttpService } from './statut-http';
import { ecrireJsonLd, fil, pageAnnuaire } from './donnees-structurees';
import { Commune, MIN_PRATICIENS_COMMUNE, slugCommune } from './communes';
import { poserLangueDocument } from './page-seo';
import {
  SLUG_PHARMACIE, SPECIALITES_PRINCIPALES, SPECIALITES_SEO, SpecialiteSeo, WILAYAS_PRINCIPALES, WILAYAS_SEO, WilayaSeo,
  avecArticle, liensLangues, lienPraticien,
} from './referentiel-seo';

/**
 * Pages de referencement (SEO) de l'annuaire, liees depuis le pied de page :
 *  /specialites                      toutes les specialites et wilayas
 *  /specialites/:specialite          une specialite dans toute l'Algerie
 *  /specialites/:specialite/:wilaya  une specialite dans une wilaya
 *  /wilayas/:wilaya                  tous les medecins d'une wilaya
 * Chaque page a son titre, sa description, son lien canonique, la liste des medecins (nom, specialite, ville)
 * et un maillage vers les autres wilayas / specialites. La fiche et la reservation restent reservees aux comptes.
 */
@Component({
    selector: 'app-annuaire-seo',
    imports: [CommonModule, RouterLink],
    template: `
    <main class="seo" [attr.dir]="ar ? 'rtl' : null" [attr.lang]="ar ? 'ar' : 'fr'">
      <div class="seo-haut">
        <nav class="seo-fil" [attr.aria-label]="t.fil">
          <a [routerLink]="ar ? '/ar' : '/'" class="seo-accueil">{{ t.accueil }}</a><span>›</span>
          <a [routerLink]="p + '/specialites'">{{ t.annuaire }}</a>
          <ng-container *ngIf="specialite"><span>›</span>
            <a [routerLink]="[p + '/specialites', specialite.slug]">{{ nomS(specialite) }}</a></ng-container>
          <ng-container *ngIf="wilaya && !communeSlug"><span>›</span><span aria-current="page">{{ nomW(wilaya) }}</span></ng-container>
          <ng-container *ngIf="wilaya && communeSlug"><span>›</span>
            <a [routerLink]="[p + '/specialites', specialite?.slug, wilaya.slug]">{{ nomW(wilaya) }}</a><span>›</span>
            <span aria-current="page">{{ nomCommune }}</span></ng-container>
        </nav>
        <a class="seo-langue" [routerLink]="lienAutreLangue" [attr.hreflang]="ar ? 'fr' : 'ar'" [attr.lang]="ar ? 'fr' : 'ar'">{{ ar ? 'Français' : 'العربية' }}</a>
      </div>

      <header class="seo-tete">
        <h1>{{ titre }}</h1>
        <p>{{ intro }}</p>
      </header>

      <!-- Index : toutes les specialites et toutes les wilayas -->
      <ng-container *ngIf="index">
        <section class="seo-bloc">
          <h2>{{ t.specialites }} <small>{{ specialitesAlpha.length }}</small></h2>
          <div class="seo-cartes">
            <a *ngFor="let s of specialitesAlpha" [routerLink]="[p + '/specialites', s.slug]" class="seo-carte">
              <span class="seo-carte__ic" aria-hidden="true"><i class="fa fa-stethoscope"></i></span>{{ nomS(s) }}
            </a>
          </div>
        </section>
        <section class="seo-bloc">
          <h2>{{ t.pharmacies }}</h2>
          <p class="seo-muet">{{ t.pharmaciesIntro }}</p>
          <a [routerLink]="[p + '/specialites', slugPharmacie]" class="seo-carte seo-carte--seule">
            <span class="seo-carte__ic" aria-hidden="true"><i class="fa fa-prescription-bottle-medical"></i></span>{{ t.pharmacies }}
          </a>
        </section>
        <section class="seo-bloc">
          <h2>{{ t.wilayas }} <small>{{ wilayasAlpha.length }}</small></h2>
          <div class="seo-colonnes">
            <a *ngFor="let w of wilayasAlpha" [routerLink]="[p + '/wilayas', w.slug]" [attr.title]="t.medecinsA(nomW(w))">
              {{ nomW(w) }}<span class="seo-code">{{ w.code }}</span></a>
          </div>
        </section>
      </ng-container>

      <!-- Liste des medecins -->
      <section class="seo-bloc" *ngIf="!index && !introuvable">
        <div class="seo-entete">
          <h2>{{ sousTitre }}</h2>
          <span *ngIf="!charge() && medecins().length" class="seo-nb">
            {{ pharmacie ? t.nombrePharma(totalAffiche()) : t.nombre(totalAffiche()) }}
          </span>
        </div>
        <p *ngIf="charge()" class="seo-muet">{{ pharmacie ? t.chargementPharma : t.chargement }}</p>
        <p *ngIf="!charge() && erreur()" class="seo-muet">{{ t.erreur }}</p>
        <p *ngIf="!charge() && !erreur() && medecins().length === 0" class="seo-muet">{{ pharmacie ? t.aucunPharma : t.aucun }}</p>
        <ul class="seo-medecins">
          <li *ngFor="let m of medecins()">
            <a [routerLink]="lien(m)" class="seo-med">
              <span class="seo-ava" aria-hidden="true">{{ initiales(m) }}</span>
              <span class="seo-med__txt">
                <strong dir="auto">{{ m.nomComplet }}</strong>
                <small>{{ specialiteDe(m) }} · {{ lieuDe(m) }}</small>
              </span>
              <span *ngIf="m.reservable" class="seo-resa">{{ t.reservable }}</span>
            </a>
          </li>
        </ul>
        <p class="seo-note" *ngIf="!pharmacie">{{ t.note }}</p>
      </section>

      <p *ngIf="introuvable" class="seo-muet">{{ t.introuvable }} <a [routerLink]="p + '/specialites'">{{ t.voirTout }}</a></p>

      <!-- Presentation editoriale de la specialite (contenu unique, FR/AR) -->
      <section class="seo-bloc seo-apropos" *ngIf="apropos && !introuvable">
        <p>{{ apropos }}</p>
      </section>

      <!-- Maillage : communes (>= 3 praticiens) de la wilaya, ou communes voisines depuis une page commune -->
      <section class="seo-bloc" *ngIf="specialite && wilaya && !introuvable && !pharmacie && communesListe.length">
        <h2>{{ communeSlug ? t2.voisines(nomS(specialite), nomW(wilaya)) : t2.communes(nomS(specialite), nomW(wilaya)) }}</h2>
        <div class="seo-colonnes">
          <a *ngFor="let c of communesListe" [routerLink]="[p + '/specialites', specialite.slug, wilaya.slug, c.slug]"
             [class.actif]="c.slug === communeSlug" [attr.title]="t2.titreCommune(nomS(specialite), c.nom, nomW(wilaya))">
            {{ c.nom }}<span class="seo-code">{{ c.medecins }}</span></a>
        </div>
        <p *ngIf="communeSlug" class="seo-note"><a [routerLink]="[p + '/specialites', specialite.slug, wilaya.slug]">{{ t2.toute(nomS(specialite), nomW(wilaya)) }}</a></p>
      </section>

      <!-- Maillage : autres wilayas pour cette specialite -->
      <section class="seo-bloc" *ngIf="specialite && !communeSlug && !introuvable">
        <h2>{{ t.autreWilaya(nomS(specialite)) }}</h2>
        <div class="seo-colonnes">
          <a *ngFor="let w of wilayasAlpha" [routerLink]="[p + '/specialites', specialite.slug, w.slug]"
             [class.actif]="w.slug === wilaya?.slug" [attr.title]="t.specA(nomS(specialite), nomW(w))">
            {{ nomW(w) }}<span class="seo-code">{{ w.code }}</span></a>
        </div>
      </section>

      <!-- Pharmacies de la wilaya : rubrique a part (le backend ne les melange plus aux medecins) -->
      <p class="seo-bloc" *ngIf="wilaya && !specialite && !introuvable">
        <a [routerLink]="[p + '/specialites', slugPharmacie, wilaya.slug]" class="seo-carte seo-carte--seule">
          <span class="seo-carte__ic" aria-hidden="true"><i class="fa fa-prescription-bottle-medical"></i></span>{{ t.pharmaciesA(nomW(wilaya)) }}
        </a>
      </p>

      <!-- Maillage : autres specialites dans cette wilaya -->
      <section class="seo-bloc" *ngIf="wilaya && !communeSlug && !introuvable">
        <h2>{{ t.specialitesA(nomW(wilaya), !!specialite) }}</h2>
        <div class="seo-colonnes">
          <a *ngFor="let s of specialitesAlpha" [routerLink]="[p + '/specialites', s.slug, wilaya.slug]"
             [class.actif]="s.slug === specialite?.slug" [attr.title]="t.specA(nomS(s), nomW(wilaya))">{{ nomS(s) }}</a>
        </div>
      </section>

      <section class="seo-faq" *ngIf="!index && !introuvable && !pharmacie">
        <h2>{{ t.faq }}</h2>
        <details *ngFor="let f of faqSpe"><summary>{{ f.q }}</summary><p>{{ f.r }}</p></details>
        <details><summary>{{ t.q1(cible) }}</summary><p>{{ t.r1 }}</p></details>
        <details><summary>{{ t.q2 }}</summary><p>{{ t.r2 }}</p></details>
        <details><summary>{{ t.q3 }}</summary>
          <p>{{ t.r3 }} <a routerLink="/praticien">{{ t.praticien }}</a></p></details>
      </section>
    </main>
  `,
    styles: [`
    .seo { max-width:1100px; margin:0 auto; padding:24px var(--gutter, 16px) 48px; color:var(--ink); }
    .seo-haut { display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap; margin-bottom:18px; }
    .seo-haut .seo-fil { margin-bottom:0; }
    .seo-langue { padding:6px 14px; border:1px solid var(--border); border-radius:999px; background:#fff; color:var(--vert); font-weight:700; font-size:13px; text-decoration:none; }
    .seo-fil { display:flex; flex-wrap:wrap; gap:6px; font-size:13px; color:var(--text3); margin-bottom:18px; }
    .seo-fil a { color:var(--vert); text-decoration:none; font-weight:600; }
    .seo-tete h1 { margin:0 0 8px; font-size:clamp(1.6rem,3vw,2.2rem); font-weight:800; letter-spacing:-.02em; text-wrap:balance; }
    .seo-tete p { margin:0 0 24px; color:var(--text3); line-height:1.6; max-width:70ch; }
    .seo-bloc { margin:0 0 32px; }
    .seo-bloc h2, .seo-faq h2 { font-size:1.15rem; font-weight:800; margin:0 0 14px; }
    .seo-entete { display:flex; justify-content:space-between; align-items:baseline; gap:12px; flex-wrap:wrap; }
    .seo-nb { color:var(--text3); font-size:13px; font-weight:600; }
    .seo-muet { color:var(--text3); }
    .seo-medecins { list-style:none; padding:0; margin:0; display:grid; grid-template-columns:repeat(auto-fill,minmax(min(100%,300px),1fr)); gap:12px; }
    .seo-med { display:flex; align-items:center; gap:12px; padding:14px 16px; background:#fff; border:1px solid var(--border); border-radius:16px; box-shadow:var(--s1); text-decoration:none; color:inherit; height:100%; box-sizing:border-box; flex-wrap:wrap; }
    .seo-med:hover { border-color:var(--vert); }
    .seo-ava { flex:none; width:44px; height:44px; border-radius:14px; background:var(--tbi-mint); color:var(--vert); font-weight:800; display:grid; place-items:center; }
    .seo-med__txt { flex:1; min-width:0; display:flex; flex-direction:column; gap:2px; }
    .seo-med__txt strong { font-size:15px; overflow-wrap:anywhere; }
    .seo-med__txt small { color:var(--text3); font-size:13px; }
    .seo-resa { font-size:12px; font-weight:700; color:var(--vert); background:var(--tbi-mint); padding:3px 10px; border-radius:999px; }
    .seo-note { color:var(--text3); font-size:13px; margin:14px 0 0; }
    .seo-apropos p { color:var(--text3); line-height:1.65; max-width:72ch; margin:0; }
    .seo-liens { display:flex; flex-wrap:wrap; gap:8px; }
    .seo-bloc h2 small { font-size:13px; font-weight:700; color:var(--text3); margin-inline-start:6px; }
    .seo-cartes { display:grid; grid-template-columns:repeat(auto-fill,minmax(min(100%,210px),1fr)); gap:10px; }
    .seo-carte { display:flex; align-items:center; gap:10px; padding:12px 14px; background:#fff; border:1px solid var(--border); border-radius:14px; color:var(--ink); text-decoration:none; font-weight:600; font-size:14px; }
    .seo-carte:hover { border-color:var(--vert); color:var(--vert); }
    .seo-carte--seule { display:inline-flex; }
    .seo-carte__ic { flex:none; width:32px; height:32px; border-radius:10px; background:var(--tbi-mint); color:var(--vert); display:grid; place-items:center; font-size:13px; }
    .seo-colonnes { columns:4 180px; column-gap:24px; background:#fff; border:1px solid var(--border); border-radius:16px; padding:14px 18px; }
    .seo-colonnes a { display:flex; justify-content:space-between; gap:8px; break-inside:avoid; padding:7px 4px; border-bottom:1px solid #f0ece3; color:var(--ink); text-decoration:none; font-size:14px; }
    .seo-colonnes a:hover, .seo-colonnes a.actif { color:var(--vert); font-weight:700; }
    .seo-code { color:var(--text3); font-size:12px; font-variant-numeric:tabular-nums; }
    .seo-liens a { padding:7px 12px; border:1px solid var(--border); border-radius:999px; background:#fff; color:var(--ink); text-decoration:none; font-size:13px; }
    .seo-liens a:hover, .seo-liens a.actif { border-color:var(--vert); color:var(--vert); font-weight:700; }
    .seo-faq details { background:#fff; border:1px solid var(--border); border-radius:12px; padding:12px 16px; margin-bottom:8px; }
    .seo-faq summary { cursor:pointer; font-weight:700; }
    .seo-faq p { color:var(--text3); margin:8px 0 0; line-height:1.55; }
    .seo-faq a { color:var(--vert); font-weight:700; }
  `]
})
export class AnnuaireSeoComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private annuaire = inject(AnnuaireService);
  private title = inject(Title);
  private meta = inject(Meta);
  private document = inject(DOCUMENT);
  private navigateur = isPlatformBrowser(inject(PLATFORM_ID));
  private destroyRef = inject(DestroyRef);
  private statut = inject(StatutHttpService);
  readonly slugPharmacie = SLUG_PHARMACIE;

  readonly specialites: SpecialiteSeo[] = trierAvecPrincipales(SPECIALITES_SEO, (s) => s.slug, SPECIALITES_PRINCIPALES);
  readonly wilayas: WilayaSeo[] = trierAvecPrincipales(WILAYAS_SEO, (w) => w.code, WILAYAS_PRINCIPALES);

  /** Listes completes, par ordre alphabetique (maillage lisible). */
  /** Specialites medicales (sans les pharmacies, qui ont leur rubrique a part). */
  specialitesAlpha: SpecialiteSeo[] = [];
  wilayasAlpha: WilayaSeo[] = [];

  /** Page commune (/specialites/:specialite/:wilaya/:commune) : slug demande, nom affiche, communes de la wilaya (>= 3). */
  communeSlug = '';
  nomCommune = '';
  communesListe: Commune[] = [];
  /** Vrai nombre de praticiens de la commune (0 hors page commune) ; la liste affichee est plafonnee par l'API. */
  totalCommune = 0;

  totalAffiche(): number { return this.totalCommune || this.medecins().length; }
  t2 = TEXTES_COMMUNE.fr;

  /** Langue de la page (donnee de route) : '' en francais, '/ar' en arabe. */
  ar = false;
  p = '';
  t: TextesSeo = TEXTES_SEO.fr;
  lienAutreLangue = '/';

  nomS(s: SpecialiteSeo) { return this.ar ? s.nomAr : s.nom; }
  nomW(w: WilayaSeo) { return this.ar ? w.nomAr : w.nom; }

  /** Specialite d'un praticien dans la langue de la page (slug connu), sinon le libelle de la base. */
  specialiteDe(m: Medecin): string {
    const s = SPECIALITES_SEO.find((x) => x.slug === m.specialiteSlug);
    if (s) return this.nomS(s);
    // Page arabe : jamais le libelle francais de la base (« Médecin… ») ; on reprend la specialite de la page, sinon « طبيب ».
    if (this.ar) return this.specialite && this.specialite.slug !== SLUG_PHARMACIE ? this.nomS(this.specialite) : 'طبيب';
    return m.specialiteFr;
  }

  lieuDe(m: Medecin): string {
    const w = WILAYAS_SEO.find((x) => x.code === m.wilayaCode);
    const wil = w ? this.nomW(w) : m.wilayaFr;
    if (this.ar) return wil || m.ville;
    return m.ville && m.wilayaFr && m.ville !== m.wilayaFr ? `${m.ville} (${m.wilayaFr})` : (m.ville || m.wilayaFr);
  }

  specialite: SpecialiteSeo | null = null;
  wilaya: WilayaSeo | null = null;
  index = false;
  introuvable = false;
  /** Page de la rubrique Pharmacies (/specialites/pharmacie[/:wilaya]). */
  pharmacie = false;
  titre = '';
  sousTitre = '';
  intro = '';
  cible = '';
  /** Contenu éditorial unique de la spécialité (vide si la spécialité n'en a pas encore). */
  apropos = '';
  faqSpe: { q: string; r: string }[] = [];

  private cheminLd = '';
  private description = '';
  medecins = signal<Medecin[]>([]);
  charge = signal(false);
  erreur = signal(false);

  ngOnInit() {
    this.ar = this.route.snapshot.data['langue'] === 'ar';
    this.p = this.ar ? '/ar' : '';
    this.t = TEXTES_SEO[this.ar ? 'ar' : 'fr'];
    this.t2 = TEXTES_COMMUNE[this.ar ? 'ar' : 'fr'];
    const tri = this.ar ? 'ar' : 'fr';
    this.specialitesAlpha = SPECIALITES_SEO.filter((x) => x.slug !== SLUG_PHARMACIE).sort((a, b) => this.nomS(a).localeCompare(this.nomS(b), tri));
    this.wilayasAlpha = [...WILAYAS_SEO].sort((a, b) => this.nomW(a).localeCompare(this.nomW(b), tri));
    const abonnement = this.route.paramMap.subscribe((p) => this.afficher(p.get('specialite'), p.get('wilaya'), p.get('commune')));
    this.destroyRef.onDestroy(() => abonnement.unsubscribe());
  }

  private afficher(specSlug: string | null, wilSlug: string | null, communeSlug: string | null = null) {
    this.communeSlug = communeSlug || '';
    this.nomCommune = '';
    this.communesListe = [];
    this.totalCommune = 0;
    this.specialite = specSlug ? SPECIALITES_SEO.find((s) => s.slug === specSlug) ?? null : null;
    this.wilaya = wilSlug ? WILAYAS_SEO.find((w) => w.slug === wilSlug) ?? null : null;
    this.introuvable = (!!specSlug && !this.specialite) || (!!wilSlug && !this.wilaya)
      || (!!communeSlug && (this.specialite?.slug === SLUG_PHARMACIE || communeSlug !== slugCommune(communeSlug)));
    this.index = !specSlug && !wilSlug;
    this.pharmacie = this.specialite?.slug === SLUG_PHARMACIE;
    const contenuSpe = this.specialite && !this.introuvable
      ? CONTENU_SPECIALITES[this.specialite.slug]?.[this.ar ? 'ar' : 'fr']
      : undefined;
    this.apropos = contenuSpe?.apropos ?? '';
    this.faqSpe = contenuSpe?.faq ?? [];
    this.medecins.set([]);
    // Page de liste : « Chargement » des le rendu serveur (sinon « Aucun praticien » s'afficherait un instant).
    this.charge.set(!(!specSlug && !wilSlug));

    const s = this.specialite, w = this.wilaya, t = this.t;
    const ns = s ? this.nomS(s) : '', nw = w ? this.nomW(w) : '';
    let chemin = '/specialites';
    let description: string;
    if (this.introuvable) {
      this.titre = t.pageIntrouvable;
      this.intro = '';
      description = t.descIntrouvable;
      this.statut.introuvable();
    } else if (this.index) {
      this.titre = t.titreIndex;
      this.intro = t.introIndex;
      description = t.descIndex;
    } else if (s && w) {
      chemin = `/specialites/${s.slug}/${w.slug}`;
      this.titre = t.titreSpecWil(ns, nw);
      this.cible = t.cibleSpecWil(ns, nw, avecArticle(s));
      this.sousTitre = t.sousTitreSpecWil(ns, nw);
      this.intro = t.introSpecWil(ns, nw, avecArticle(s));
      description = t.descSpecWil(ns, nw);
    } else if (s) {
      chemin = `/specialites/${s.slug}`;
      this.titre = t.titreSpec(ns);
      this.cible = t.cibleSpec(ns, avecArticle(s));
      this.sousTitre = t.sousTitreSpec(ns);
      this.intro = t.introSpec(ns, avecArticle(s));
      description = t.descSpec(ns);
    } else {
      chemin = `/wilayas/${w!.slug}`;
      this.titre = t.titreWil(nw);
      this.cible = t.cibleWil(nw);
      this.sousTitre = t.sousTitreWil(nw);
      this.intro = t.introWil(nw);
      description = t.descWil(nw);
    }

    if (this.pharmacie && !this.introuvable) {
      // Pharmacies : pas de « prendre rendez-vous », titre au pluriel.
      this.titre = w ? t.pharmaciesA(nw) : t.titreSpec(t.pharmacies);
      this.sousTitre = this.titre;
      this.intro = t.introPharma(w ? nw : null);
      description = t.descPharma(w ? nw : null);
    }

    this.lienAutreLangue = (this.ar ? '' : '/ar') + chemin;
    this.title.setTitle(this.pharmacie || this.introuvable ? `${this.titre} | Ndawik` : `${this.titre} — ${t.suffixeTitre} | Ndawik`);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ property: 'og:title', content: `${this.titre} | Ndawik` });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:locale', content: this.ar ? 'ar_DZ' : 'fr_DZ' });
    this.meta.updateTag({ name: 'robots', content: this.introuvable ? 'noindex' : 'index, follow' });
    this.lienCanonique(`https://ndawik.com${this.p}${chemin}`);
    liensLangues(this.document, chemin);
    poserLangueDocument(this.document, this.ar);
    this.cheminLd = chemin;
    this.description = description;
    this.donneesStructurees(chemin);

    // La liste vient de l API publique ; elle est aussi rendue cote serveur pour les moteurs de recherche.
    if (!this.index && !this.introuvable) {
      this.charge.set(true);
      this.erreur.set(false);
      const commune = this.communeSlug || undefined;
      const liste$ = this.annuaire.rechercher(s?.slug, w?.code, undefined, commune);
      // Page specialite x wilaya (hors pharmacie) : les communes viennent de /api/medecins/communes, pas des fiches listees.
      const avecCommunes = !!s && !!w && !this.pharmacie;
      const communes$ = avecCommunes
        ? this.annuaire.communes(s!.slug, w!.code).pipe(catchError(() => of(null)))
        : of(null);
      forkJoin([liste$, communes$]).subscribe({
        next: ([liste, communes]) => {
          if (avecCommunes) this.appliquerCommunes(liste, communes, s!, w!, chemin);
          else this.medecins.set(liste);
          // Page specialite x wilaya sans aucun praticien : pas indexable (et absente du plan du site).
          if (s && w && !this.communeSlug && !this.introuvable && liste.length === 0) {
            this.meta.updateTag({ name: 'robots', content: 'noindex, follow' });
          }
          this.charge.set(false);
          this.donneesStructurees(this.cheminLd);
        },
        error: () => { this.erreur.set(true); this.charge.set(false); },
      });
    }
  }

  /**
   * Communes de la wilaya (>= 3 praticiens, source : API). Sur une page commune : la liste recue est deja filtree
   * par l'API ; moins de 3 praticiens => vraie 404 (pas de page vide, Google les penalise).
   */
  private appliquerCommunes(liste: Medecin[], communes: CommuneApi[] | null, s: SpecialiteSeo, w: WilayaSeo, chemin: string) {
    this.communesListe = (communes || [])
      .filter((c) => c.slug && c.slug !== w.slug && (Number(c.nombre) || 0) >= MIN_PRATICIENS_COMMUNE)
      .map((c) => ({ slug: c.slug, nom: c.nom, medecins: Number(c.nombre) || 0 }))
      .sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
    if (!this.communeSlug) { this.medecins.set(liste); return; }
    const gens = liste.filter((m) => slugCommune(m.ville) === this.communeSlug);
    if (gens.length < MIN_PRATICIENS_COMMUNE) {
      this.introuvable = true;
      this.medecins.set([]);
      this.titre = this.t.pageIntrouvable;
      this.intro = '';
      this.meta.updateTag({ name: 'robots', content: 'noindex' });
      this.statut.introuvable();
      this.donneesStructurees(chemin);
      return;
    }
    const commune = {
      slug: this.communeSlug,
      nom: this.communesListe.find((c) => c.slug === this.communeSlug)?.nom || gens[0].ville.trim(),
    };
    this.nomCommune = commune.nom;
    // L'API plafonne la liste (50 fiches) : le vrai total est le champ « nombre » de l'API communes.
    const totalCommune = this.communesListe.find((c) => c.slug === this.communeSlug)?.medecins || gens.length;
    this.totalCommune = Math.max(totalCommune, gens.length);
    this.medecins.set(gens);
    const ns = this.nomS(s), nw = this.nomW(w), t2 = this.t2;
    const chemCommune = `${chemin}/${commune.slug}`;
    this.titre = t2.titre(ns, commune.nom, nw);
    this.sousTitre = t2.sousTitre(ns, commune.nom);
    this.cible = t2.cible(ns, commune.nom, avecArticle(s));
    this.intro = t2.intro(ns, commune.nom, nw, this.totalCommune);
    const description = t2.description(ns, commune.nom, nw, this.totalCommune);
    this.description = description;
    this.title.setTitle(`${this.titre} — ${this.t.suffixeTitre} | Ndawik`);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ property: 'og:title', content: `${this.titre} | Ndawik` });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ name: 'robots', content: 'index, follow' });
    this.lienCanonique(`https://ndawik.com${this.p}${chemCommune}`);
    liensLangues(this.document, chemCommune);
    this.lienAutreLangue = (this.ar ? '' : '/ar') + chemCommune;
    this.donneesStructurees(chemin);
  }

  /** FAQ visible (memes textes que le bloc HTML) : base du JSON-LD FAQPage. */
  faqVisible(): { q: string; r: string }[] {
    const t = this.t;
    return [
      ...this.faqSpe,
      { q: t.q1(this.cible), r: t.r1 },
      { q: t.q2, r: t.r2 },
      { q: t.q3, r: `${t.r3} ${t.praticien}` },
    ];
  }

  /** JSON-LD : un seul bloc @graph (MedicalWebPage, ItemList des praticiens affiches, fil d'Ariane, FAQPage). */
  private donneesStructurees(chemin: string) {
    // Anciens blocs separes : retires au profit du bloc unique.
    ecrireJsonLd(this.document, 'ld-fil', null);
    ecrireJsonLd(this.document, 'ld-faq', null);
    if (this.introuvable || this.index) {
      ecrireJsonLd(this.document, 'ld-page', null);
      if (this.index) this.ecrireFilSeul(chemin);
      return;
    }
    const racine = `https://ndawik.com${this.p}`;
    const etapes = this.etapesFil(chemin);
    const avecFaq = !this.pharmacie;
    ecrireJsonLd(this.document, 'ld-page', pageAnnuaire({
      url: `${racine}${chemin}${this.communeSlug && this.nomCommune ? '/' + this.communeSlug : ''}`,
      nom: this.titre,
      description: this.description,
      langue: this.ar ? 'ar' : 'fr',
      specialite: this.specialite && !this.pharmacie ? this.nomS(this.specialite) : undefined,
      verifieLe: new Date().toISOString().slice(0, 10),
      etapes,
      praticiens: this.medecins().map((m) => ({
        nom: m.nomComplet,
        url: `https://ndawik.com${this.lien(m).join('/')}`,
        specialiteSlug: m.specialiteSlug,
        specialite: this.specialiteDe(m),
        ville: m.ville,
        region: this.regionDe(m),
      })),
      faq: avecFaq ? this.faqVisible() : undefined,
    }));
  }

  private regionDe(m: Medecin): string {
    const w = WILAYAS_SEO.find((x) => x.code === m.wilayaCode);
    return (w ? this.nomW(w) : m.wilayaFr) || '';
  }

  private etapesFil(chemin: string) {
    const racine = `https://ndawik.com${this.p}`;
    const etapes = [
      { nom: this.t.accueil, url: `https://ndawik.com${this.p || '/'}` },
      { nom: this.t.annuaire, url: `${racine}/specialites` },
    ];
    if (this.specialite) etapes.push({ nom: this.nomS(this.specialite), url: `${racine}/specialites/${this.specialite.slug}` });
    if (this.wilaya) etapes.push({ nom: this.nomW(this.wilaya), url: `${racine}${chemin}` });
    if (this.communeSlug && this.nomCommune) etapes.push({ nom: this.nomCommune, url: `${racine}${chemin}/${this.communeSlug}` });
    if (this.index) etapes.pop();
    return etapes;
  }

  /** Index : fil d'Ariane seul (pas de liste de praticiens). */
  private ecrireFilSeul(chemin: string) {
    ecrireJsonLd(this.document, 'ld-fil', fil(this.etapesFil(chemin)));
  }

  private lienCanonique(url: string) {
    let lien = this.document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!lien) {
      lien = this.document.createElement('link');
      lien.setAttribute('rel', 'canonical');
      this.document.head.appendChild(lien);
    }
    lien.setAttribute('href', url);
  }

  lien(m: Medecin) {
    const l = lienPraticien(m);
    return this.ar ? ['/ar' + l[0], ...l.slice(1)] : l;
  }

  initiales(m: Medecin): string {
    const mots = (m.nomComplet || '').replace(/^(Dr|Dre|Docteur|Pr|Professeur)\.?\s+/i, '').trim().split(/\s+/);
    return mots.filter((x) => /\p{L}/u.test(x[0] || '')).slice(0, 2).map((x) => x[0].toUpperCase()).join('') || '•';
  }
}

/** Les elements principaux d'abord (dans l'ordre donne), puis les autres dans l'ordre d'origine. */
function trierAvecPrincipales<T>(liste: T[], cle: (t: T) => string, principales: string[]): T[] {
  const tete = principales.map((p) => liste.find((t) => cle(t) === p)).filter((t): t is T => !!t);
  return [...tete, ...liste.filter((t) => !principales.includes(cle(t)))];
}

/** « de » + nom, avec élision devant une voyelle ou un h muet : « de Béjaïa », « d'Alger », « d'Oran ». */
export function dePlace(nom: string): string {
  return /^[AEIOUHÀÂÄÉÈÊËÎÏÔÖÙÛÜ]/i.test(nom.trim()) ? `d'${nom}` : `de ${nom}`;
}

/** Textes propres aux pages commune (FR / AR). */
const TEXTES_COMMUNE = {
  fr: {
    titre: (s: string, c: string, w: string) => `${s} à ${c} (${w})`,
    sousTitre: (s: string, c: string) => `Praticiens : ${s} à ${c}`,
    cible: (s: string, c: string, a: string) => `avec ${a} à ${c}`,
    intro: (s: string, c: string, w: string, n: number) =>
      `${n} praticiens (${s}) exercent à ${c}, dans la wilaya ${dePlace(w)}. Consultez leur fiche, comparez et prenez rendez-vous en ligne avec Ndawik.`,
    description: (s: string, c: string, w: string, n: number) =>
      `${s} à ${c} (${w}) : ${n} praticiens référencés sur Ndawik. Consultez les fiches et prenez rendez-vous en ligne.`,
    communes: (s: string, w: string) => `${s} dans les communes ${dePlace(w)}`,
    voisines: (s: string, w: string) => `${s} dans les communes voisines (${w})`,
    toute: (s: string, w: string) => `Voir tous les praticiens (${s}) ${dePlace(w)}`,
    titreCommune: (s: string, c: string, w: string) => `${s} à ${c} (${w})`,
  },
  ar: {
    titre: (s: string, c: string, w: string) => `${s} في ${c} (${w})`,
    sousTitre: (s: string, c: string) => `الأطباء: ${s} في ${c}`,
    cible: (s: string, c: string, _a: string) => `مع ${s} في ${c}`,
    intro: (s: string, c: string, w: string, n: number) =>
      `${n} من الأطباء (${s}) يمارسون في ${c} بولاية ${w}. اطّلع على ملفاتهم واحجز موعدك عبر نداويك.`,
    description: (s: string, c: string, w: string, n: number) =>
      `${s} في ${c} (${w}): ${n} من الأطباء على نداويك. اطّلع على الملفات واحجز موعدك عبر الإنترنت.`,
    communes: (s: string, w: string) => `${s} في بلديات ${w}`,
    voisines: (s: string, w: string) => `${s} في البلديات المجاورة (${w})`,
    toute: (s: string, w: string) => `كل الأطباء (${s}) في ${w}`,
    titreCommune: (s: string, c: string, w: string) => `${s} في ${c} (${w})`,
  },
};
