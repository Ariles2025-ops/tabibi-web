import { aDesInfos, libelleLangue } from './fiche-infos';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AnnuaireService, Creneau, Medecin } from '../annuaire/annuaire.service';
import { RendezVousService } from '../rendezvous/rendezvous.service';
import { AuthService } from '../auth/auth.service';
import { RoleService } from '../auth/role.service';
import { SyntheseAvisComponent } from '../avis/synthese-avis.component';
import { ListeAttenteService } from '../liste-attente/liste-attente.service';
import { MessagerieService } from '../messagerie/messagerie.service';
import { cleJour } from '../medecin/agenda-utils';
import { SPECIALITES_SEO, WILAYAS_SEO } from '../seo/referentiel-seo';
import { LangueService } from '../partage/langue.service';
import { SelecteurLangueComponent } from '../partage/selecteur-langue.component';

@Component({
    selector: 'app-fiche-medecin',
    imports: [CommonModule, RouterLink, SyntheseAvisComponent, SelecteurLangueComponent],
    template: `
    <main class="fm" [attr.dir]="l.ar() ? 'rtl' : null" [attr.lang]="l.ar() ? 'ar' : null">
      <div class="fm-haut">
        <a routerLink="/" class="fm-back"><i class="fa fa-xs" [class.fa-arrow-left]="!l.ar()" [class.fa-arrow-right]="l.ar()"></i> {{ l.t('Retour à la recherche', 'العودة إلى البحث') }}</a>
        <app-selecteur-langue />
      </div>

      <p *ngIf="erreur() && !medecin()" class="fm-err">{{ erreur() }}</p>

      <ng-container *ngIf="medecin() as m">
        <!-- Identite du praticien -->
        <header class="fm-hero">
          <div class="fm-ava" aria-hidden="true">{{ initiales(m.nomComplet) }}</div>
          <div class="fm-id">
            <h1>{{ m.nomComplet }}</h1>
            <span class="fm-spe"><i class="fa fa-stethoscope fa-xs"></i> {{ specialite(m) }}</span>
            <span class="fm-lieu"><i class="fa fa-location-dot fa-xs"></i> {{ m.ville || wilaya(m) }} ({{ wilaya(m) }})</span>
            <div class="fm-badges">
              <span class="fm-badge" *ngIf="creneaux().length"><i class="fa fa-calendar-check fa-xs"></i> {{ l.t('Rendez-vous en ligne', 'حجز المواعيد عبر الإنترنت') }}</span>
              <span class="fm-badge fm-badge--neutre"><i class="fa fa-wallet fa-xs"></i> {{ l.t('Paiement au cabinet', 'الدفع في العيادة') }}</span>
            </div>
          </div>
          <div class="fm-hero-act" *ngIf="!reclamable() && !messagerieReservee()">
            <button type="button" class="fm-btn fm-btn--sec" (click)="ecrire()" [disabled]="ouvertureMessagerie()">
              <i class="fa fa-comment-dots"></i> {{ ouvertureMessagerie() ? l.t('Ouverture…', 'جارٍ الفتح…') : l.t('Écrire au médecin', 'مراسلة الطبيب') }}
            </button>
          </div>
          <p *ngIf="!reclamable() && messagerieReservee()" class="fm-hero-msg">{{ l.t('La messagerie est réservée aux patients.', 'المراسلة مخصّصة للمرضى.') }}</p>
          <p *ngIf="erreurMessagerie()" class="fm-err fm-hero-msg">{{ erreurMessagerie() }}</p>
        </header>

        <div class="fm-grid">
          <!-- Prise de rendez-vous (colonne de droite sur ordinateur, en premier sur mobile) -->
          <aside class="fm-book" aria-labelledby="fm-book-titre">
            <h2 id="fm-book-titre">{{ l.t('Prendre rendez-vous', 'احجز موعدًا') }}</h2>
            <p class="fm-next" *ngIf="creneaux()[0] as premier">
              {{ l.t('Prochaine disponibilité :', 'أقرب موعد متاح:') }} <strong *ngIf="!l.ar()">{{ premier.debut | date:'EEE d MMM à HH:mm' }}</strong><strong *ngIf="l.ar()" dir="ltr">{{ premier.debut | date:'dd/MM/yyyy HH:mm' }}</strong>
            </p>

            <div *ngIf="reservation() as r" class="fm-ok" role="status">
              <i class="fa fa-circle-check"></i>
              <div>
                <strong>{{ l.t('Rendez-vous confirmé', 'تم تأكيد الموعد') }}</strong>
                <span *ngIf="!l.ar()">{{ r.debut | date:'EEEE d MMMM à HH:mm' }}</span>
                <span *ngIf="l.ar()" dir="ltr">{{ r.debut | date:'dd/MM/yyyy HH:mm' }}</span>
                <a routerLink="/mes-rendez-vous">{{ l.t('Voir mes rendez-vous', 'عرض مواعيدي') }}</a>
              </div>
            </div>
            <p *ngIf="erreur()" class="fm-err">{{ erreur() }}</p>
            <p *ngIf="charge()" class="fm-muted">{{ l.t('Chargement des disponibilités…', 'جارٍ تحميل المواعيد المتاحة…') }}</p>

            <!-- Etape 2 : confirmation du creneau choisi -->
            <div *ngIf="selection() as s" class="fm-confirm">
              <span class="fm-confirm-lbl">{{ l.t('Votre rendez-vous', 'موعدك') }}</span>
              <strong class="fm-confirm-date" *ngIf="!l.ar()">{{ s.debut | date:'EEEE d MMMM' }}</strong>
              <strong class="fm-confirm-date" *ngIf="l.ar()" dir="ltr">{{ s.debut | date:'dd/MM/yyyy' }}</strong>
              <span class="fm-confirm-heure"><i class="fa fa-clock fa-xs"></i> <span dir="ltr">{{ s.debut | date:'HH:mm' }}</span> · {{ s.dureeMinutes }} {{ l.t('min', 'د') }}</span>
              <button type="button" class="fm-btn fm-btn--pri" (click)="reserver(s)" [disabled]="enCours() !== null">
                {{ enCours() ? l.t('Réservation…', 'جارٍ الحجز…') : l.t('Confirmer le rendez-vous', 'تأكيد الموعد') }}
              </button>
              <button type="button" class="fm-link" (click)="selection.set(null)" [disabled]="enCours() !== null">{{ l.t('Choisir un autre horaire', 'اختيار موعد آخر') }}</button>
            </div>

            <!-- Etape 1 : choix du jour et de l'heure -->
            <ng-container *ngIf="!selection() && joursCreneaux().length">
              <div class="fm-nav">
                <button type="button" class="fm-nav-btn" (click)="page.set(page() - 1)" [disabled]="page() === 0" [attr.aria-label]="l.t('Jours précédents', 'الأيام السابقة')"><i class="fa" [class.fa-chevron-left]="!l.ar()" [class.fa-chevron-right]="l.ar()"></i></button>
                <span class="fm-nav-lbl">{{ l.t('Choisissez un horaire', 'اختر موعدًا') }}</span>
                <button type="button" class="fm-nav-btn" (click)="page.set(page() + 1)" [disabled]="!pageSuivante()" [attr.aria-label]="l.t('Jours suivants', 'الأيام التالية')"><i class="fa" [class.fa-chevron-right]="!l.ar()" [class.fa-chevron-left]="l.ar()"></i></button>
              </div>
              <div class="fm-jours">
                <div class="fm-jour" *ngFor="let j of joursVisibles()">
                  <div class="fm-jour-tete">
                    <span class="fm-jour-nom" *ngIf="!l.ar()">{{ j.date | date:'EEE' }}</span>
                    <span class="fm-jour-num" *ngIf="!l.ar()">{{ j.date | date:'d MMM' }}</span>
                    <span class="fm-jour-num" *ngIf="l.ar()" dir="ltr">{{ j.date | date:'dd/MM' }}</span>
                  </div>
                  <button type="button" class="fm-slot" *ngFor="let c of (toutAfficher() ? j.creneaux : j.creneaux.slice(0, 4))"
                          (click)="selection.set(c)" [disabled]="enCours() !== null"
                          [attr.aria-label]="l.t('Choisir le ', 'اختيار موعد ') + (c.debut | date:(l.ar() ? 'dd/MM/yyyy HH:mm' : 'EEEE d MMMM à HH:mm'))" dir="ltr">
                    {{ c.debut | date:'HH:mm' }}
                  </button>
                </div>
              </div>
              <button *ngIf="plusDHoraires()" type="button" class="fm-link fm-plus" (click)="toutAfficher.set(!toutAfficher())">
                {{ toutAfficher() ? l.t("Voir moins d'horaires", 'عرض مواعيد أقل') : l.t("Voir plus d'horaires", 'عرض مواعيد أكثر') }}
                <i class="fa fa-xs" [class.fa-chevron-down]="!toutAfficher()" [class.fa-chevron-up]="toutAfficher()"></i>
              </button>
            </ng-container>

            <p *ngIf="!charge() && !erreur() && creneaux().length === 0" class="fm-vide">{{ l.t('Aucun créneau disponible pour le moment.', 'لا توجد مواعيد متاحة حاليًا.') }}</p>

            <!-- Fiche importee, sans compte : personne ne lirait un message ni une liste d'attente -->
            <div *ngIf="reclamable()" class="fm-attente fm-absent">
              <p><strong>{{ l.t("Ce praticien n'est pas encore sur Ndawik", 'هذا الممارس ليس بعد على نداويك') }}</strong>
                {{ l.t("Sa fiche provient de sources publiques : il ne reçoit pas encore de messages ni de demandes de rendez-vous en ligne.", 'ملفّه مأخوذ من مصادر عامة: لا يستقبل بعدُ رسائل ولا طلبات مواعيد عبر الإنترنت.') }}</p>
              <a routerLink="/praticien" class="fm-link">{{ l.t("C'est votre fiche ?", 'هل هذا ملفّك؟') }} <i class="fa fa-xs" [class.fa-arrow-right]="!l.ar()" [class.fa-arrow-left]="l.ar()"></i></a>
            </div>

            <!-- Liste d'attente -->
            <div *ngIf="!charge() && !reclamable()" class="fm-attente">
              <p>
                <strong>{{ creneaux().length === 0 ? l.t('Aucun créneau ne vous est proposé ?', 'لا توجد مواعيد مقترحة لك؟') : l.t('Aucun créneau ne vous convient ?', 'لا يناسبك أي موعد؟') }}</strong>
                {{ l.t("Inscrivez-vous sur la liste d'attente de ce praticien. Vous serez notifié dès qu'un créneau se libère.", 'سجّل في قائمة انتظار هذا الممارس. سيصلك إشعار فور توفّر موعد.') }}
              </p>
              <p *ngIf="inscription()" class="fm-attente-ok">
                {{ inscription() }}
                <a routerLink="/liste-attente">{{ l.t("Voir mes listes d'attente", 'عرض قوائم انتظاري') }}</a>
              </p>
              <button *ngIf="!inscription()" type="button" class="fm-btn fm-btn--sec fm-btn--bloc" (click)="inscrire()" [disabled]="inscriptionEnCours()">
                <i class="fa fa-bell"></i> {{ inscriptionEnCours() ? l.t('Inscription…', 'جارٍ التسجيل…') : l.t("M'inscrire sur la liste d'attente", 'التسجيل في قائمة الانتظار') }}
              </button>
              <p *ngIf="erreurInscription()" class="fm-err">{{ erreurInscription() }}</p>
            </div>
          </aside>

          <!-- Informations -->
          <div class="fm-infos">
            <section class="fm-card">
              <h2><i class="fa fa-location-dot"></i> {{ l.t('Lieu de consultation', 'مكان الاستشارة') }}</h2>
              <p class="fm-lieu-txt">{{ m.ville || wilaya(m) }}, {{ l.t('wilaya de', 'ولاية') }} {{ wilaya(m) }}</p>
            </section>

            <section class="fm-card fm-cabinet" *ngIf="aInfos(m)">
              <h2><i class="fa fa-stethoscope"></i> {{ l.t('Le cabinet', 'العيادة') }}</h2>
              <ul class="fm-pratique">
                <li *ngIf="m.adresse"><i class="fa fa-map-pin"></i><div><strong>{{ l.t('Adresse', 'العنوان') }}</strong><span>{{ m.adresse }}</span></div></li>
                <li *ngIf="m.telephoneCabinet"><i class="fa fa-phone"></i><div><strong>{{ l.t('Téléphone', 'الهاتف') }}</strong><span><a [href]="'tel:' + m.telephoneCabinet" dir="ltr">{{ m.telephoneCabinet }}</a></span></div></li>
                <li *ngIf="m.horaires"><i class="fa fa-clock"></i><div><strong>{{ l.t('Horaires', 'أوقات العمل') }}</strong><span>{{ m.horaires }}</span></div></li>
                <li *ngIf="m.langues?.length"><i class="fa fa-language"></i><div><strong>{{ l.t('Langues parlées', 'اللغات المتحدَّث بها') }}</strong><span>{{ libellesLangues(m.langues) }}</span></div></li>
              </ul>
              <p *ngIf="m.presentation" class="fm-lieu-txt" style="white-space:pre-line">{{ m.presentation }}</p>
            </section>

            <section class="fm-card">
              <h2><i class="fa fa-circle-info"></i> {{ l.t('Informations pratiques', 'معلومات عملية') }}</h2>
              <ul class="fm-pratique">
                <li><i class="fa fa-wallet"></i><div><strong>{{ l.t('Paiement au cabinet', 'الدفع في العيادة') }}</strong><span>{{ l.t('Vous réglez la consultation directement sur place.', 'تدفع ثمن الاستشارة مباشرة في العيادة.') }}</span></div></li>
                <li><i class="fa fa-bolt"></i><div><strong>{{ l.t('Confirmation immédiate', 'تأكيد فوري') }}</strong><span>{{ l.t('Votre rendez-vous est enregistré dès la réservation.', 'يُسجَّل موعدك فور الحجز.') }}</span></div></li>
                <li><i class="fa fa-calendar-xmark"></i><div><strong>{{ l.t('Un empêchement ?', 'هل طرأ ما يمنعك؟') }}</strong><span>{{ l.t('Annulez depuis « Mes rendez-vous » pour libérer la place.', 'ألغِ الموعد من «مواعيدي» لإتاحة المكان لغيرك.') }}</span></div></li>
              </ul>
            </section>

            <section class="fm-card">
              <app-synthese-avis [medecinId]="m.id" [arabe]="l.ar()" />
            </section>
          </div>
        </div>
      </ng-container>
    </main>
  `,
    styles: [`
    :host { display:block; background:var(--bg); }
    .fm { max-width:1080px; margin:0 auto; padding:20px var(--gutter) 48px; }
    .fm-haut { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:16px; }
    .fm-back { display:inline-flex; align-items:center; gap:6px; color:var(--blue); font-weight:600; font-size:14px; text-decoration:none; }
    .fm-back:hover { text-decoration:underline; }

    /* En-tete d'identite */
    .fm-hero { display:grid; grid-template-columns:auto 1fr auto; gap:20px; align-items:center; background:#fff; border:1px solid var(--border); border-radius:var(--r16); box-shadow:var(--s1); padding:24px; }
    .fm-ava { width:80px; height:80px; border-radius:50%; background:var(--blue-l); border:1px solid var(--pastille-bd); color:var(--blue); display:grid; place-items:center; font-size:26px; font-weight:800; letter-spacing:-.02em; }
    .fm-id { min-width:0; display:flex; flex-direction:column; gap:4px; }
    .fm-id h1 { margin:0 0 2px; font-size:clamp(1.35rem, 2.4vw, 1.75rem); line-height:1.15; letter-spacing:-.02em; font-weight:800; color:var(--ink); text-wrap:balance; }
    .fm-spe { color:var(--blue); font-weight:700; font-size:15px; }
    .fm-lieu { color:var(--text3); font-size:14px; }
    .fm-badges { display:flex; flex-wrap:wrap; gap:8px; margin-top:8px; }
    .fm-badge { display:inline-flex; align-items:center; gap:6px; padding:4px 10px; border-radius:999px; background:var(--green-l); color:var(--blue); font-size:12px; font-weight:700; }
    .fm-badge--neutre { background:var(--bg2); color:var(--text2); }
    .fm-hero-act { align-self:start; }
    .fm-hero-msg { grid-column:1 / -1; margin:0; }

    /* Boutons */
    .fm-btn { display:inline-flex; align-items:center; justify-content:center; gap:8px; min-height:44px; padding:0 18px; border-radius:var(--r12); border:1.5px solid var(--blue); font:inherit; font-size:14px; font-weight:600; cursor:pointer; text-decoration:none; transition:background .15s var(--ease), box-shadow .15s var(--ease); }
    .fm-btn:active:not(:disabled) { transform:scale(.97); }
    .fm-btn:disabled { opacity:.6; cursor:default; }
    .fm-btn--pri { background:var(--blue); color:#fff; width:100%; }
    .fm-btn--pri:hover:not(:disabled) { background:var(--blue-d); box-shadow:0 4px 14px rgba(15,117,96,.24); }
    .fm-btn--sec { background:#fff; color:var(--blue); }
    .fm-btn--sec:hover:not(:disabled) { background:var(--blue-l); }
    .fm-btn--bloc { width:100%; }
    .fm-link { background:none; border:0; padding:0; font:inherit; font-size:14px; font-weight:600; color:var(--blue); cursor:pointer; text-decoration:none; display:inline-flex; align-items:center; gap:6px; }
    .fm-link:hover { text-decoration:underline; }

    /* Grille : infos a gauche, reservation a droite (collante) */
    .fm-grid { display:grid; grid-template-columns:minmax(0,1fr) 380px; gap:20px; margin-top:20px; align-items:start; }
    .fm-infos { grid-column:1; grid-row:1; display:flex; flex-direction:column; gap:16px; min-width:0; }
    .fm-book { grid-column:2; grid-row:1; position:sticky; top:calc(var(--nav-h, 56px) + 16px); background:#fff; border:1px solid var(--border); border-radius:var(--r16); box-shadow:0 2px 8px rgba(16,40,34,.06), 0 20px 40px rgba(16,40,34,.10); padding:20px; display:flex; flex-direction:column; gap:14px; }
    .fm-book h2 { margin:0; font-size:1.15rem; font-weight:700; color:var(--ink); letter-spacing:-.01em; }
    .fm-next { margin:-6px 0 0; font-size:13px; color:var(--text3); }
    .fm-next strong { color:var(--blue); display:inline-block; }
    .fm-next strong::first-letter, .fm-confirm-date::first-letter, .fm-ok span::first-letter { text-transform:uppercase; }

    .fm-nav { display:flex; align-items:center; justify-content:space-between; gap:8px; }
    .fm-nav-lbl { font-size:13px; font-weight:600; color:var(--text2); }
    .fm-nav-btn { width:36px; height:36px; border-radius:50%; border:1px solid var(--border); background:#fff; color:var(--blue); cursor:pointer; display:grid; place-items:center; }
    .fm-nav-btn:hover:not(:disabled) { border-color:var(--blue); background:var(--blue-l); }
    .fm-nav-btn:disabled { color:var(--text4); cursor:default; }
    .fm-jours { display:grid; grid-template-columns:repeat(4, minmax(0,1fr)); gap:8px; }
    .fm-jour { display:flex; flex-direction:column; gap:6px; min-width:0; }
    .fm-jour-tete { display:flex; flex-direction:column; align-items:center; padding-bottom:6px; margin-bottom:2px; border-bottom:1px solid var(--border); }
    .fm-jour-nom { font-size:12px; font-weight:700; color:var(--ink); text-transform:capitalize; }
    .fm-jour-num { font-size:12px; color:var(--text3); }
    .fm-slot { height:38px; border-radius:10px; border:0; background:var(--blue-l); color:var(--blue); font:inherit; font-size:14px; font-weight:700; cursor:pointer; transition:background .15s var(--ease), color .15s var(--ease); }
    .fm-slot:hover:not(:disabled) { background:var(--blue); color:#fff; }
    .fm-slot:focus-visible { outline:none; box-shadow:0 0 0 3px rgba(15,117,96,.18); }
    .fm-slot:disabled { opacity:.5; cursor:default; }
    .fm-plus { align-self:center; }

    .fm-confirm { display:flex; flex-direction:column; gap:6px; padding:16px; border-radius:var(--r12); background:var(--blue-l); border:1px solid var(--pastille-bd); }
    .fm-confirm-lbl { font-size:12px; font-weight:700; color:var(--text3); text-transform:uppercase; letter-spacing:.04em; }
    .fm-confirm-date { font-size:17px; color:var(--ink); display:block; }
    .fm-confirm-heure { font-size:14px; color:var(--text2); margin-bottom:8px; }
    .fm-confirm .fm-link { align-self:center; margin-top:4px; }

    .fm-ok { display:flex; gap:12px; padding:14px; border-radius:var(--r12); background:var(--green-l); color:var(--blue-d); }
    .fm-ok > i { font-size:20px; color:var(--green); margin-top:2px; }
    .fm-ok div { display:flex; flex-direction:column; gap:2px; font-size:14px; }
    .fm-ok span { display:block; }
    .fm-ok a { color:var(--blue); font-weight:700; }

    .fm-vide { margin:0; padding:14px; border-radius:var(--r12); background:var(--bg2); color:var(--text2); font-size:14px; text-align:center; }
    .fm-attente { border-top:1px solid var(--border); padding-top:14px; display:flex; flex-direction:column; gap:10px; }
    .fm-attente p { margin:0; font-size:13px; color:var(--text2); line-height:1.5; }
    .fm-attente strong { display:block; color:var(--ink); font-size:14px; margin-bottom:2px; }
    .fm-attente-ok { color:var(--blue-d) !important; font-weight:600; }
    .fm-attente-ok a { color:var(--blue); }

    /* Cartes d'information */
    .fm-card { background:#fff; border:1px solid var(--border); border-radius:var(--r16); box-shadow:var(--s1); padding:20px; }
    .fm-card h2 { margin:0 0 12px; font-size:1.05rem; font-weight:700; color:var(--ink); display:flex; align-items:center; gap:10px; }
    .fm-card h2 i { color:var(--blue); font-size:15px; }
    .fm-lieu-txt { margin:0; color:var(--text2); font-size:15px; }
    .fm-pratique { list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:14px; }
    .fm-pratique li { display:flex; gap:12px; align-items:flex-start; }
    .fm-pratique li > i { width:34px; height:34px; flex:none; border-radius:10px; background:var(--blue-l); color:var(--blue); display:grid; place-items:center; font-size:14px; }
    .fm-pratique div { display:flex; flex-direction:column; gap:2px; }
    .fm-pratique strong { font-size:14px; color:var(--ink); }
    .fm-pratique span { font-size:13px; color:var(--text3); }

    .fm-err { color:var(--red); font-size:14px; margin:0; }
    .fm-muted { color:var(--text3); font-size:14px; margin:0; }

    /* Mobile : une colonne, la reservation passe juste sous l'identite */
    @media (max-width: 860px) {
      .fm-grid { grid-template-columns:1fr; }
      .fm-book { grid-column:1; grid-row:1; position:static; }
      .fm-infos { grid-row:2; }
    }
    @media (max-width: 560px) {
      .fm { padding-top:14px; }
      .fm-hero { grid-template-columns:auto 1fr; padding:18px; gap:14px; align-items:start; }
      .fm-ava { width:60px; height:60px; font-size:20px; }
      .fm-hero-act { grid-column:1 / -1; }
      .fm-hero-act .fm-btn { width:100%; }
    }
  `]
})
export class FicheMedecinComponent implements OnInit {
  l = inject(LangueService);
  aInfos = aDesInfos;

