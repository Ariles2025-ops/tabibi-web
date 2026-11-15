import { Component, DestroyRef, OnInit, PLATFORM_ID, inject, signal } from '@angular/core';
import { CommonModule, DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AnnuaireService, Medecin } from '../annuaire/annuaire.service';
import {
  SPECIALITES_PRINCIPALES, SPECIALITES_SEO, SpecialiteSeo, WILAYAS_PRINCIPALES, WILAYAS_SEO, WilayaSeo, lienPraticien,
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
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <main class="seo">
      <nav class="seo-fil" aria-label="Fil d'Ariane">
        <a routerLink="/">Accueil</a><span>›</span>
        <a routerLink="/specialites">Annuaire</a>
        <ng-container *ngIf="specialite"><span>›</span>
          <a [routerLink]="['/specialites', specialite.slug]">{{ specialite.nom }}</a></ng-container>
        <ng-container *ngIf="wilaya"><span>›</span><span aria-current="page">{{ wilaya.nom }}</span></ng-container>
      </nav>

      <header class="seo-tete">
        <h1>{{ titre }}</h1>
        <p>{{ intro }}</p>
      </header>

      <!-- Index : toutes les specialites et toutes les wilayas -->
      <ng-container *ngIf="index">
        <section class="seo-bloc">
          <h2>Spécialités <small>{{ specialitesAlpha.length }}</small></h2>
          <div class="seo-cartes">
            <a *ngFor="let s of specialitesAlpha" [routerLink]="['/specialites', s.slug]" class="seo-carte">
              <span class="seo-carte__ic" aria-hidden="true"><i class="fa fa-stethoscope"></i></span>{{ s.nom }}
            </a>
          </div>
        </section>
        <section class="seo-bloc">
          <h2>Wilayas <small>{{ wilayasAlpha.length }}</small></h2>
          <div class="seo-colonnes">
            <a *ngFor="let w of wilayasAlpha" [routerLink]="['/wilayas', w.slug]" [attr.title]="'Médecins à ' + w.nom">
              {{ w.nom }}<span class="seo-code">{{ w.code }}</span></a>
          </div>
        </section>
      </ng-container>

      <!-- Liste des medecins -->
      <section class="seo-bloc" *ngIf="!index && !introuvable">
        <div class="seo-entete">
          <h2>{{ sousTitre }}</h2>
          <span *ngIf="!charge() && medecins().length" class="seo-nb">
            {{ medecins().length >= 50 ? '50 premiers résultats' : medecins().length + (medecins().length > 1 ? ' praticiens' : ' praticien') }}
          </span>
        </div>
        <p *ngIf="charge()" class="seo-muet">Chargement des praticiens…</p>
        <p *ngIf="!charge() && erreur()" class="seo-muet">La liste n'a pas pu être chargée. Réessayez dans un instant.</p>
        <p *ngIf="!charge() && !erreur() && medecins().length === 0" class="seo-muet">
          Aucun praticien référencé pour le moment. Consultez les wilayas ou spécialités voisines ci-dessous.
        </p>
        <ul class="seo-medecins">
          <li *ngFor="let m of medecins()">
            <a [routerLink]="lien(m)" class="seo-med">
              <span class="seo-ava" aria-hidden="true">{{ initiales(m) }}</span>
              <span class="seo-med__txt">
                <strong dir="auto">{{ m.nomComplet }}</strong>
                <small>{{ m.specialiteFr }} · {{ m.ville || m.wilayaFr }}<ng-container *ngIf="m.ville && m.wilayaFr && m.ville !== m.wilayaFr"> ({{ m.wilayaFr }})</ng-container></small>
              </span>
              <span *ngIf="m.reservable" class="seo-resa">Réservable en ligne</span>
            </a>
          </li>
        </ul>
        <p class="seo-note">La fiche complète et la prise de rendez-vous sont accessibles avec un compte Tabibi gratuit.</p>
      </section>

      <p *ngIf="introuvable" class="seo-muet">Cette page n'existe pas. <a routerLink="/specialites">Voir toutes les spécialités</a></p>

      <!-- Maillage : autres wilayas pour cette specialite -->
      <section class="seo-bloc" *ngIf="specialite && !introuvable">
        <h2>{{ specialite.nom }} dans une autre wilaya</h2>
        <div class="seo-colonnes">
          <a *ngFor="let w of wilayasAlpha" [routerLink]="['/specialites', specialite.slug, w.slug]"
             [class.actif]="w.slug === wilaya?.slug" [attr.title]="specialite.nom + ' à ' + w.nom">
            {{ w.nom }}<span class="seo-code">{{ w.code }}</span></a>
        </div>
      </section>

      <!-- Maillage : autres specialites dans cette wilaya -->
      <section class="seo-bloc" *ngIf="wilaya && !introuvable">
        <h2>{{ specialite ? 'Autres spécialités' : 'Spécialités' }} à {{ wilaya.nom }}</h2>
        <div class="seo-colonnes">
          <a *ngFor="let s of specialitesAlpha" [routerLink]="['/specialites', s.slug, wilaya.slug]"
             [class.actif]="s.slug === specialite?.slug" [attr.title]="s.nom + ' à ' + wilaya.nom">{{ s.nom }}</a>
        </div>
      </section>

      <section class="seo-faq" *ngIf="!index && !introuvable">
        <h2>Questions fréquentes</h2>
        <details><summary>Comment prendre rendez-vous {{ cible }} ?</summary>
          <p>Créez un compte Tabibi gratuit, ouvrez la fiche du praticien et choisissez un créneau disponible. La confirmation est immédiate.</p></details>
        <details><summary>Faut-il payer en ligne ?</summary>
          <p>Non. La consultation se règle au cabinet, en espèces ou avec la carte Chifa selon le praticien. Aucun prépaiement n'est demandé.</p></details>
        <details><summary>Je suis praticien, comment apparaître ici ?</summary>
          <p>Rendez-vous sur <a routerLink="/praticien">Vous êtes praticien ?</a> pour retrouver votre fiche et créer votre compte.</p></details>
      </section>
    </main>
  `,
  styles: [`
    .seo { max-width:1100px; margin:0 auto; padding:24px var(--gutter, 16px) 48px; color:var(--ink); }
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
    .seo-ava { flex:none; width:44px; height:44px; border-radius:14px; background:#E7F1EC; color:var(--vert); font-weight:800; display:grid; place-items:center; }
    .seo-med__txt { flex:1; min-width:0; display:flex; flex-direction:column; gap:2px; }
    .seo-med__txt strong { font-size:15px; overflow-wrap:anywhere; }
    .seo-med__txt small { color:var(--text3); font-size:13px; }
    .seo-resa { font-size:12px; font-weight:700; color:var(--vert); background:#E7F1EC; padding:3px 10px; border-radius:999px; }
    .seo-note { color:var(--text3); font-size:13px; margin:14px 0 0; }
    .seo-liens { display:flex; flex-wrap:wrap; gap:8px; }
    .seo-bloc h2 small { font-size:13px; font-weight:700; color:var(--text3); margin-inline-start:6px; }
    .seo-cartes { display:grid; grid-template-columns:repeat(auto-fill,minmax(min(100%,210px),1fr)); gap:10px; }
    .seo-carte { display:flex; align-items:center; gap:10px; padding:12px 14px; background:#fff; border:1px solid var(--border); border-radius:14px; color:var(--ink); text-decoration:none; font-weight:600; font-size:14px; }
    .seo-carte:hover { border-color:var(--vert); color:var(--vert); }
    .seo-carte__ic { flex:none; width:32px; height:32px; border-radius:10px; background:#E7F1EC; color:var(--vert); display:grid; place-items:center; font-size:13px; }
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
  `],
})
export class AnnuaireSeoComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private annuaire = inject(AnnuaireService);
  private title = inject(Title);
  private meta = inject(Meta);
  private document = inject(DOCUMENT);
  private navigateur = isPlatformBrowser(inject(PLATFORM_ID));
  private destroyRef = inject(DestroyRef);

  readonly specialites: SpecialiteSeo[] = trierAvecPrincipales(SPECIALITES_SEO, (s) => s.slug, SPECIALITES_PRINCIPALES);
  readonly wilayas: WilayaSeo[] = trierAvecPrincipales(WILAYAS_SEO, (w) => w.code, WILAYAS_PRINCIPALES);

  /** Listes completes, par ordre alphabetique (maillage lisible). */
  readonly specialitesAlpha = [...SPECIALITES_SEO].sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
  readonly wilayasAlpha = [...WILAYAS_SEO].sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));

  specialite: SpecialiteSeo | null = null;
  wilaya: WilayaSeo | null = null;
  index = false;
  introuvable = false;
  titre = '';
  sousTitre = '';
  intro = '';
  cible = '';

  medecins = signal<Medecin[]>([]);
  charge = signal(false);
  erreur = signal(false);

  ngOnInit() {
    const abonnement = this.route.paramMap.subscribe((p) => this.afficher(p.get('specialite'), p.get('wilaya')));
    this.destroyRef.onDestroy(() => abonnement.unsubscribe());
  }

  private afficher(specSlug: string | null, wilSlug: string | null) {
    this.specialite = specSlug ? SPECIALITES_SEO.find((s) => s.slug === specSlug) ?? null : null;
    this.wilaya = wilSlug ? WILAYAS_SEO.find((w) => w.slug === wilSlug) ?? null : null;
    this.introuvable = (!!specSlug && !this.specialite) || (!!wilSlug && !this.wilaya);
    this.index = !specSlug && !wilSlug;
    this.medecins.set([]);
    // Page de liste : « Chargement » des le rendu serveur (sinon « Aucun praticien » s'afficherait un instant).
    this.charge.set(!(!specSlug && !wilSlug));

    const s = this.specialite, w = this.wilaya;
    let chemin = '/specialites';
    let description: string;
    if (this.introuvable) {
      this.titre = 'Page introuvable';
      this.intro = '';
      description = "Cette page de l'annuaire Tabibi n'existe pas.";
    } else if (this.index) {
      this.titre = 'Annuaire des médecins en Algérie';
      this.intro = 'Retrouvez les praticiens référencés sur Tabibi par spécialité ou par wilaya, puis prenez rendez-vous en ligne gratuitement.';
      description = "Annuaire Tabibi : toutes les spécialités médicales et les 69 wilayas d'Algérie. Trouvez un médecin et prenez rendez-vous en ligne.";
    } else if (s && w) {
      chemin = `/specialites/${s.slug}/${w.slug}`;
      this.titre = `${s.nom} à ${w.nom}`;
      this.cible = `avec un ${s.nom.toLowerCase()} à ${w.nom}`;
      this.sousTitre = `Praticiens : ${s.nom} à ${w.nom}`;
      this.intro = `Trouvez un ${s.nom.toLowerCase()} à ${w.nom} et prenez rendez-vous en ligne avec Tabibi. Paiement au cabinet, rappel avant le rendez-vous.`;
      description = `${s.nom} à ${w.nom} : liste des praticiens référencés sur Tabibi. Prenez rendez-vous en ligne, paiement au cabinet.`;
    } else if (s) {
      chemin = `/specialites/${s.slug}`;
      this.titre = `${s.nom} en Algérie`;
      this.cible = `avec un ${s.nom.toLowerCase()}`;
      this.sousTitre = `Praticiens : ${s.nom}`;
      this.intro = `Trouvez un ${s.nom.toLowerCase()} près de chez vous, dans toutes les wilayas d'Algérie, et prenez rendez-vous en ligne avec Tabibi.`;
      description = `${s.nom} en Algérie : praticiens référencés sur Tabibi dans les 69 wilayas. Choisissez votre wilaya et prenez rendez-vous en ligne.`;
    } else {
      chemin = `/wilayas/${w!.slug}`;
      this.titre = `Médecins à ${w!.nom}`;
      this.cible = `avec un médecin à ${w!.nom}`;
      this.sousTitre = `Praticiens à ${w!.nom}`;
      this.intro = `Généralistes, spécialistes et dentistes à ${w!.nom} : trouvez un praticien et prenez rendez-vous en ligne avec Tabibi.`;
      description = `Médecins à ${w!.nom} : praticiens référencés sur Tabibi, toutes spécialités. Prenez rendez-vous en ligne, paiement au cabinet.`;
    }

    this.title.setTitle(`${this.titre} — prendre rendez-vous | Tabibi`);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ property: 'og:title', content: `${this.titre} | Tabibi` });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ name: 'robots', content: this.introuvable ? 'noindex' : 'index, follow' });
    this.lienCanonique(`https://tabibi.doctor${chemin}`);

    // La liste vient de l API publique ; elle est aussi rendue cote serveur pour les moteurs de recherche.
    if (!this.index && !this.introuvable) {
      this.charge.set(true);
      this.erreur.set(false);
      this.annuaire.rechercher(s?.slug, w?.code).subscribe({
        next: (liste) => { this.medecins.set(liste); this.charge.set(false); },
        error: () => { this.erreur.set(true); this.charge.set(false); },
      });
    }
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
    return lienPraticien(m);
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
