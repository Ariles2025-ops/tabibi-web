import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AnnuaireService, Medecin } from '../annuaire/annuaire.service';
import { libelleLangue } from '../fiche-medecin/fiche-infos';
import { SPECIALITES_SEO, liensLangues, lienPraticien, slugifier, wilayaParCode } from './referentiel-seo';
import { StatutHttpService } from './statut-http';
import { ecrireJsonLd, fil, typeSchemaOrg } from './donnees-structurees';

/**
 * Page publique et referencee d'un praticien : /praticiens/:id/:slug (une page par fiche de l'annuaire).
 * Identite, specialite et lieu, bouton vers la fiche complete (disponibilites et reservation, avec compte),
 * maillage vers les confreres de la meme specialite et wilaya. Rendue cote serveur pour les moteurs de recherche.
 */
/** Identifiant d'un praticien : UUID. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Component({
    selector: 'app-praticien-public',
    imports: [CommonModule, RouterLink],
    template: `
    <main class="pp" [attr.dir]="ar ? 'rtl' : null" [attr.lang]="ar ? 'ar' : 'fr'">
      <p *ngIf="charge()" class="pp-muet">{{ ar ? 'جارٍ التحميل…' : 'Chargement…' }}</p>

      <ng-container *ngIf="!charge() && !medecin()">
        <h1>{{ ar ? 'الطبيب غير موجود' : 'Praticien introuvable' }}</h1>
        <p class="pp-muet">{{ ar ? 'هذه الصفحة لم تعد موجودة.' : "Cette fiche n'existe plus." }}
          <a [routerLink]="p + '/specialites'">{{ ar ? 'ابحث عن طبيب' : 'Trouver un médecin' }}</a></p>
      </ng-container>

      <ng-container *ngIf="medecin() as m">
        <div class="pp-haut">
          <nav class="pp-fil" [attr.aria-label]="ar ? 'مسار التصفح' : 'Fil d’Ariane'">
            <a routerLink="/">{{ ar ? 'الرئيسية' : 'Accueil' }}</a><span>›</span>
            <a [routerLink]="p + '/specialites'">{{ ar ? 'الأطباء' : 'Médecins' }}</a>
            <ng-container *ngIf="specialiteConnue"><span>›</span>
              <a [routerLink]="[p + '/specialites', m.specialiteSlug]">{{ specialite }}</a></ng-container>
            <ng-container *ngIf="specialiteConnue && wilayaSlug"><span>›</span>
              <a [routerLink]="[p + '/specialites', m.specialiteSlug, wilayaSlug]">{{ wilaya }}</a></ng-container>
          </nav>
          <a class="pp-langue" [routerLink]="lienAutreLangue" [attr.hreflang]="ar ? 'fr' : 'ar'" [attr.lang]="ar ? 'fr' : 'ar'">{{ ar ? 'Français' : 'العربية' }}</a>
        </div>

        <section class="pp-carte">
          <div class="pp-id">
            <span class="pp-ava" aria-hidden="true">{{ initiales(m) }}</span>
            <div class="pp-id__txt">
              <h1 dir="auto">{{ m.nomComplet }}</h1>
              <p>{{ specialite }}<ng-container *ngIf="lieu"> · {{ lieu }}</ng-container></p>
              <span *ngIf="m.reservable" class="pp-resa">{{ ar ? 'الحجز متاح عبر الإنترنت' : 'Réservable en ligne' }}</span>
            </div>
          </div>
          <div class="pp-action">
            <a class="bouton pp-btn" [routerLink]="['/medecins', m.id]">{{ ar ? 'احجز موعدًا' : 'Prendre rendez-vous' }}</a>
            <small>{{ ar ? 'المواعيد المتاحة والحجز بحساب طبيبي مجاني. الدفع في العيادة.' : 'Disponibilités et réservation avec un compte Tabibi gratuit. Paiement au cabinet.' }}</small>
          </div>
        </section>

        <section class="pp-bloc">
          <h2>{{ ar ? 'معلومات' : 'Informations' }}</h2>
          <dl class="pp-infos">
            <div><dt>{{ ar ? 'التخصص' : 'Spécialité' }}</dt><dd>{{ specialite }}</dd></div>
            <div *ngIf="m.ville && !ar"><dt>Ville</dt><dd>{{ m.ville }}</dd></div>
            <div *ngIf="wilaya"><dt>{{ ar ? 'الولاية' : 'Wilaya' }}</dt><dd>{{ wilaya }}</dd></div>
            <div *ngIf="m.adresse"><dt>{{ ar ? 'العنوان' : 'Adresse' }}</dt><dd dir="auto">{{ m.adresse }}</dd></div>
            <div *ngIf="m.telephoneCabinet"><dt>{{ ar ? 'هاتف العيادة' : 'Téléphone' }}</dt><dd dir="ltr"><a [href]="'tel:' + m.telephoneCabinet">{{ m.telephoneCabinet }}</a></dd></div>
            <div *ngIf="m.horaires"><dt>{{ ar ? 'أوقات العمل' : 'Horaires' }}</dt><dd dir="auto">{{ m.horaires }}</dd></div>
            <div *ngIf="m.langues?.length"><dt>{{ ar ? 'اللغات' : 'Langues' }}</dt><dd>{{ langues(m.langues) }}</dd></div>
            <div><dt>{{ ar ? 'الدفع' : 'Paiement' }}</dt><dd>{{ ar ? 'في العيادة (نقدًا أو ببطاقة الشفاء حسب الطبيب)' : 'Au cabinet (espèces ou carte Chifa selon le praticien)' }}</dd></div>
          </dl>
        </section>

        <section class="pp-bloc" *ngIf="m.presentation">
          <h2>{{ ar ? 'تقديم' : 'Présentation' }}</h2>
          <p dir="auto" style="white-space:pre-line">{{ m.presentation }}</p>
        </section>

        <section class="pp-bloc" *ngIf="confreres().length">
          <h2>{{ ar ? 'أطباء آخرون' : 'Autres praticiens' }} : {{ specialite }}<ng-container *ngIf="wilaya"> {{ ar ? 'في' : 'à' }} {{ wilaya }}</ng-container></h2>
          <ul class="pp-confreres">
            <li *ngFor="let c of confreres()">
              <a [routerLink]="lien(c)"><strong dir="auto">{{ c.nomComplet }}</strong><small dir="auto">{{ ar ? wilaya : (c.ville || c.wilayaFr) }}</small></a>
            </li>
          </ul>
          <p *ngIf="specialiteConnue && wilayaSlug" class="pp-plus">
            <a [routerLink]="[p + '/specialites', m.specialiteSlug, wilayaSlug]">{{ ar ? 'عرض الكل' : 'Voir tous' }} : {{ specialite }} {{ ar ? 'في' : 'à' }} {{ wilaya }} {{ ar ? '←' : '→' }}</a>
          </p>
        </section>

        <section class="pp-bloc" *ngIf="wilayaSlug">
          <h2>{{ ar ? 'ابحث عن طبيب آخر' : 'Trouver un autre praticien' }}</h2>
          <div class="pp-liens">
            <a [routerLink]="[p + '/wilayas', wilayaSlug]">{{ ar ? 'جميع الأطباء في ' + wilaya : 'Tous les médecins à ' + wilaya }}</a>
            <a *ngIf="specialiteConnue" [routerLink]="[p + '/specialites', m.specialiteSlug]">{{ specialite }} {{ ar ? 'في الجزائر' : 'en Algérie' }}</a>
            <a [routerLink]="p + '/specialites'">{{ ar ? 'جميع التخصصات' : 'Toutes les spécialités' }}</a>
          </div>
        </section>
      </ng-container>
    </main>
  `,
    styles: [`
    .pp { max-width:960px; margin:0 auto; padding:24px var(--gutter, 16px) 48px; color:var(--ink); }
    .pp-muet { color:var(--text3); }
    .pp-haut { display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap; margin-bottom:18px; }
    .pp-haut .pp-fil { margin-bottom:0; }
    .pp-langue { padding:6px 14px; border:1px solid var(--border); border-radius:999px; background:#fff; color:var(--vert); font-weight:700; font-size:13px; text-decoration:none; }
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
  `]
})
export class PraticienPublicComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private annuaire = inject(AnnuaireService);
  private title = inject(Title);
  private meta = inject(Meta);
  private document = inject(DOCUMENT);
  private destroyRef = inject(DestroyRef);
  private statut = inject(StatutHttpService);

  medecin = signal<(Medecin & { reservable?: boolean }) | null>(null);
  confreres = signal<Medecin[]>([]);
  charge = signal(true);
  specialiteConnue = false;
  /** Langue de la page (donnee de route) : prefixe '' en francais, '/ar' en arabe. */
  ar = false;
  p = '';
  specialite = '';
  wilaya = '';
  lienAutreLangue = '/';
  wilayaSlug: string | null = null;
  lieu = '';

  langues(codes: string[] | null | undefined): string {
    return (codes ?? []).map((c) => libelleLangue(c, this.ar)).join(this.ar ? '، ' : ', ');
  }

  ngOnInit() {
    this.ar = this.route.snapshot.data['langue'] === 'ar';
    this.p = this.ar ? '/ar' : '';
    const abonnement = this.route.paramMap.subscribe((p) => this.charger(p.get('id') || ''));
    this.destroyRef.onDestroy(() => abonnement.unsubscribe());
  }

  lien(m: Medecin) {
    const l = lienPraticien(m);
    return this.ar ? ['/ar' + l[0], ...l.slice(1)] : l;
  }

  private charger(id: string) {
    this.medecin.set(null);
    this.confreres.set([]);
    if (!UUID.test(id)) {
      // Identifiant mal forme : inutile d'interroger l'API (qui repondrait 400), vraie 404 au rendu serveur.
      this.charge.set(false);
      this.statut.introuvable();
      this.title.setTitle('Praticien introuvable | Tabibi');
      this.meta.updateTag({ name: 'robots', content: 'noindex' });
      return;
    }
    this.charge.set(true);
    this.annuaire.medecin(id).subscribe({
      next: (m) => {
        this.medecin.set(m);
        this.charge.set(false);
        const spec = SPECIALITES_SEO.find((s) => s.slug === m.specialiteSlug);
        const wil = wilayaParCode(m.wilayaCode);
        this.specialiteConnue = !!spec;
        this.wilayaSlug = wil?.slug ?? null;
        this.specialite = spec ? (this.ar ? spec.nomAr : spec.nom) : m.specialiteFr;
        this.wilaya = wil ? (this.ar ? wil.nomAr : wil.nom) : (m.wilayaFr || '');
        this.lieu = this.ar
          ? this.wilaya
          : (m.ville && m.wilayaFr && m.ville !== m.wilayaFr ? `${m.ville} (${m.wilayaFr})` : (m.ville || m.wilayaFr || ''));
        this.referencer(m);
        this.annuaire.rechercher(m.specialiteSlug, m.wilayaCode).subscribe({
          next: (liste) => this.confreres.set(liste.filter((c) => c.id !== m.id).slice(0, 12)),
          error: () => undefined,
        });
      },
      error: (e: { status?: number }) => {
        this.charge.set(false);
        // Fiche inexistante : vraie 404 au rendu serveur (une API indisponible ne doit pas desindexer la page).
        if (e?.status === 404) this.statut.introuvable();
        this.title.setTitle('Praticien introuvable | Tabibi');
        this.meta.updateTag({ name: 'robots', content: 'noindex' });
      },
    });
  }

  private referencer(m: Medecin) {
    const ou = this.lieu ? (this.ar ? ` في ${this.lieu}` : ` à ${this.lieu}`) : '';
    const titre = `${m.nomComplet} — ${this.specialite}${ou}`;
    const description = this.ar
      ? `${m.nomComplet}، ${this.specialite}${ou}. اطّلع على صفحة الطبيب واحجز موعدك عبر الإنترنت مع طبيبي. الدفع في العيادة.`
      : `${m.nomComplet}, ${this.specialite}${ou}. Consultez la fiche et prenez rendez-vous en ligne avec Tabibi. Paiement au cabinet.`;
    const chemin = `/praticiens/${m.id}/${slugifier(m.nomComplet)}`;
    const url = `https://tabibi.doctor${this.p}${chemin}`;
    this.lienAutreLangue = (this.ar ? '' : '/ar') + chemin;
    liensLangues(this.document, chemin);
    this.document.documentElement.setAttribute('lang', this.ar ? 'ar' : 'fr');
    this.meta.updateTag({ property: 'og:locale', content: this.ar ? 'ar_DZ' : 'fr_DZ' });
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

    // Donnees structurees schema.org : fiche (Physician / Dentist / Pharmacy) et fil d'Ariane.
    const racine = 'https://tabibi.doctor';
    const donnees = {
      '@context': 'https://schema.org',
      '@type': typeSchemaOrg(m.specialiteSlug),
      name: m.nomComplet,
      medicalSpecialty: this.specialite,
      inLanguage: this.ar ? 'ar' : 'fr',
      url,
      address: {
        '@type': 'PostalAddress',
        addressLocality: this.ar ? this.wilaya : (m.ville || m.wilayaFr),
        addressRegion: this.wilaya || m.wilayaFr,
        addressCountry: 'DZ',
      },
    };
    ecrireJsonLd(this.document, 'ld-praticien', donnees);
    const etapes = [{ nom: this.ar ? 'الرئيسية' : 'Accueil', url: `${racine}${this.p || '/'}` }];
    if (this.specialiteConnue) etapes.push({ nom: this.specialite, url: `${racine}${this.p}/specialites/${m.specialiteSlug}` });
    if (this.specialiteConnue && this.wilayaSlug) {
      etapes.push({ nom: this.wilaya, url: `${racine}${this.p}/specialites/${m.specialiteSlug}/${this.wilayaSlug}` });
    }
    etapes.push({ nom: m.nomComplet, url });
    ecrireJsonLd(this.document, 'ld-fil', fil(etapes));
  }

  initiales(m: Medecin): string {
    const mots = (m.nomComplet || '').replace(/^(Dr|Dre|Docteur|Pr|Professeur)\.?\s+/i, '').trim().split(/\s+/);
    return mots.filter((x) => /\p{L}/u.test(x[0] || '')).slice(0, 2).map((x) => x[0].toUpperCase()).join('') || '•';
  }
}
