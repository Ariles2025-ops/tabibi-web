import { Component, inject, signal } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { FormsModule } from '@angular/forms';

/**
 * Page publique « Vous etes praticien ? » : presentation + formulaire de DEMANDE (sans compte).
 * Le praticien ne cree pas de compte lui-meme : il envoie une demande ; l'equipe verifie puis cree le compte.
 * MVP : la demande est envoyee par e-mail a contact@tabibi.doctor (ouvre la messagerie du praticien) ;
 * un suivi des demandes cote admin pourra etre ajoute ensuite.
 */
@Component({
  selector: 'app-praticien',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <main class="prat">
      <section class="prat-hero">
        <div class="prat-hero__in">
          <div class="prat-hero__txt">
            <span class="prat-eyebrow">Espace praticien</span>
            <h1>Développez votre cabinet avec <span class="acc">Tabibi</span></h1>
            <p>Recevez vos rendez-vous en ligne, réduisez les absences grâce aux rappels SMS et gagnez en visibilité auprès des patients de votre wilaya — <b>gratuitement</b>.</p>
            <div class="prat-cta">
              <button type="button" class="prat-btn-blanc" (click)="versDemande()">Demander à rejoindre Tabibi</button>
            </div>
            <p class="prat-note">Les comptes praticiens sont créés par notre équipe après vérification de votre inscription à l'ordre.</p>
          </div>
          <ul class="prat-benef">
            <li><svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg> Recevez vos RDV en ligne, 24h/24</li>
            <li><svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg> Rappels SMS automatiques : moins d'absences</li>
            <li><svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg> Agenda et disponibilités faciles à gérer</li>
            <li><svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg> Plus de visibilité auprès des patients</li>
          </ul>
        </div>
      </section>

      <section class="prat-sec">
        <h2 class="prat-h2">Comment rejoindre Tabibi ?</h2>
        <div class="prat-steps">
          <div class="prat-step"><span class="prat-num">1</span><h3>Envoyez votre demande</h3><p>Remplissez le formulaire ci-dessous : nom, spécialité, wilaya et numéro d'inscription à l'ordre.</p></div>
          <div class="prat-step"><span class="prat-num">2</span><h3>Vérification</h3><p>Notre équipe vérifie votre identité et crée votre compte praticien.</p></div>
          <div class="prat-step"><span class="prat-num">3</span><h3>Recevez vos RDV</h3><p>Gérez vos disponibilités et recevez vos rendez-vous en ligne, avec rappels SMS.</p></div>
        </div>
      </section>

      <section class="prat-sec prat-sec--soft">
        <h2 class="prat-h2">Pourquoi les praticiens choisissent Tabibi</h2>
        <div class="prat-feats">
          <div class="prat-feat"><span class="prat-feat__ic"><i class="fa fa-calendar-check" aria-hidden="true"></i></span><h3>Agenda en ligne</h3><p>Vos créneaux se remplissent tout seuls, sans appels téléphoniques à gérer.</p></div>
          <div class="prat-feat"><span class="prat-feat__ic"><i class="fa fa-comment-sms" aria-hidden="true"></i></span><h3>Moins d'absences</h3><p>Un rappel SMS automatique est envoyé au patient avant chaque rendez-vous.</p></div>
          <div class="prat-feat"><span class="prat-feat__ic"><i class="fa fa-magnifying-glass" aria-hidden="true"></i></span><h3>Plus de visibilité</h3><p>Les patients de votre wilaya vous trouvent facilement par spécialité.</p></div>
          <div class="prat-feat"><span class="prat-feat__ic"><i class="fa fa-shield-halved" aria-hidden="true"></i></span><h3>Données protégées</h3><p>Vos données et celles de vos patients sont chiffrées et protégées (loi 18-07).</p></div>
        </div>
      </section>

      <!-- Formulaire de demande -->
      <section class="prat-sec" id="demande">
        <div class="prat-form-wrap">
          <h2 class="prat-h2" style="margin-bottom:6px">Demander à rejoindre Tabibi</h2>
          <p style="text-align:center;color:var(--text3);margin:0 0 22px;font-size:14px">C'est gratuit. Notre équipe vous recontacte pour créer votre compte.</p>

          <div *ngIf="!envoye()" class="prat-form">
            <label class="pf"><span>Nom complet *</span><input class="champ" [(ngModel)]="nom" name="nom" placeholder="Dr Amina Belkacem"></label>
            <label class="pf"><span>Spécialité *</span><input class="champ" [(ngModel)]="specialite" name="spec" placeholder="Cardiologue, généraliste…"></label>
            <label class="pf"><span>Wilaya *</span><input class="champ" [(ngModel)]="wilaya" name="wil" placeholder="Alger, Oran…"></label>
            <label class="pf"><span>Ville / commune</span><input class="champ" [(ngModel)]="ville" name="ville" placeholder="Hydra, Bab El Oued…"></label>
            <label class="pf"><span>N° d'inscription à l'ordre *</span><input class="champ" [(ngModel)]="numeroOrdre" name="ord" placeholder="Votre numéro d'ordre"></label>
            <label class="pf"><span>Téléphone *</span><input class="champ" [(ngModel)]="telephone" name="tel" inputmode="tel" placeholder="05 50 12 34 56"></label>
            <label class="pf"><span>E-mail</span><input class="champ" [(ngModel)]="email" name="email" inputmode="email" placeholder="vous@exemple.com"></label>
            <label class="pf pf--full"><span>Message (facultatif)</span><textarea class="champ" [(ngModel)]="message" name="msg" rows="3" placeholder="Horaires, cabinet, précisions…"></textarea></label>
            <div class="pf--full">
              <p *ngIf="erreur()" style="color:#D21010;font-size:13px;margin:0 0 10px">{{ erreur() }}</p>
              <button type="button" class="prat-btn-vert" (click)="envoyer()">Envoyer ma demande</button>
              <p style="color:var(--text3);font-size:12px;margin:10px 0 0">Les champs avec * sont obligatoires.</p>
            </div>
          </div>

          <div *ngIf="envoye()" class="prat-ok">
            <span class="prat-ok__ic"><i class="fa fa-circle-check" aria-hidden="true"></i></span>
            <h3>Votre demande est prête !</h3>
            <p>Votre messagerie s'est ouverte avec la demande pré-remplie — il ne reste qu'à l'envoyer. Si rien ne s'est ouvert, écrivez-nous directement à <b>contact&#64;tabibi.doctor</b> avec les mêmes informations.</p>
            <button type="button" class="prat-btn-blanc" style="color:var(--vert);border:1.5px solid var(--vert)" (click)="envoye.set(false)">Modifier ma demande</button>
          </div>
        </div>
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
    .prat-note { font-size:.85rem !important; color:rgba(255,255,255,.75) !important; margin:14px 0 0 !important; }
    .prat-cta { display:flex; gap:14px; flex-wrap:wrap; align-items:center; }
    .prat-btn-blanc { background:#fff; color:var(--vert); font-weight:700; padding:13px 24px; border-radius:999px; text-decoration:none; border:0; cursor:pointer; font-size:15px; }
    .prat-btn-blanc:hover { background:#f0f7f4; }
    .prat-btn-vert { background:var(--vert); color:#fff; font-weight:700; padding:13px 26px; border-radius:999px; border:0; cursor:pointer; font-size:15px; }
    .prat-btn-vert:hover { background:#0a4d3e; }
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

    .prat-form-wrap { max-width:720px; margin:0 auto; background:#fff; border:1px solid var(--border); border-radius:20px; box-shadow:var(--s2); padding:28px; }
    .prat-form { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
    .pf { display:flex; flex-direction:column; gap:5px; font-size:13px; color:var(--text3); font-weight:600; }
    .pf--full { grid-column:1 / -1; }
    .pf .champ, .pf textarea.champ { width:100%; box-sizing:border-box; font-size:15px; color:var(--ink); }
    .prat-ok { text-align:center; padding:12px; }
    .prat-ok__ic { display:inline-flex; width:56px; height:56px; align-items:center; justify-content:center; border-radius:50%; background:#f0fdf4; color:#2E8B57; font-size:26px; margin-bottom:12px; }
    .prat-ok h3 { margin:0 0 8px; font-size:20px; font-weight:800; color:var(--ink); }
    .prat-ok p { margin:0 0 18px; color:var(--text3); font-size:14px; line-height:1.55; }

    @media (max-width:860px) {
      .prat-hero__in { grid-template-columns:1fr; gap:28px; padding:40px var(--gutter); }
      .prat-steps { grid-template-columns:1fr; }
      .prat-feats { grid-template-columns:1fr 1fr; }
      .prat-form { grid-template-columns:1fr; }
    }
    @media (max-width:560px) { .prat-feats { grid-template-columns:1fr; } }
  `],
})
export class PraticienComponent {
  private navigateur = isPlatformBrowser(inject(PLATFORM_ID));
  nom = ''; specialite = ''; wilaya = ''; ville = ''; numeroOrdre = ''; telephone = ''; email = ''; message = '';
  envoye = signal(false);
  erreur = signal('');

  /** Fait defiler vers le formulaire de demande. */
  versDemande() {
    if (this.navigateur) document.getElementById('demande')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /** Construit la demande et ouvre la messagerie du praticien vers contact@tabibi.doctor. */
  envoyer() {
    if (!this.nom.trim() || !this.specialite.trim() || !this.wilaya.trim() || !this.numeroOrdre.trim() || !this.telephone.trim()) {
      this.erreur.set('Merci de remplir les champs obligatoires (*).');
      return;
    }
    this.erreur.set('');
    const corps = [
      'Demande pour rejoindre Tabibi (praticien)',
      '',
      'Nom complet : ' + this.nom,
      'Spécialité : ' + this.specialite,
      'Wilaya : ' + this.wilaya,
      'Ville / commune : ' + (this.ville || '—'),
      "N° d'inscription à l'ordre : " + this.numeroOrdre,
      'Téléphone : ' + this.telephone,
      'E-mail : ' + (this.email || '—'),
      '',
      'Message : ' + (this.message || '—'),
    ].join('\n');
    const url = 'mailto:contact@tabibi.doctor?subject=' + encodeURIComponent('Demande praticien — ' + this.nom)
      + '&body=' + encodeURIComponent(corps);
    if (this.navigateur) window.location.href = url;
    this.envoye.set(true);
  }
}