  /** Wilaya dans la langue d'affichage (repli sur le francais si l'API ne fournit pas l'arabe). */
  wilaya(m: Medecin): string {
    if (!this.l.ar()) return m.wilayaFr;
    return WILAYAS_SEO.find((w) => w.code === String(m.wilayaCode))?.nomAr ?? m.wilayaFr;
  }

  /** Specialite dans la langue d'affichage (referentiel, comme l'appli ; repli sur le libelle francais de l'API). */
  specialite(m: Medecin): string {
    if (!this.l.ar()) return m.specialiteFr;
    if (m.specialiteSlug === 'autre') return 'أخرى';
    return SPECIALITES_SEO.find((x) => x.slug === m.specialiteSlug)?.nomAr ?? m.specialiteFr;
  }

  libellesLangues(codes: string[] | null | undefined): string {
    return (codes ?? []).map((c) => libelleLangue(c, this.l.ar())).join(this.l.ar() ? '، ' : ', ');
  }

  private route = inject(ActivatedRoute);
  private annuaire = inject(AnnuaireService);
  private rendezVous = inject(RendezVousService);
  private auth = inject(AuthService);
  private roleService = inject(RoleService);
  private messagerie = inject(MessagerieService);
  private listeAttente = inject(ListeAttenteService);
  private router = inject(Router);

