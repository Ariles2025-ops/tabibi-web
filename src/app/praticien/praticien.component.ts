import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../auth/auth.service';

/**
 * Page publique « Vous etes praticien ? » : presentation facon Doctolib (benefices, etapes, avantages)
 * avec un bouton qui mene a la reclamation de fiche (/medecin/candidature). Aucune connexion requise pour la voir.
 */
@Component({
  selector: 'app-praticien',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <main class="prat">
      <!-- Hero -->
      <section class="prat-hero">
        <div class="prat-hero__in">
          <div class="prat-hero__txt">
            <span class="prat-eyebrow">Espace praticien</span>
            <h1>Développez votre cabinet avec <span class="acc">Tabibi</span></h1>
            <p>Recevez vos rendez-vous en ligne, réduisez les absences grâce aux rappels SMS et gagnez en visibilité auprès des patients de votre wilaya — <b>gratuitement</b>.</p>
            <div class="prat-cta">
              <a class="prat-btn-blanc" routerLink="/medecin/candidature">Réclamer ma fiche</a>
              <a class="prat-login" (click)="seConnecter()" tabindex="0" role="button">J'ai déjà un compte</a>
            </div>
          </div>
          <ul class="prat-benef">
            <li><svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg> Recevez vos RDV en ligne, 24h/24</li>
            <li><svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg> Rappels SMS automatiques : moins d'absences</li>
            <li><svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg> Agenda et disponibilités faciles à gérer</li>
            <li><svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg> Plus de visibilité auprès des patients</li>
          </ul>
        </div>
      </section>

      <!-- Comment ça marche -->
      <section class="prat-sec">
        <h2 class="prat-h2">Comment rejoindre Tabibi ?</h2>
        <div class="prat-steps">
          <div class="prat-step"><span class="prat-num">1</span><h3>Réclamez votre fiche</h3><p>Renseignez votre nom, votre spécialité et votre numéro d'inscription à l'ordre.</p></div>
          <div class="prat-step"><span class="prat-num">2</span><h3>Validation</h3><p>Un administrateur vérifie votre identité avant de vous confier votre fiche.</p></div>
          <div class="prat-step"><span class="prat-num">3</span><h3>Recevez vos RDV</h3><p>Gérez vos disponibilités et recevez vos rendez-vous en ligne, avec rappels SMS.</p></div>
        </div>
      </section>

      <!-- Avantages -->
      <section class="prat-sec prat-sec--soft">
        <h2 class="prat-h2">Pourquoi les praticiens choisissent Tabibi</h2>
        <div class="prat-feats">
          <div class="prat-feat"><span class="prat-feat__ic"><i class="fa fa-calendar-check" aria-hidden="true"></i></span><h3>Agenda en ligne</h3><p>Vos créneaux se remplissent tout seuls, sans appels téléphoniques à gérer.</p></div>
          <div class="prat-feat"><span class="prat-feat__ic"><i class="fa fa-comment-sms" aria-hidden="true"></i></span><h3>Moins d'absences</h3><p>Un rappel SMS automatique est envoyé au patient avant chaque rendez-vous.</p></div>
          <div class="prat-feat"><span class="prat-feat__ic"><i class="fa fa-magnifying-glass" aria-hidden="true"></i></span><h3>Plus de visibilité</h3><p>Les patients de votre wilaya vous trouvent facilement par spécialité.</p></div>
          <div class="prat-feat"><span class="prat-feat__ic"><i class="fa fa-shield-halved" aria-hidden="true"></i></span><h3>Données protégées</h3><p>Vos données et celles de vos patients sont chiffrées et protégées (loi 18-07).</p></div>
        </div>
      </section>

      <!-- CTA final -->
      <section class="prat-final">
        <h2>Prêt à recevoir vos premiers rendez-vous en ligne ?</h2>
        <p>C'est gratuit pour les praticiens. Réclamez votre fiche en quelques minutes.</p>
        <a class="prat-btn-blanc" routerLink="/medecin/candidature">Réclamer ma fiche gratuitement</a>
      </section>
    </main>
  `,
  styles: [`
    .prat { color: var(--ink); }
    .prat-hero { background: linear-gradient(155deg, var(--vert) 0%, #0a4d3e 100%); color:#fff; }
    .prat-hero__in { max-width:1100px; margin:0 auto; padding:56px var(--gutter); display:grid; grid-template-columns:1.1fr .9fr; gap:40px; align-items:center; }
    .prat-eyebrow { display:inline-block; font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:.08em; color:#86efac; margin-bottom:12px; }
    .prat-hero h1 { margin:0 0 14px; font-size:clamp(1.8rem,3.2vw,2.6rem); line-height:1.15; font-weight:800; letter-spacing:-.02em; text-wrap:balance; }
    .prat-hero h1 .acc { color:#86efac; }
    .prat-hero p { margin:0 0 22px; font-size:1.05rem; line-height:1.55; color:rgba(255,255,255,.9); max-width:52ch; }
    .prat-cta { display:flex; gap:14px; flex-wrap:wrap; align-items:center; }
    .prat-btn-blanc { background:#fff; color:var(--vert); font-weight:700; padding:13px 24px; border-radius:999px; text-decoration:none; }
    .prat-btn-blanc:hover { background:#f0f7f4; }
    .prat-login { color:#fff; opacity:.95; cursor:pointer; font-weight:600; text-decoration:underline; }
    .prat-benef { list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:14px; background:rgba(255,255,255,.08); border:1px solid rgba(255,255,255,.18); border-radius:20px; padding:24px; }
    .prat-benef li { display:flex; align-items:center; gap:12px; font-weight:600; color:#fff; }
    .prat-benef svg { flex:none; width:22px; height:22px; stroke:#86efac; stroke-width:3; fill:none; }

    .prat-sec { max-width:1100px; margin:0 auto; padding:48px var(--gutter); }
    .prat-sec--soft { background:#f1f5f9; max-width:none; }
    .prat-sec--soft .prat-feats, .prat-sec--soft .prat-h2 { max-width:1100px; margin-inline:auto; }
    .prat-h2 { text-align:center; font-size:1.5rem; font-weight:800; color:var(--ink); margin:0 0 28px; letter-spacing:-.02em; }
    .prat-steps { display:grid; grid-template-columns:repeat(3,1fr); gap:18px; }
    .prat-step { background:#fff; border:1px solid var(--border); border-radius:16px; padding:24px; box-shadow:var(--s1); }
    .prat-num { display:inline-flex; align-items:center; justify-content:center; width:40px; height:40px; border-radius:50%; background:#e7f3ef; color:var(--vert); font-weight:800; font-size:18px; margin-bottom:12px; }
    .prat-step h3 { margin:0 0 6px; font-size:16px; font-weight:700; color:var(--ink); }
    .prat-step p { margin:0; font-size:13px; color:var(--text3); line-height:1.55; }

    .prat-feats { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; }
    .prat-feat { background:#fff; border:1px solid var(--border); border-radius:16px; padding:22px; box-shadow:var(--s1); }
    .prat-feat__ic { display:inline-flex; align-items:center; justify-content:center; width:48px; height:48px; border-radius:14px; background:#e7f3ef; color:var(--vert); font-size:18px; margin-bottom:12px; }
    .prat-feat h3 { margin:0 0 6px; font-size:15px; font-weight:700; color:var(--ink); }
    .prat-feat p { margin:0; font-size:13px; color:var(--text3); line-height:1.5; }

    .prat-final { background: linear-gradient(155deg, var(--vert) 0%, #0a4d3e 100%); color:#fff; text-align:center; padding:48px var(--gutter); }
    .prat-final h2 { margin:0 0 8px; font-size:1.5rem; font-weight:800; letter-spacing:-.02em; }
    .prat-final p { margin:0 0 20px; color:rgba(255,255,255,.9); }

    @media (max-width:860px) {
      .prat-hero__in { grid-template-columns:1fr; gap:28px; padding:40px var(--gutter); }
      .prat-steps { grid-template-columns:1fr; }
      .prat-feats { grid-template-columns:1fr 1fr; }
    }
    @media (max-width:560px) { .prat-feats { grid-template-columns:1fr; } }
  `],
})
export class PraticienComponent {
  private auth = inject(AuthService);
  /** « J'ai déjà un compte » : lance la connexion Keycloak. */
  seConnecter() { this.auth.seConnecter(); }
}
