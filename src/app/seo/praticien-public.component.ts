import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AnnuaireService, Medecin } from '../annuaire/annuaire.service';
import { SPECIALITES_SEO, lienPraticien, slugifier, wilayaParCode } from './referentiel-seo';

/**
 * Page publique et referencee d'un praticien : /praticiens/:id/:slug (une page par fiche de l'annuaire).
 * Identite, specialite et lieu, bouton vers la fiche complete (disponibilites et reservation, avec compte),
 * maillage vers les confreres de la meme specialite et wilaya. Rendue cote serveur pour les moteurs de recherche.
 */
@Component({
  selector: 'app-praticien-public',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <main class="pp">
      <p *ngIf="charge()" class="pp-muet">Chargement…</p>

      <ng-container *ngIf="!charge() && !medecin()">
        <h1>Praticien introuvable</h1>
        <p class="pp-muet">Cette fiche n'existe plus. <a routerLink="/specialites">Parcourir l'annuaire</a></p>
      </ng-container>

      <ng-container *ngIf="medecin() as m">
        <nav class="pp-fil" aria-label="Fil d'Ariane">
          <a routerLink="/">Accueil</a><span>›</span>
          <a routerLink="/specialites">Annuaire</a>
          <ng-container *ngIf="specialiteConnue"><span>›</span>
            <a [routerLink]="['/specialites', m.specialiteSlug]">{{ m.specialiteFr }}</a></ng-container>
          <ng-container *ngIf="specialiteConnue && wilayaSlug"><span>›</span>
            <a [routerLink]="['/specialites', m.specialiteSlug, wilayaSlug]">{{ m.wilayaFr }}</a></ng-container>
        </nav>

        <section class="pp-carte">
          <div class="pp-id">
            <span class="pp-ava" aria-hidden="true">{{ initiales(m) }}</span>
            <div class="pp-id__txt">
              <h1 dir="auto">{{ m.nomComplet }}</h1>
              <p>{{ m.specialiteFr }}<ng-container *ngIf="lieu"> · {{ lieu }}</ng-container></p>
              <span *ngIf="m.reservable" class="pp-resa">Réservable en ligne</span>
            </div>
          </div>
          <div class="pp-action">
            <a class="bouton pp-btn" [routerLink]="['/medecins', m.id]">Prendre rendez-vous</a>
            <small>Disponibilités et réservation avec un compte Tabibi gratuit. Paiement au cabinet.</small>
          </div>
        </section>

        <section class="pp-bloc">
          <h2>Informations</h2>
          <dl class="pp-infos">
            <div><dt>Spécialité</dt><dd>{{ m.specialiteFr }}</dd></div>
            <div *ngIf="m.ville"><dt>Ville</dt><dd>{{ m.ville }}</dd></div>
            <div *ngIf="m.wilayaFr"><dt>Wilaya</dt><dd>{{ m.wilayaFr }}</dd></div>
            <div><dt>Paiement</dt><dd>Au cabinet (espèces ou carte Chifa selon le praticien)</dd></div>
          </dl>
        </section>

        <section class="pp-bloc" *ngIf="confreres().length">
          <h2>Autres praticiens : {{ m.specialiteFr }}<ng-container *ngIf="m.wilayaFr"> à {{ m.wilayaFr }}</ng-container></h2>
          <ul class="pp-confreres">
            <li *ngFor="let c of confreres()">
              <a [routerLink]="lien(c)"><strong dir="auto">{{ c.nomComplet }}</strong><small>{{ c.ville || c.wilayaFr }}</small></a>
            </li>
          </ul>
          <p *ngIf="specialiteConnue && wilayaSlug" class="pp-plus">
            <a [routerLink]="['/specialites', m.specialiteSlug, wilayaSlug]">Voir tous : {{ m.specialiteFr }} à {{ m.wilayaFr }} →</a>
          </p>
        </section>

        <section class="pp-bloc" *ngIf="wilayaSlug">
          <h2>Trouver un autre praticien</h2>
          <div class="pp-liens">
            <a [routerLink]="['/wilayas', wilayaSlug]">Tous les médecins à {{ m.wilayaFr }}</a>
            <a *ngIf="specialiteConnue" [routerLink]="['/specialites', m.specialiteSlug]">{{ m.specialiteFr }} en Algérie</a>
            <a routerLink="/specialites">Toutes les spécialités</a>
          </div>
        </section>
      </ng-container>
    </main>
  `,
  styles: [`
    .pp { max-width:960px; margin:0 auto; padding:24px var(--gutter, 16px) 48px; color:var(--ink); }
    .pp-muet { color:var(--text3); }
    .pp-fil { display:flex; flex-wrap:wrap; gap:6px; font-size:13px; color:var(--text3); margin-bottom:18px; }
    .pp-fil a { color:var(--vert); text-decoration:none; font-weight:600; }
    .pp-carte { display:flex; justify-content:space-between; align-items:center; gap:20px; flex-wrap:wrap; background:#fff; border:1px solid var(--border); border-radius:20px; box-shadow:var(--s2); padding:24px; margin-bottom:28px; }
    .pp-id { display:flex; gap:16px; align-items:center; min-width:0; flex:1 1 320px; }
    .pp-ava { flex:none; width:72px; height:72px; border-radius:20px; background:#E7F1EC; color:var(--vert); font-weight:800; font-size:24px; display:grid; place-items:center; }
    .pp-id__txt { min-width:0; }
    .pp-id h1 { margin:0 0 4px; font-size:clamp(1.4rem,3vw,1.9rem); font-weight:800; letter-spacing:-.02em; overflow-wrap:anywhere; }
    .pp-id p { margin:0; color:var(--text3); }
    .pp-resa { display:inline-block; margin-top:8px; font-size:12px; font-weight:700; color:var(--vert); background:#E7F1EC; padding:3px 10px; border-radius:999px; }
    .pp-action { display:flex; flex-direction:column; gap:8px; align-items:flex-start; max-width:300px; }
    .pp-btn { text-decoration:none; }
    .pp-action small { color:var(--text3); font-size:12px; line-height:1.4; }
    .pp-bloc { margin-bottom:28px; }
    .pp-bloc h2 { font-size:1.1rem; font-weight:800; margin:0 0 12px; }
    .pp-infos { margin:0; display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:10px; }
    .pp-infos div { background:#fff; border:1px solid var(--border); border-radius:14px; padding:12px 14px; }
    .pp-infos dt { font-size:12px; color:var(--text3); font-weight:700; text-transform:uppercase; letter-spacing:.04em; }
    .pp-infos dd { margin:4px 0 0; font-weight:600; }
    .pp-confreres { list-style:none; padding:0; margin:0; display:grid; grid-template-columns:repeat(auto-fill,minmax(min(100%,240px),1fr)); gap:8px; }
    .pp-confreres a { display:flex; flex-direction:column; gap:2px; padding:10px 14px; background:#fff; border:1px solid var(--border); border-radius:12px; text-decoration:none; color:var(--ink); }
    .pp-confreres a:hover { border-color:var(--vert); }
    .pp-confreres small { color:var(--text3); }
    .pp-plus a, .pp-liens a { color:var(--vert); font-weight:700; text-decoration:none; }
    .pp-liens { display:flex; flex-wrap:wrap; gap:8px; }
    .pp-liens a { padding:7px 12px; border:1px solid var(--border); border-radius:999px; background:#fff; font-size:13px; }
  `],
})
export class PraticienPublicComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private annuaire = inject(AnnuaireService);
  private title = inject(Title);
  private meta = inject(Meta);
  private document = inject(DOCUMENT);
  private destroyRef = inject(DestroyRef);

  medecin = signal<(Medecin & { reservable?: boolean }) | null>(null);
  confreres = signal<Medecin[]>([]);
  charge = signal(true);
  specialiteConnue = false;
  wilayaSlug: string | null = null;
  lieu = '';

  ngOnInit() {
    const abonnement = this.route.paramMap.subscribe((p) => this.charger(p.get('id') || ''));
    this.destroyRef.onDestroy(() => abonnement.unsubscribe());
  }

  lien(m: Medecin) {
    return lienPraticien(m);
  }

  private charger(id: string) {
    this.charge.set(true);
    this.medecin.set(null);
    this.confreres.set([]);
    this.annuaire.medecin(id).subscribe({
      next: (m) => {
        this.medecin.set(m);
        this.charge.set(false);
        this.specialiteConnue = SPECIALITES_SEO.some((s) => s.slug === m.specialiteSlug);
        this.wilayaSlug = wilayaParCode(m.wilayaCode)?.slug ?? null;
        this.lieu = m.ville && m.wilayaFr && m.ville !== m.wilayaFr ? `${m.ville} (${m.wilayaFr})` : (m.ville || m.wilayaFr || '');
        this.referencer(m);
        this.annuaire.rechercher(m.specialiteSlug, m.wilayaCode).subscribe({
          next: (liste) => this.confreres.set(liste.filter((c) => c.id !== m.id).slice(0, 12)),
          error: () => undefined,
        });
      },
      error: () => {
        this.charge.set(false);
        this.title.setTitle('Praticien introuvable | Tabibi');
        this.meta.updateTag({ name: 'robots', content: 'noindex' });
      },
    });
  }

  private referencer(m: Medecin) {
    const ou = this.lieu ? ` à ${this.lieu}` : '';
    const titre = `${m.nomComplet} — ${m.specialiteFr}${ou}`;
    const description = `${m.nomComplet}, ${m.specialiteFr}${ou}. Consultez la fiche et prenez rendez-vous en ligne avec Tabibi. Paiement au cabinet.`;
    const url = `https://tabibi.doctor/praticiens/${m.id}/${slugifier(m.nomComplet)}`;
    this.title.setTitle(`${titre} | Tabibi`);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ name: 'robots', content: 'index, follow' });
    this.meta.updateTag({ property: 'og:title', content: titre });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:url', content: url });

    let canonique = this.document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonique) {
      canonique = this.document.createElement('link');
      canonique.setAttribute('rel', 'canonical');
      this.document.head.appendChild(canonique);
    }
    canonique.setAttribute('href', url);

    // Donnees structurees schema.org (Physician) pour les resultats enrichis.
    const donnees = {
      '@context': 'https://schema.org',
      '@type': 'Physician',
      name: m.nomComplet,
      medicalSpecialty: m.specialiteFr,
      url,
      address: { '@type': 'PostalAddress', addressLocality: m.ville || m.wilayaFr, addressRegion: m.wilayaFr, addressCountry: 'DZ' },
    };
    let script = this.document.head.querySelector<HTMLScriptElement>('script#ld-praticien');
    if (!script) {
      script = this.document.createElement('script');
      script.id = 'ld-praticien';
      script.type = 'application/ld+json';
      this.document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(donnees);
  }

  initiales(m: Medecin): string {
    const mots = (m.nomComplet || '').replace(/^(Dr|Dre|Docteur|Pr|Professeur)\.?\s+/i, '').trim().split(/\s+/);
    return mots.filter((x) => /\p{L}/u.test(x[0] || '')).slice(0, 2).map((x) => x[0].toUpperCase()).join('') || '•';
  }
}