  private medecinId = '';
  medecin = signal<Medecin | null>(null);
  /** Vrai si la fiche n'appartient a aucun compte : on propose au praticien de la reclamer. */
  reclamable = signal(false);
  creneaux = signal<Creneau[]>([]);
  /**
   * Creneaux regroupes par jour pour l'affichage en grille (une colonne par date).
   * `creneaux()` est deja trie par date croissante, donc les jours et leurs horaires restent dans l'ordre.
   */
  joursCreneaux = computed<{ date: string; creneaux: Creneau[] }[]>(() => {
    const groupes = new Map<string, { date: string; creneaux: Creneau[] }>();
    for (const c of this.creneaux()) {
      const cle = cleJour(c.debut);
      let groupe = groupes.get(cle);
      if (!groupe) { groupe = { date: c.debut, creneaux: [] }; groupes.set(cle, groupe); }
      groupe.creneaux.push(c);
    }
    return Array.from(groupes.values());
  });
  /** Page de jours affichee dans le module de reservation (4 jours par page). */
  page = signal(0);
  private readonly joursParPage = 4;
  joursVisibles = computed(() => this.joursCreneaux().slice(this.page() * this.joursParPage, (this.page() + 1) * this.joursParPage));
  pageSuivante = computed(() => (this.page() + 1) * this.joursParPage < this.joursCreneaux().length);
  /** Affiche tous les horaires de chaque jour au lieu des 4 premiers. */
  toutAfficher = signal(false);
  plusDHoraires = computed(() => this.joursVisibles().some((j) => j.creneaux.length > 4));
  /** Creneau choisi, en attente de confirmation par le patient. */
  selection = signal<Creneau | null>(null);
  charge = signal(false);
  /** Identifiant du creneau dont la reservation est en cours. */
  enCours = signal<string | null>(null);
  /** Dernier creneau reserve avec succes (message de confirmation). */
  reservation = signal<Creneau | null>(null);
  erreur = signal('');
  /** Vrai pendant l'ouverture de la conversation avec le medecin. */
  ouvertureMessagerie = signal(false);
  /** Vrai pour un compte medecin / secretaire / pharmacie / admin : l'API reserve la messagerie au role PATIENT. */
  messagerieReservee = computed(() => {
    const r = this.roleService.roles();
    return ['MEDECIN', 'SECRETAIRE', 'PHARMACIE', 'ADMIN'].some((x) => r.includes(x));
  });
  erreurMessagerie = signal('');
  /** Message une fois inscrit sur la liste d'attente du praticien (ou deja inscrit, 409) ; vide sinon. */
  inscription = signal('');
  inscriptionEnCours = signal(false);
  erreurInscription = signal('');

