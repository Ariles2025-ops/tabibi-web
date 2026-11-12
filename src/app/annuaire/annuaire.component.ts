import { Component, OnDestroy, OnInit, PLATFORM_ID, inject, signal } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject, Subscription, catchError, debounceTime, distinctUntilChanged, map, of, switchMap } from 'rxjs';
import { AnnuaireService, Medecin } from './annuaire.service';

/**
 * Accueil public : le design (hero, cartes) est repris tel quel de l'ancien site
 * (legacy-accueil.css). Seules les donnees changent : la recherche interroge l'API v2.
 */
@Component({
  selector: 'app-annuaire',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <section class="hero-mobile">
      <div class="hz">
        <div class="hero-col-l">
          <div class="hero-badge"><span class="hero-dot" aria-hidden="true"></span><span>75 000+ médecins référencés en Algérie</span></div>
          <h1 class="hero-title">Votre santé ne devrait jamais attendre.</h1>
          <p class="hero-sub">Prenez rendez-vous avec un médecin partout en Algérie — 69 wilayas, 24h/24.</p>
          <div class="hero-search-wrap" style="position:relative">
            <i class="hero-si fa fa-search" aria-hidden="true"></i>
            <input class="hero-search" type="search" [(ngModel)]="q" (input)="surSaisie()" (focus)="surFocus()" (blur)="masquerBientot()"
                   placeholder="Dr. Benali, Cardiologie, Alger..." autocomplete="off" aria-label="Rechercher un médecin"
                   role="combobox" aria-autocomplete="list" aria-controls="ac-suggestions" [attr.aria-expanded]="suggestionsVisibles() && suggestions().length > 0">
            <ul id="ac-suggestions" class="ac-liste" role="listbox" *ngIf="suggestionsVisibles() && suggestions().length">
              <li *ngFor="let s of suggestions()" role="option">
                <a class="ac-item" [routerLink]="['/medecins', s.id]" (click)="choisirSuggestion()">
                  <span class="ac-nom" dir="auto">{{ s.nomComplet }}</span>
                  <span class="ac-meta">{{ s.specialiteFr }} · {{ s.wilayaFr }}</span>
                </a>
              </li>
            </ul>
          </div>
          <div class="v4-paynote"><i class="fa fa-credit-card" aria-hidden="true"></i> <span>Paiement au cabinet — espèces ou carte Chifa. Aucun prépaiement en ligne.</span></div>
        </div>

        <div class="hero-stats" *ngIf="!enRecherche">
          <div class="hero-stat"><div class="hs-n">75 000+</div><div class="hs-l">Médecins référencés</div></div>
          <div class="hero-stat"><div class="hs-n">69</div><div class="hs-l">Wilayas</div></div>
          <div class="hero-stat"><div class="hs-n">24/7</div><div class="hs-l">Réservation</div></div>
        </div>

        <div class="hero-visual" aria-hidden="true" *ngIf="!enRecherche">
          <div class="bookcard-ghost"></div>
          <div class="bookcard">
            <div class="bc-doc">
              <div class="bc-ava" style="display:flex;align-items:center;justify-content:center;background:#E7F1EC;color:#0E5F46;font-weight:800">SM</div>
              <div class="bc-id"><b>Dr. Sofiane M.</b><small>Généraliste · Constantine</small></div>
              <span class="bc-verified"><i class="fa fa-check"></i> <span>Vérifié</span></span>
            </div>
            <div class="bc-day">Aujourd'hui · 12 créneaux disponibles</div>
            <div class="bc-slots"><span dir="ltr">09:00</span><span dir="ltr">09:30</span><span class="sel" dir="ltr">10:30</span><span dir="ltr">11:00</span><span dir="ltr">14:00</span><span dir="ltr">15:30</span></div>
            <div class="bc-btn"><i class="fa fa-check"></i> <span>Confirmer le RDV</span> · <span dir="ltr">10:30</span></div>
            <div class="bc-note">Rappel SMS automatique · Paiement au cabinet</div>
          </div>
          <div class="badge-float bf1"><span class="dot" style="background:var(--blue)"><i class="fa fa-check"></i></span><span><b>RDV confirmé</b><small>Rappel SMS envoyé</small></span></div>
          <div class="badge-float bf2"><span class="dot" style="background:#D4A437"><i class="fa fa-star"></i></span><span><b>Médecin vérifié</b><small>Identité contrôlée</small></span></div>
        </div>
      </div>

      <a routerLink="/medecin/candidature" *ngIf="!enRecherche" style="display:flex;align-items:center;justify-content:space-between;margin-top:14px;padding:12px 14px;background:#fff;border:1.5px dashed var(--pastille-bd);border-radius:var(--r12);color:var(--ink);text-decoration:none;font-size:13px">
        <span><i class="fa fa-user-doctor" style="margin-right:6px;color:var(--blue)"></i> Vous êtes médecin ? Réclamez votre fiche</span>
        <i class="fa fa-arrow-right" style="opacity:.7"></i>
      </a>
    </section>

    <div class="v4strip" aria-label="Garanties Tabibi" *ngIf="!enRecherche">
      <div class="item"><i class="fa fa-shield-halved" aria-hidden="true"></i> <span>Médecins vérifiés</span></div>
      <div class="item"><i class="fa fa-calendar-check" aria-hidden="true"></i> <span>RDV en 30 secondes</span></div>
      <div class="item"><i class="fa fa-server" aria-hidden="true"></i> <span>Vos données protégées (loi 18-07)</span></div>
      <div class="item"><i class="fa fa-lock" aria-hidden="true"></i> <span>Paiement au cabinet</span></div>
    </div>

    <section class="dwh" id="sec-dawini" *ngIf="!enRecherche">
      <div class="dwh-card">
        <div class="dwh-l">
          <span class="dwh-new"><i class="fa fa-wand-magic-sparkles" aria-hidden="true"></i> <span>Nouveau</span></span>
          <h2><span class="dwh-name">Dawini</span> — trouvez votre médicament en pharmacie</h2>
          <p>Décrivez le médicament que vous cherchez, ajoutez la photo de l'ordonnance si besoin : les pharmacies partenaires de votre wilaya sont prévenues et vous répondent en direct.</p>
          <div class="dwh-points">
            <span><i class="fa fa-clock" aria-hidden="true"></i> <span>Disponibilité indiquée par la pharmacie</span></span>
            <span><i class="fa fa-location-dot" aria-hidden="true"></i> <span>Pharmacies de votre wilaya</span></span>
            <span><i class="fa fa-lock" aria-hidden="true"></i> <span>Vos coordonnées ne sont partagées qu'avec la pharmacie qui accepte</span></span>
          </div>
          <a class="btn btn-primary btn-lg dwh-cta" routerLink="/dawini"><i class="fa fa-prescription-bottle-medical" aria-hidden="true"></i> <span>Chercher un médicament</span></a>
        </div>
        <div class="dwh-r" aria-hidden="true">
          <div class="dwh-mock">
            <div class="dwh-mock-req"><i class="fa fa-pills"></i> Amoxicilline 1g <span class="b">Envoyée aux pharmacies</span></div>
            <div class="dwh-mock-resp">
              <div class="top">Pharmacie El Chifa <span class="ok"><i class="fa fa-check"></i> <span>Disponible</span></span></div>
              <small>Alger-Centre · générique disponible</small>
              <div class="dwh-mock-actions"><span><i class="fa fa-route"></i> <span>Itinéraire</span></span><span><i class="fa fa-phone"></i> <span>Appeler</span></span></div>
            </div>
            <div style="text-align:center;font-size:10px;letter-spacing:.7px;text-transform:uppercase;color:rgba(255,255,255,.78);font-weight:700">Aperçu — exemple</div>
          </div>
        </div>
      </div>
    </section>

    <section class="section" id="sec-docs">
      <div class="sec-head" style="display:flex;align-items:baseline;justify-content:space-between;gap:12px;padding:0 var(--gutter);margin-bottom:14px">
        <h2 class="sec-title">Médecins référencés en Algérie</h2>
        <span style="color:var(--text3);font-size:13px;font-weight:600" *ngIf="!charge() && resultats().length">{{ resultats().length }} affiché(s)</span>
      </div>

      <p *ngIf="charge()" style="padding:0 var(--gutter);color:var(--text3)">Recherche…</p>
      <p *ngIf="erreur()" style="padding:0 var(--gutter);color:#b3261e">
        {{ erreur() }}
        <button type="button" (click)="rechercher()" style="margin-left:8px;background:none;border:0;color:var(--vert);font-weight:700;text-decoration:underline;cursor:pointer;font:inherit;padding:0">Réessayer</button>
      </p>

      <div id="docs-list" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,300px),1fr));gap:14px;padding:0 var(--gutter)">
        <article class="doc-card fu" *ngFor="let m of resultats()" [routerLink]="['/medecins', m.id]" tabindex="0">
          <div class="doc-row">
            <div class="doc-ava">{{ initiales(m) }}</div>
            <div style="flex:1;min-width:0">
              <div class="doc-name" dir="auto">{{ m.nomComplet }}</div>
              <div class="doc-spec"><i class="fa fa-stethoscope fa-xs"></i>{{ m.specialiteFr }}</div>
              <div class="doc-loc"><i class="fa fa-location-dot fa-xs"></i>{{ m.ville || m.wilayaFr }} ({{ m.wilayaFr }})</div>
            </div>
          </div>
          <div class="doc-footer">
            <span></span>
            <span class="btn btn-sm doc-btn-ghost"><i class="fa fa-arrow-right"></i> Voir la fiche</span>
          </div>
        </article>
      </div>

      <p *ngIf="!charge() && !erreur() && resultats().length === 0" style="text-align:center;color:var(--text3);padding:32px var(--gutter)">
        Aucun médecin trouvé. Essayez un autre nom ou une autre wilaya.
      </p>
    </section>

    <section class="section" id="sec-avis" style="padding-top:0" *ngIf="!enRecherche">
      <div class="v4-revgrid">
        <figure class="v4-rev" style="grid-column:1 / -1;max-width:600px;margin:0 auto;text-align:center">
          <div style="font-size:22px;color:#D4A437;margin-bottom:8px" aria-hidden="true"><i class="fa fa-star"></i></div>
          <blockquote style="font-weight:800">Premiers avis à venir</blockquote>
          <figcaption style="justify-content:center">Chaque avis publié ici sera lié à un rendez-vous réel et vérifié.</figcaption>
        </figure>
      </div>
    </section>

    <div class="v4-tele" *ngIf="!enRecherche">
      <span class="ti"><i class="fa fa-video" aria-hidden="true"></i></span>
      <div>
        <h3>Téléconsultation <span class="v4-live">Disponible</span></h3>
        <p>Consultez à distance un praticien vérifié, où que vous soyez en Algérie. Choisissez un médecin qui propose la téléconsultation et réservez votre créneau.</p>
      </div>
      <a class="btn btn-primary cta" href="#sec-docs">Réserver une téléconsultation</a>
    </div>

    <section class="section" *ngIf="!enRecherche" style="background:#fff;border-top:1px solid var(--border);border-bottom:1px solid var(--border)">
      <div class="sec-hdr" style="padding-bottom:16px"><h2 class="sec-title" style="font-size:18px">Comment prendre RDV en ligne ?</h2></div>
      <div class="steps-col">
        <div class="step-row"><div class="step-num">1</div><div class="step-info"><div class="step-title">Recherchez</div><div class="step-desc">Filtrez par nom, ville ou spécialité.</div></div></div>
        <div class="step-row"><div class="step-num">2</div><div class="step-info"><div class="step-title">Réservez</div><div class="step-desc">Choisissez un créneau et confirmez votre RDV en ligne.</div></div></div>
        <div class="step-row" style="padding-bottom:0"><div class="step-num">3</div><div class="step-info"><div class="step-title">Consultez</div><div class="step-desc">Recevez un SMS de confirmation et rencontrez votre médecin.</div></div></div>
      </div>
    </section>

    <section class="section" id="sec-diff" style="padding-top:0" *ngIf="!enRecherche">
      <div class="v4-sechead">
        <span class="v4-eyebrow">La différence Tabibi</span>
        <h2>Pourquoi Tabibi, et pas un simple annuaire ?</h2>
      </div>
      <div class="v4-cmp" role="group" aria-label="Comparatif Tabibi vs annuaires classiques">
        <div class="v4-cmp-h"><span></span><strong>Tabibi</strong><span>Annuaires classiques</span></div>
        <div class="v4-cmp-r"><span>Identité, diplôme et cabinet vérifiés</span><strong class="y">✓</strong><span class="n">—</span></div>
        <div class="v4-cmp-r"><span>Données de santé protégées (loi 18-07)</span><strong class="y">✓</strong><span class="n">—</span></div>
        <div class="v4-cmp-r"><span>FR · AR · EN avec arabe RTL soigné</span><strong class="y">✓</strong><span class="n">partiel</span></div>
        <div class="v4-cmp-r"><span>Paiement au cabinet — espèces ou Chifa, gratuit patients</span><strong class="y">✓</strong><span class="n">variable</span></div>
        <div class="v4-cmp-r"><span>Réservation instantanée + rappels SMS</span><strong class="y">✓</strong><span class="n">—</span></div>
      </div>
    </section>

    <section class="section" *ngIf="!enRecherche">
      <div style="padding:0 var(--gutter)">
        <div style="background:#fff;border:1px solid var(--border);border-radius:var(--r16);padding:22px;display:grid;grid-template-columns:1fr 1fr;gap:14px;box-shadow:var(--s1)">
          <div style="text-align:center"><div style="font-size:28px;font-weight:800;color:var(--blue)">75 000+</div><div style="font-size:12px;color:var(--text3);margin-top:4px;font-weight:600">Médecins référencés</div></div>
          <div style="text-align:center;border-left:1px solid var(--border)"><div style="font-size:28px;font-weight:800;color:var(--blue)">69</div><div style="font-size:12px;color:var(--text3);margin-top:4px;font-weight:600">Wilayas</div></div>
        </div>
      </div>
    </section>

    <section class="section" style="padding-bottom:8px" *ngIf="!enRecherche">
      <div style="padding:0 var(--gutter)">
        <div style="background:#fff;border:1px solid var(--border);border-radius:var(--r16);padding:24px;text-align:center;box-shadow:var(--s1)">
          <div style="font-size:24px;margin-bottom:10px;color:var(--blue)"><i class="fa fa-user-doctor"></i></div>
          <h2 style="font-size:18px;font-weight:800;color:var(--ink);margin-bottom:8px">Vous êtes médecin ?</h2>
          <p style="font-size:13px;color:var(--text2);margin-bottom:16px">Réclamez votre fiche sur Tabibi et recevez vos rendez-vous en ligne.</p>
          <a class="btn btn-primary btn-lg" routerLink="/medecin/candidature"><i class="fa fa-user-plus"></i> <span>Réclamer ma fiche</span></a>
        </div>
      </div>
    </section>

    <section class="section" id="sec-faq" style="padding-top:0" *ngIf="!enRecherche">
      <div class="v4-sechead"><span class="v4-eyebrow">FAQ</span><h2>Questions fréquentes</h2></div>
      <div class="v4-faq">
        <details open><summary><span>L'application est-elle gratuite ?</span><span class="pl" aria-hidden="true">+</span></summary><p>Oui, Tabibi est 100 % gratuite pour les patients. Vous réglez uniquement la consultation, directement au cabinet — en espèces ou avec la carte Chifa.</p></details>
        <details><summary><span>Comment savez-vous qu'un médecin est fiable ?</span><span class="pl" aria-hidden="true">+</span></summary><p>Chaque praticien passe une vérification avant publication : identité, diplôme et cabinet. Le badge « Vérifié » n'apparaît qu'après validation.</p></details>
        <details><summary><span>Mes données de santé sont-elles protégées ?</span><span class="pl" aria-hidden="true">+</span></summary><p>Vos informations sont chiffrées et ne sont accessibles qu'à vous et aux médecins que vous consultez, avec votre consentement.</p></details>
        <details><summary><span>Je suis médecin, comment rejoindre Tabibi ?</span><span class="pl" aria-hidden="true">+</span></summary><p>Réclamez votre fiche depuis l'espace médecin, gérez vos disponibilités et recevez vos rendez-vous en ligne.</p></details>
      </div>
    </section>
  `,
  styles: [`
    .ac-liste { position:absolute; left:0; right:0; top:calc(100% + 6px); z-index:40; margin:0; padding:6px; list-style:none; background:#fff; border:1px solid var(--border); border-radius:var(--r12); box-shadow:var(--s1); max-height:340px; overflow-y:auto; }
    .ac-item { display:flex; flex-direction:column; gap:2px; padding:9px 12px; border-radius:8px; text-decoration:none; color:var(--ink); }
    .ac-item:hover, .ac-item:focus { background:#E7F1EC; outline:none; }
    .ac-nom { font-weight:700; line-height:1.25; }
    .ac-meta { font-size:12px; color:var(--text3); }
  `],
})
export class AnnuaireComponent implements OnInit, OnDestroy {
  private service = inject(AnnuaireService);
  private navigateur = isPlatformBrowser(inject(PLATFORM_ID));
  q = ''; specialite = ''; wilaya = '';
  resultats = signal<Medecin[]>([]);
  charge = signal(false);
  erreur = signal('');
  private minuteur: any;

  /** Suggestions d'autocompletion affichees sous le champ (max 6). */
  suggestions = signal<Medecin[]>([]);
  suggestionsVisibles = signal(false);
  /** Frappes successives dans le champ, pour l'autocompletion differee (debounce). */
  private saisie = new Subject<string>();
  private abonnementAuto: Subscription | null = null;
  private masquage: any;

  /** Vrai des que l'utilisateur a saisi une recherche : on masque le marketing pour montrer les resultats tout de suite. */
  get enRecherche(): boolean { return this.q.trim().length > 0; }

  ngOnInit() {
    this.rechercher();
    // L'autocompletion n'est active que dans le navigateur : cote serveur (SSR), aucun flux debounce ne doit tourner.
    if (!this.navigateur) return;
    this.abonnementAuto = this.saisie
      .pipe(
        debounceTime(250),
        map((t) => t.trim()),
        distinctUntilChanged(),
        switchMap((t) =>
          t.length < 2
            ? of<Medecin[]>([])
            : this.service.rechercher(undefined, undefined, t).pipe(
                map((liste) => liste.slice(0, 6)),
                catchError(() => of<Medecin[]>([])),
              ),
        ),
      )
      .subscribe((liste) => {
        this.suggestions.set(liste);
        this.suggestionsVisibles.set(liste.length > 0);
      });
  }

  ngOnDestroy() {
    this.abonnementAuto?.unsubscribe();
    this.abonnementAuto = null;
    clearTimeout(this.minuteur);
    clearTimeout(this.masquage);
  }

  /** Frappe dans le champ : relance la liste principale (differee) et alimente l'autocompletion. */
  surSaisie() {
    this.rechercheDifferee();
    this.suggestionsVisibles.set(true);
    this.saisie.next(this.q);
  }

  /** Focus : reaffiche les suggestions deja chargees si le champ en a. */
  surFocus() {
    if (this.suggestions().length) this.suggestionsVisibles.set(true);
  }

  /** Masque la liste apres un court delai, le temps de laisser passer le clic sur une suggestion. */
  masquerBientot() {
    clearTimeout(this.masquage);
    this.masquage = setTimeout(() => this.suggestionsVisibles.set(false), 150);
  }

  /** Clic sur une suggestion : la navigation est geree par routerLink, on ferme juste la liste. */
  choisirSuggestion() {
    this.suggestionsVisibles.set(false);
  }

  /** Attend un court instant apres la frappe avant de lancer la recherche. */
  rechercheDifferee() {
    clearTimeout(this.minuteur);
    this.minuteur = setTimeout(() => this.rechercher(), 300);
  }

  rechercher() {
    this.charge.set(true);
    this.erreur.set('');
    this.service.rechercher(this.specialite, this.wilaya, this.q).subscribe({
      next: (r) => { this.resultats.set(r); this.charge.set(false); },
      error: () => {
        this.erreur.set('Connexion au serveur impossible. Vérifiez votre connexion internet et réessayez.');
        this.charge.set(false);
      },
    });
  }

  /** Monogramme (1 ou 2 lettres) a partir du nom, pour l'avatar. */
  initiales(m: Medecin): string {
    const mots = (m.nomComplet || '').replace(/^(Dr|Dre|Docteur|Pr|Professeur)\.?\s+/i, '').trim().split(/\s+/);
    const lettres = mots.filter((x) => /\p{L}/u.test(x[0] || '')).slice(0, 2).map((x) => x[0].toUpperCase());
    return lettres.join('') || '•';
  }
}
