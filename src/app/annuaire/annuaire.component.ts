import { Component, OnDestroy, OnInit, PLATFORM_ID, inject, signal } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subject, Subscription, catchError, debounceTime, distinctUntilChanged, map, of, switchMap } from 'rxjs';
import { AnnuaireService, Medecin } from './annuaire.service';
import { AuthService } from '../auth/auth.service';

/** Une wilaya du referentiel (assets/referentiel.json) : code officiel + libelle FR. */
interface OptionWilaya { code: string; nom: string; }
/** Une specialite du referentiel : slug utilise par l'API + libelle FR. */
interface OptionSpecialite { slug: string; nom: string; }
/** Contenu de assets/referentiel.json. */
interface Referentiel { wilayas: OptionWilaya[]; specialites: OptionSpecialite[]; }

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
          <div class="dl-search" role="search" id="hero-recherche">
            <div class="dl-field dl-field--text" style="position:relative">
              <i class="fa fa-magnifying-glass dl-ic" aria-hidden="true"></i>
              <input class="dl-input" type="search" [(ngModel)]="q" (input)="surSaisie()" (focus)="surFocus()" (blur)="masquerBientot()"
                     (keyup.enter)="lancerRecherche()"
                     placeholder="Nom, spécialité, établissement…" autocomplete="off" aria-label="Nom, spécialité ou établissement"
                     role="combobox" aria-autocomplete="list" aria-controls="ac-suggestions" [attr.aria-expanded]="suggestionsVisibles() && suggestions().length > 0">
              <ul id="ac-suggestions" class="ac-liste" role="listbox" *ngIf="connecte() && suggestionsVisibles() && suggestions().length">
                <li *ngFor="let s of suggestions()" role="option">
                  <a class="ac-item" [routerLink]="['/medecins', s.id]" (click)="choisirSuggestion()">
                    <span class="ac-nom" dir="auto">{{ s.nomComplet }}</span>
                    <span class="ac-meta">{{ s.specialiteFr }} · {{ s.wilayaFr }}</span>
                  </a>
                </li>
              </ul>
            </div>
            <div class="dl-sep" aria-hidden="true"></div>
            <label class="dl-field dl-field--wil">
              <i class="fa fa-location-dot dl-ic" aria-hidden="true"></i>
              <select class="dl-select" [(ngModel)]="wilaya" (change)="surFiltre()" aria-label="Où ?">
                <option value="">Où ?</option>
                <option *ngFor="let w of wilayas()" [value]="w.code">{{ w.nom }}</option>
              </select>
            </label>
            <button type="button" class="dl-btn" (click)="lancerRecherche()" aria-label="Rechercher">
              <span>Rechercher</span><i class="fa fa-arrow-right" aria-hidden="true"></i>
            </button>
          </div>
          <div class="dl-refine">
            <label class="dl-chip">
              <i class="fa fa-stethoscope" aria-hidden="true"></i>
              <select [(ngModel)]="specialite" (change)="surFiltre()" aria-label="Spécialité">
                <option value="">Toutes les spécialités</option>
                <option *ngFor="let s of specialites()" [value]="s.slug">{{ s.nom }}</option>
              </select>
            </label>
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
              <img class="bc-ava" src="assets/img/medecin-accueil.webp" alt="" width="56" height="56" style="object-fit:cover;object-position:50% 18%;background:#E7F1EC">
              <div class="bc-id"><b>Dr. Sofiane M.</b><small>Généraliste · Constantine</small></div>
              <span class="bc-verified"><i class="fa fa-check"></i> <span>Vérifié</span></span>
            </div>
            <div class="bc-day">Aujourd'hui · 12 créneaux disponibles</div>
            <div class="bc-slots"><span dir="ltr">09:00</span><span dir="ltr">09:30</span><span class="sel" dir="ltr">10:30</span><span dir="ltr">11:00</span><span dir="ltr">14:00</span><span dir="ltr">15:30</span></div>
            <div class="bc-btn"><i class="fa fa-check"></i> <span>Confirmer le RDV</span> · <span dir="ltr">10:30</span></div>
            <div class="bc-note">Confirmation immédiate · Paiement au cabinet</div>
          </div>
          <div class="badge-float bf1"><span class="dot" style="background:var(--blue)"><i class="fa fa-check"></i></span><span><b>RDV confirmé</b><small>Rappel dans votre espace Tabibi</small></span></div>
          <div class="badge-float bf2"><span class="dot" style="background:#D4A437"><i class="fa fa-star"></i></span><span><b>Médecin vérifié</b><small>Identité contrôlée</small></span></div>
        </div>
      </div>

      <a routerLink="/praticien" *ngIf="!enRecherche" style="display:flex;align-items:center;justify-content:space-between;margin-top:14px;padding:12px 14px;background:#fff;border:1.5px dashed var(--pastille-bd);border-radius:var(--r12);color:var(--ink);text-decoration:none;font-size:13px">
        <span><i class="fa fa-user-doctor" style="margin-right:6px;color:var(--vert)"></i> Vous êtes praticien ? Réclamez votre fiche</span>
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
          <p>Décrivez le médicament que vous cherchez : les pharmacies partenaires de votre wilaya voient votre demande et vous indiquent sa disponibilité et son prix.</p>
          <div class="dwh-points">
            <span><i class="fa fa-clock" aria-hidden="true"></i> <span>Disponibilité indiquée par la pharmacie</span></span>
            <span><i class="fa fa-location-dot" aria-hidden="true"></i> <span>Pharmacies de votre wilaya</span></span>
            <span><i class="fa fa-lock" aria-hidden="true"></i> <span>Votre identité n'est pas communiquée aux pharmacies</span></span>
          </div>
          <a class="btn btn-primary btn-lg dwh-cta" routerLink="/dawini"><i class="fa fa-prescription-bottle-medical" aria-hidden="true"></i> <span>Chercher un médicament</span></a>
        </div>
        <div class="dwh-r" aria-hidden="true">
          <div class="dwh-mock">
            <div class="dwh-mock-req"><i class="fa fa-pills"></i> Amoxicilline 1g <span class="b">Envoyée aux pharmacies</span></div>
            <div class="dwh-mock-resp">
              <div class="top">Pharmacie El Chifa <span class="ok"><i class="fa fa-check"></i> <span>Disponible</span></span></div>
              <small>Alger-Centre · générique disponible</small>
                          </div>
            <div style="text-align:center;font-size:10px;letter-spacing:.7px;text-transform:uppercase;color:rgba(255,255,255,.78);font-weight:700">Aperçu — exemple</div>
          </div>
        </div>
      </div>
    </section>

    <section class="section" *ngIf="!enRecherche" style="padding-top:8px">
      <div style="padding:0 var(--gutter)">
        <h2 class="sec-title" style="text-align:center;margin-bottom:18px">Votre compagnon santé au quotidien</h2>
        <div class="dl-feats">
          <div class="dl-feat">
            <span class="dl-feat__ic"><i class="fa fa-calendar-check" aria-hidden="true"></i></span>
            <h3>Réservez en ligne</h3>
            <p>Trouvez un médecin vérifié et prenez rendez-vous en 30 secondes, 24h/24.</p>
          </div>
          <div class="dl-feat">
            <span class="dl-feat__ic"><i class="fa fa-comment-medical" aria-hidden="true"></i></span>
            <h3>Suivi et rappels</h3>
            <p>Retrouvez vos rendez-vous et leurs rappels dans votre espace Tabibi, pour ne jamais les oublier.</p>
          </div>
          <div class="dl-feat">
            <span class="dl-feat__ic"><i class="fa fa-shield-halved" aria-hidden="true"></i></span>
            <h3>Vos données protégées</h3>
            <p>Vos informations de santé sont chiffrées et protégées (loi 18-07).</p>
          </div>
        </div>
      </div>
    </section>

    <section class="section" *ngIf="!enRecherche" style="padding-top:0">
      <div style="padding:0 var(--gutter)">
        <div class="dl-stats">
          <div class="dl-stat"><div class="dl-stat__n">130 000+</div><div class="dl-stat__l">Patients accompagnés</div></div>
          <div class="dl-stat"><div class="dl-stat__n">75 000+</div><div class="dl-stat__l">Médecins référencés</div></div>
          <div class="dl-stat"><div class="dl-stat__n">69</div><div class="dl-stat__l">Wilayas couvertes</div></div>
        </div>
      </div>
    </section>

    <section class="section" id="sec-docs" *ngIf="enRecherche">
      <div class="sec-head" style="display:flex;align-items:baseline;justify-content:space-between;gap:12px;padding:0 var(--gutter);margin-bottom:14px">
        <h2 class="sec-title">Résultats de votre recherche</h2>
        <span style="color:var(--text3);font-size:13px;font-weight:600" *ngIf="!charge() && resultats().length">{{ resultats().length >= 50 ? (connecte() ? '50 premiers résultats — affinez votre recherche' : '50+ médecins trouvés') : resultats().length + (resultats().length > 1 ? ' médecins trouvés' : ' médecin trouvé') }}</span>
      </div>

      <p *ngIf="charge()" style="padding:0 var(--gutter);color:var(--text3)">Recherche…</p>
      <p *ngIf="erreur()" style="padding:0 var(--gutter);color:#b3261e">
        {{ erreur() }}
        <button type="button" (click)="rechercher()" style="margin-left:8px;background:none;border:0;color:var(--vert);font-weight:700;text-decoration:underline;cursor:pointer;font:inherit;padding:0">Réessayer</button>
      </p>

      <div class="docs-wrap">
      <div id="docs-list" [class.docs-flou]="!connecte()" [attr.aria-hidden]="!connecte() ? 'true' : null" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,300px),1fr));gap:14px;padding:0 var(--gutter)">
        <article class="doc-card fu" *ngFor="let m of visibles()" [routerLink]="['/medecins', m.id]" tabindex="0">
          <div class="doc-row">
            <div class="doc-ava">{{ initiales(m) }}</div>
            <div style="flex:1;min-width:0">
              <div class="doc-name" dir="auto">{{ m.nomComplet }}</div>
              <div class="doc-spec"><i class="fa fa-stethoscope fa-xs"></i>{{ m.specialiteFr }}</div>
              <div class="doc-loc"><i class="fa fa-location-dot fa-xs"></i>{{ m.ville || m.wilayaFr }} ({{ m.wilayaFr }})</div>
            </div>
          </div>
          <div class="doc-footer">
            <span *ngIf="m.reservable" class="badge-reservable" style="display:inline-flex;align-items:center;gap:6px;background:var(--green-l);color:var(--green);font-size:12px;font-weight:700;padding:4px 10px;border-radius:999px"><i class="fa fa-calendar-check fa-xs" aria-hidden="true"></i>Réservable en ligne</span>
            <span *ngIf="!m.reservable"></span>
            <span class="btn btn-sm doc-btn-ghost"><i class="fa fa-arrow-right"></i> Voir la fiche</span>
          </div>
        </article>
      </div>

      <!-- Hors connexion : les premiers resultats sont floutes (non cliquables) sous le cadenas, avec leur nombre. -->
      <div class="docs-gate" [class.docs-gate--solo]="resultats().length === 0" *ngIf="!connecte() && !charge()">
        <div class="docs-gate__card">
          <span class="docs-gate__ic"><i class="fa fa-lock" aria-hidden="true"></i></span>
          <h3 *ngIf="resultats().length">{{ resultats().length >= 50 ? '50+' : resultats().length }} {{ resultats().length > 1 ? 'médecins trouvés' : 'médecin trouvé' }}</h3>
          <h3 *ngIf="!resultats().length">Créez un compte pour voir les médecins</h3>
          <p>La liste des médecins et leurs disponibilités sont réservées aux membres de Tabibi — c'est gratuit.</p>
          <div class="docs-gate__btns">
            <a class="bouton" (click)="seConnecter()" tabindex="0" role="button" style="cursor:pointer">Créer un compte</a>
            <a class="bouton-secondaire" (click)="seConnecter()" tabindex="0" role="button" style="cursor:pointer">Se connecter</a>
          </div>
        </div>
      </div>

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
        <h3>Téléconsultation</h3>
        <p>Après la prise de rendez-vous, votre médecin peut vous proposer une téléconsultation : vous la retrouvez alors dans votre espace Tabibi et consultez à distance, où que vous soyez en Algérie.</p>
      </div>
      <a class="btn btn-primary cta" href="#hero-recherche">Trouver un médecin</a>
    </div>

    <section class="section" *ngIf="!enRecherche" style="background:#fff;border-top:1px solid var(--border);border-bottom:1px solid var(--border)">
      <div class="sec-hdr" style="padding-bottom:16px"><h2 class="sec-title" style="font-size:18px">Comment prendre RDV en ligne ?</h2></div>
      <div class="steps-col">
        <div class="step-row"><div class="step-num">1</div><div class="step-info"><div class="step-title">Recherchez</div><div class="step-desc">Filtrez par nom, ville ou spécialité.</div></div></div>
        <div class="step-row"><div class="step-num">2</div><div class="step-info"><div class="step-title">Réservez</div><div class="step-desc">Choisissez un créneau et confirmez votre RDV en ligne.</div></div></div>
        <div class="step-row" style="padding-bottom:0"><div class="step-num">3</div><div class="step-info"><div class="step-title">Consultez</div><div class="step-desc">Confirmation immédiate : retrouvez votre rendez-vous dans votre espace Tabibi et rencontrez votre médecin.</div></div></div>
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
        <div class="v4-cmp-r"><span>Réservation instantanée + rappels dans votre espace</span><strong class="y">✓</strong><span class="n">—</span></div>
      </div>
    </section>

    <section class="section" style="padding-bottom:8px" *ngIf="!enRecherche">
      <div style="padding:0 var(--gutter)">
        <div style="background:#fff;border:1px solid var(--border);border-radius:var(--r16);padding:24px;text-align:center;box-shadow:var(--s1)">
          <div style="font-size:24px;margin-bottom:10px;color:var(--vert)"><i class="fa fa-user-doctor"></i></div>
          <h2 style="font-size:18px;font-weight:800;color:var(--ink);margin-bottom:8px">Vous êtes praticien ?</h2>
          <p style="font-size:13px;color:var(--text2);margin-bottom:16px">Réclamez votre fiche sur Tabibi et recevez vos rendez-vous en ligne.</p>
          <a class="btn btn-primary btn-lg" routerLink="/praticien"><i class="fa fa-user-plus"></i> <span>Faire une demande</span></a>
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

    /* Recherche structuree facon Doctolib : deux listes sous le champ texte. */
    .rech-filtres { display:flex; gap:10px; margin-top:12px; }
    .rf-field { position:relative; flex:1 1 0; min-width:0; display:block; }
    .rf-ic { position:absolute; top:50%; left:14px; transform:translateY(-50%); color:var(--vert); font-size:14px; line-height:1; pointer-events:none; }
    [dir="rtl"] .rf-ic { left:auto; right:14px; }
    .rf-select {
      width:100%; appearance:none; -webkit-appearance:none;
      background-color:#fff; color:var(--ink); font:inherit; font-size:14px;
      border:1px solid var(--border); border-radius:var(--r16); box-shadow:var(--s1);
      padding:14px 38px 14px 40px; cursor:pointer;
      background-image:url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="12" height="8" viewBox="0 0 12 8" fill="none"><path d="M1 1l5 5 5-5" stroke="%23D4A437" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>');
      background-repeat:no-repeat; background-position:right 14px center;
      transition:box-shadow .2s, border-color .15s;
    }
    [dir="rtl"] .rf-select { padding:14px 40px 14px 38px; background-position:left 14px center; }
    .rf-select:focus { outline:none; border-color:var(--vert); box-shadow:0 0 0 3px rgba(15,117,96,.14); }
    @media (max-width:640px) { .rech-filtres { flex-direction:column; } }

    /* Barre de recherche unifiee facon Doctolib : nom/specialite + specialite + lieu + bouton, sur une pilule blanche. */
    .dl-search { display:flex; align-items:stretch; gap:0; background:#fff; border-radius:999px;
      box-shadow:0 8px 24px rgba(16,40,34,.10), 0 2px 6px rgba(16,40,34,.05);
      padding:6px; max-width:880px; margin-top:16px; }
    .dl-field { position:relative; display:flex; align-items:center; flex:1 1 0; min-width:0; }
    .dl-field--text { flex:1.5 1 0; }
    .dl-ic { position:absolute; left:18px; top:50%; transform:translateY(-50%); color:var(--vert); font-size:15px; line-height:1; pointer-events:none; }
    [dir="rtl"] .dl-ic { left:auto; right:18px; }
    .dl-input, .dl-select { width:100%; border:0; background:transparent; font:inherit; font-size:15px; color:var(--ink);
      padding:15px 14px 15px 46px; outline:none; }
    [dir="rtl"] .dl-input, [dir="rtl"] .dl-select { padding:15px 46px 15px 14px; }
    .dl-input::placeholder { color:var(--text3); }
    .dl-select { appearance:none; -webkit-appearance:none; cursor:pointer; padding-right:34px;
      background-image:url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="12" height="8" viewBox="0 0 12 8" fill="none"><path d="M1 1l5 5 5-5" stroke="%23D4A437" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>');
      background-repeat:no-repeat; background-position:right 16px center; }
    [dir="rtl"] .dl-select { padding:15px 34px 15px 46px; background-position:left 16px center; }
    .dl-sep { width:1px; background:var(--border); margin:10px 0; flex:0 0 auto; }
    .dl-btn { flex:0 0 auto; display:inline-flex; align-items:center; gap:8px; background:var(--vert); color:#fff;
      border:0; border-radius:999px; padding:0 26px; font:inherit; font-weight:700; font-size:15px; cursor:pointer;
      transition:background .15s, transform .05s; }
    .dl-btn:hover { background:#0a4d3e; }
    .dl-btn:active { transform:scale(.97); }
    .dl-btn:focus-visible { outline:none; box-shadow:0 0 0 3px rgba(15,117,96,.35); }
    .dl-field--text { flex:2 1 0; }
    /* Affinage : petit chip blanc (specialite) sous la barre, lisible sur fond vert comme sur fond clair. */
    .dl-refine { display:flex; gap:10px; margin-top:12px; flex-wrap:wrap; }
    .dl-chip { display:inline-flex; align-items:center; gap:8px; height:42px; padding:0 8px 0 14px;
      background:#fff; border-radius:999px; box-shadow:var(--s1); position:relative; }
    .dl-chip > i { color:var(--vert); font-size:14px; line-height:1; }
    .dl-chip select { border:0; background:transparent; font:inherit; font-size:14px; color:var(--ink);
      padding:0 26px 0 2px; outline:none; cursor:pointer; appearance:none; -webkit-appearance:none;
      background-image:url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="12" height="8" viewBox="0 0 12 8" fill="none"><path d="M1 1l5 5 5-5" stroke="%23D4A437" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>');
      background-repeat:no-repeat; background-position:right 6px center; }
    [dir="rtl"] .dl-chip select { padding:0 2px 0 26px; background-position:left 6px center; }
    /* Section « compagnon santé » : 3 cartes a icone (charte verte). */
    .dl-feats { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; }
    .dl-feat { background:#fff; border:1px solid var(--border); border-radius:var(--r16); padding:22px; text-align:center; box-shadow:var(--s1); }
    .dl-feat__ic { display:inline-flex; align-items:center; justify-content:center; width:52px; height:52px; border-radius:16px; background:#e7f3ef; color:var(--vert); font-size:20px; margin-bottom:12px; }
    .dl-feat h3 { margin:0 0 6px; font-size:16px; font-weight:700; color:var(--ink); }
    .dl-feat p { margin:0; font-size:13px; color:var(--text3); line-height:1.5; }
    /* Bande de statistiques (degrade de marque). */
    .dl-stats { display:grid; grid-template-columns:repeat(3,1fr); background:linear-gradient(155deg,var(--vert) 0%,#0a4d3e 100%); border-radius:var(--r16); padding:24px 12px; color:#fff; box-shadow:var(--s2); }
    .dl-stat { text-align:center; padding:0 6px; }
    .dl-stat + .dl-stat { border-inline-start:1px solid rgba(255,255,255,.2); }
    .dl-stat__n { font-size:28px; font-weight:800; letter-spacing:-.02em; }
    .dl-stat__l { font-size:12px; opacity:.9; margin-top:4px; font-weight:600; }
    @media (max-width:640px) { .dl-feats { grid-template-columns:1fr; } .dl-stat__n { font-size:21px; } }

    /* Resultats verrouilles : floutes hors connexion, avec un cadenas invitant a creer un compte. */
    .docs-wrap { position:relative; }
    .docs-flou { filter:blur(7px); pointer-events:none; user-select:none; min-height:320px; }
    .docs-gate { position:absolute; inset:0; display:flex; align-items:flex-start; justify-content:center; padding:24px var(--gutter); }
    .docs-gate__card { background:#fff; border:1px solid var(--border); border-radius:var(--r16); box-shadow:var(--s3); padding:28px 24px; text-align:center; max-width:380px; width:100%; }
    .docs-gate__ic { display:inline-flex; align-items:center; justify-content:center; width:52px; height:52px; border-radius:16px; background:#e7f3ef; color:var(--vert); font-size:20px; margin-bottom:12px; }
    .docs-gate__card h3 { margin:0 0 6px; font-size:18px; font-weight:800; color:var(--ink); line-height:1.25; }
    .docs-gate__card p { margin:0 0 16px; font-size:13px; color:var(--text3); line-height:1.5; }
    .docs-gate__btns { display:flex; gap:10px; justify-content:center; flex-wrap:wrap; }
    .docs-gate--solo { position:static; inset:auto; padding:8px var(--gutter) 24px; }

    @media (max-width:760px) {
      .dl-search { flex-direction:column; border-radius:20px; padding:8px; gap:6px; margin-top:14px; }
      .dl-sep { display:none; }
      .dl-field { width:100%; border:1px solid var(--border); border-radius:12px; }
      .dl-btn { width:100%; justify-content:center; padding:14px; border-radius:12px; }
    }
  `],
})
export class AnnuaireComponent implements OnInit, OnDestroy {
  private service = inject(AnnuaireService);
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  private navigateur = isPlatformBrowser(inject(PLATFORM_ID));
  /** Etat de connexion : hors connexion, les resultats sont floutes et on invite a creer un compte. */
  connecte = signal(false);
  q = ''; specialite = ''; wilaya = '';
  /** Listes du referentiel (assets/referentiel.json) qui alimentent les deux <select>. */
  wilayas = signal<OptionWilaya[]>([]);
  specialites = signal<OptionSpecialite[]>([]);
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
  /** Filtres passes dans l'URL (?specialite=…&wilaya=…), par exemple depuis les liens du pied de page. */
  private abonnementParams: Subscription | null = null;
  private masquage: any;

  /** Vrai des que l'utilisateur a saisi un texte ou choisi un filtre : on masque le marketing pour montrer les resultats tout de suite. */
  get enRecherche(): boolean { return this.q.trim().length > 0 || !!this.specialite || !!this.wilaya; }

  ngOnInit() {
    // Charge le referentiel wilayas/specialites. URL relative : SSR-safe, et catchError evite tout plantage si le fichier est indisponible.
    this.http
      .get<Referentiel>('/assets/referentiel.json')
      .pipe(catchError(() => of<Referentiel>({ wilayas: [], specialites: [] })))
      .subscribe((ref) => {
        this.wilayas.set(ref?.wilayas ?? []);
        this.specialites.set(ref?.specialites ?? []);
      });
    // Pas de chargement par defaut : l'accueil n'affiche aucun medecin tant qu'on ne cherche pas.
    // Etat de connexion : determine si les resultats sont visibles ou floutes.
    this.auth.pret().then(() => this.connecte.set(this.auth.estConnecte()));
    // Filtres de l'URL : appliques a l'arrivee et a chaque changement (liens « Spécialités » / « Villes » du pied de page).
    this.abonnementParams = this.route.queryParamMap.subscribe((p) => {
      const specialite = p.get('specialite');
      const wilaya = p.get('wilaya');
      if (!specialite && !wilaya) return;
      this.specialite = specialite ?? '';
      this.wilaya = wilaya ?? '';
      this.auth.pret().then(() => {
        this.connecte.set(this.auth.estConnecte());
        this.lancerRecherche();
      });
    });
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
    this.abonnementParams?.unsubscribe();
    this.abonnementParams = null;
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

  /** Changement d'un des deux <select> : ferme l'autocompletion et relance la recherche combinee (texte + specialite + wilaya). */
  surFiltre() {
    this.suggestionsVisibles.set(false);
    this.rechercher();
  }

  /** Bouton « Se connecter » du cadenas sur les resultats floutes. */
  seConnecter() { this.auth.seConnecter(); }

  /** Clic sur le bouton « Rechercher » : lance la recherche et fait defiler vers la liste des resultats. */
  lancerRecherche() {
    this.suggestionsVisibles.set(false);
    this.rechercher();
    if (this.navigateur) {
      setTimeout(() => document.getElementById('sec-docs')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    }
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

  /** Hors connexion, seules 6 cartes (floutees) sont rendues sous le cadenas. */
  visibles(): Medecin[] {
    return this.connecte() ? this.resultats() : this.resultats().slice(0, 6);
  }

  /** Monogramme (1 ou 2 lettres) a partir du nom, pour l'avatar. */
  initiales(m: Medecin): string {
    const mots = (m.nomComplet || '').replace(/^(Dr|Dre|Docteur|Pr|Professeur)\.?\s+/i, '').trim().split(/\s+/);
    const lettres = mots.filter((x) => /\p{L}/u.test(x[0] || '')).slice(0, 2).map((x) => x[0].toUpperCase());
    return lettres.join('') || '•';
  }
}