  ngOnInit() {
    this.roleService.charger();
    this.route.paramMap.subscribe((params) => this.charger(params.get('id') ?? ''));
  }

  /** Monogramme (1 ou 2 lettres) a partir du nom, pour l'avatar. */
  initiales(nom: string): string {
    const mots = (nom || '').replace(/^(Dr|Dre|Docteur|Pr|Professeur)\.?\s+/i, '').trim().split(/\s+/);
    const lettres = mots.filter((x) => /\p{L}/u.test(x[0] || '')).slice(0, 2).map((x) => x[0].toUpperCase());
    return lettres.join('') || '•';
  }

  private charger(id: string) {
    this.medecinId = id;
    this.medecin.set(null);
    this.reclamable.set(false);
    this.creneaux.set([]);
    this.reservation.set(null);
    this.selection.set(null);
    this.page.set(0);
    this.toutAfficher.set(false);
    this.erreur.set('');
    this.erreurMessagerie.set('');
    this.inscription.set('');
    this.erreurInscription.set('');
    this.annuaire.medecin(id).subscribe({
      next: (m) => this.medecin.set(m),
      error: (e: HttpErrorResponse) =>
        this.erreur.set(e.status === 404 ? this.l.t('Praticien introuvable.', 'الممارس غير موجود.') : this.messageApi(e, 'Impossible de charger la fiche du praticien.', 'تعذّر تحميل ملف الممارس.')),
    });
    this.annuaire.reclamable(id).subscribe({
      next: (r) => this.reclamable.set(r.reclamable),
      error: () => this.reclamable.set(false),
    });
    this.chargerCreneaux();
    this.verifierInscriptionAttente(id);
  }

  /** Si le patient est deja sur la liste d'attente de ce praticien, on l'indique d'emblee (pas de 409 a la clic). */
  private async verifierInscriptionAttente(id: string) {
    await this.auth.pret();
    if (!this.auth.estConnecte()) return;
    this.listeAttente.mes().subscribe({
      next: (inscriptions) => {
        if (inscriptions.some((i) => i.medecinId === id)) {
          this.inscription.set(this.l.t("Vous êtes déjà inscrit sur la liste d'attente de ce praticien.", 'أنت مسجّل بالفعل في قائمة انتظار هذا الممارس.'));
        }
      },
      error: () => undefined,
    });
  }

  /**
   * Message d'erreur de l'API (toujours en français). En arabe, les refus connus sont traduits et
   * tout autre message est remplacé par le repli arabe : jamais de français dans la page arabe.
   */
  private messageApi(e: HttpErrorResponse, reperFr: string, reperAr: string): string {
    const api: string | undefined = e.error?.erreur;
    if (!this.l.ar()) return api ?? reperFr;
    // Les 409 arrivent déjà traduits par l'intercepteur d'erreurs (erreur-api.interceptor) ; le reste garde le repli.
    const m = (api ?? '').toLowerCase();
    if (/[\u0600-\u06FF]/.test(m)) return api!;
    if (m.includes('rendez-vous à venir')) return 'لديك بالفعل موعد قادم مع هذا الطبيب: ألغِه لاختيار موعد آخر.';
    if (m.includes('chevauche')) return 'هذا الموعد يتداخل مع موعد آخر لديك.';
    if (m.includes('déjà passé')) return 'هذا الموعد قد مضى.';
    if (m.includes('pris') || m.includes('réservé')) return 'هذا الموعد حُجز للتوّ.';
    return reperAr;
  }

  private chargerCreneaux() {
    this.charge.set(true);
    this.annuaire.creneaux(this.medecinId).subscribe({
      next: (liste) => {
        this.creneaux.set(
          // Uniquement les creneaux libres et a venir (l'API peut encore renvoyer ceux de la journee passee).
          liste.filter((c) => c.disponible && Date.parse(c.debut) > Date.now()).sort((a, b) => Date.parse(a.debut) - Date.parse(b.debut)),
        );
        this.charge.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.creneaux.set([]);
        this.erreur.set(this.messageApi(e, 'Impossible de charger les créneaux.', 'تعذّر تحميل المواعيد.'));
        this.charge.set(false);
      },
    });
  }

  async reserver(creneau: Creneau) {
    await this.auth.pret();
    if (!this.auth.estConnecte()) {
      this.auth.seConnecter();
      return;
    }
    this.enCours.set(creneau.id);
    this.reservation.set(null);
    this.erreur.set('');
    this.rendezVous.reserver(creneau.id).subscribe({
      next: () => {
        this.creneaux.update((liste) => liste.filter((c) => c.id !== creneau.id));
        this.selection.set(null);
        this.reservation.set(creneau);
        this.enCours.set(null);
      },
      error: (e: HttpErrorResponse) => {
        this.enCours.set(null);
        if (e.status === 409) {
          this.selection.set(null);
          // L'API renvoie 409 pour plusieurs causes (créneau pris, passé, déjà un rendez-vous avec ce médecin…).
          this.erreur.set(this.messageApi(e, "Ce créneau vient d'être pris.", 'هذا الموعد حُجز للتوّ.'));
          this.chargerCreneaux();
        } else if (e.status === 404) {
          // Créneau supprimé par le cabinet entre-temps : on le désélectionne et on recharge la liste.
          this.selection.set(null);
          this.erreur.set(this.l.t("Ce créneau n'est plus disponible.", 'هذا الموعد لم يعد متاحًا.'));
          this.chargerCreneaux();
        } else if (e.status === 401) {
          this.auth.seConnecter();
        } else if (e.status === 403) {
          this.erreur.set(this.l.t('Seul un compte patient peut réserver un créneau.', 'يمكن لحساب المريض فقط حجز موعد.'));
        } else {
          this.erreur.set(this.messageApi(e, 'La réservation a échoué, veuillez réessayer.', 'فشل الحجز، يرجى المحاولة مرة أخرى.'));
        }
      },
    });
  }

  /**
   * Ouvre (ou retrouve) la conversation avec le medecin puis mene au fil ; reserve aux patients ayant deja un
   * rendez-vous avec lui (403 sinon). Non connecte → page de connexion puis retour sur la fiche.
   */
  async ecrire() {
    await this.auth.pret();
    if (!this.auth.estConnecte()) {
      this.auth.seConnecter();
      return;
    }
    await this.roleService.charger();
    if (this.messagerieReservee()) return;
    this.ouvertureMessagerie.set(true);
    this.erreurMessagerie.set('');
    this.messagerie.ouvrir(this.medecinId).subscribe({
      next: (c) => {
        this.ouvertureMessagerie.set(false);
        this.router.navigate(['/messagerie', c.id]);
      },
      error: (e: HttpErrorResponse) => {
        this.ouvertureMessagerie.set(false);
        if (e.status === 403) {
          this.erreurMessagerie.set(this.l.t('Vous devez avoir un rendez-vous avec ce médecin pour lui écrire.', 'يجب أن يكون لديك موعد مع هذا الطبيب لمراسلته.'));
        } else if (e.status === 401) {
          this.auth.seConnecter();
        } else {
          this.erreurMessagerie.set(this.messageApi(e, "L'ouverture de la conversation a échoué, veuillez réessayer.", 'تعذّر فتح المحادثة، يرجى المحاولة مرة أخرى.'));
        }
      },
    });
  }

  /**
   * Inscrit le patient sur la liste d'attente du praticien : il sera prevenu des qu'un creneau se libere.
   * 409 (deja inscrit) → message et etat « inscrit ». Non connecte → page de connexion puis retour sur la fiche.
   */
  async inscrire() {
    await this.auth.pret();
    if (!this.auth.estConnecte()) {
      this.auth.seConnecter();
      return;
    }
    this.inscriptionEnCours.set(true);
    this.erreurInscription.set('');
    this.listeAttente.inscrire(this.medecinId).subscribe({
      next: () => {
        this.inscriptionEnCours.set(false);
        this.inscription.set(this.l.t("Vous êtes inscrit sur la liste d'attente de ce praticien.", 'أنت مسجّل في قائمة انتظار هذا الممارس.'));
      },
      error: (e: HttpErrorResponse) => {
        this.inscriptionEnCours.set(false);
        if (e.status === 409) {
          this.inscription.set(this.l.t('Vous êtes déjà inscrit sur cette liste.', 'أنت مسجّل بالفعل في هذه القائمة.'));
        } else if (e.status === 401) {
          this.auth.seConnecter();
        } else if (e.status === 403) {
          this.erreurInscription.set(this.l.t("Seul un compte patient peut s'inscrire sur une liste d'attente.", 'يمكن لحساب المريض فقط التسجيل في قائمة انتظار.'));
        } else if (e.status === 404) {
          this.erreurInscription.set(this.l.t('Praticien introuvable.', 'الممارس غير موجود.'));
        } else {
          this.erreurInscription.set(this.messageApi(e, "L'inscription a échoué, veuillez réessayer.", 'فشل التسجيل، يرجى المحاولة مرة أخرى.'));
        }
      },
    });
  }
}
