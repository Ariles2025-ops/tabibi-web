import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { referencerPage } from '../seo/page-seo';

/**
 * Page publique de suppression de compte (/supprimer-mon-compte) : explique la demarche, dans l'appli ou le site
 * (Mon compte → Supprimer mon compte) ou par e-mail. Adresse a declarer dans la Play Console (« URL de suppression
 * du compte ») ; exigence de Google Play et droit a l'effacement de la loi 18-07.
 */
@Component({
    selector: 'app-supprimer-compte',
    imports: [CommonModule, RouterLink],
    template: `
    <main class="pg">
      <a routerLink="/" class="pg-retour">Accueil</a>
      <h1>Supprimer mon compte Tabibi</h1>
      <p class="pg-intro">Vous pouvez supprimer votre compte Tabibi à tout moment, gratuitement, depuis l'application mobile, depuis le site ou par e-mail.</p>

      <section class="pg-carte">
        <h2>1. Dans l'application ou sur le site</h2>
        <ol>
          <li>Connectez-vous à votre compte Tabibi.</li>
          <li>Ouvrez <strong>Mon compte</strong>.</li>
          <li>Choisissez <strong>Supprimer mon compte</strong>, puis confirmez.</li>
        </ol>
        <p>La suppression est immédiate et vous êtes déconnecté.</p>
        <a class="bouton" routerLink="/moi">Ouvrir Mon compte</a>
      </section>

      <section class="pg-carte">
        <h2>2. Par e-mail</h2>
        <p>Écrivez à <a href="mailto:contact@tabibi.doctor?subject=Suppression%20de%20mon%20compte">contact&#64;tabibi.doctor</a>
          depuis l'adresse e-mail de votre compte, ou en indiquant le numéro de téléphone du compte, avec l'objet
          « Suppression de mon compte ». Nous traitons la demande sous un mois au plus et vous confirmons la suppression.</p>
      </section>

      <section class="pg-carte">
        <h2>Ce qui est supprimé</h2>
        <ul>
          <li>Votre compte de connexion (téléphone, e-mail, mot de passe) et votre profil.</li>
          <li>Vos rendez-vous, messages, listes d'attente, demandes Dawini et notifications.</li>
        </ul>
        <h2>Ce qui peut être conservé</h2>
        <ul>
          <li>Les ordonnances, pour leur vérification par les pharmacies et les obligations légales : 10 ans au plus.</li>
          <li>Le journal de sécurité (accès au service) : 12 mois.</li>
          <li>Les sauvegardes, effacées d'elles-mêmes en 60 jours au plus.</li>
        </ul>
        <p>Pour en savoir plus, consultez notre <a href="/legal/confidentialite.html">politique de confidentialité</a>
          et les <a href="/legal/cgu.html">conditions d'utilisation</a>.</p>
      </section>
    </main>
  `,
    styles: [`
    .pg { max-width:760px; margin:0 auto; padding:24px var(--gutter, 16px) 48px; color:var(--ink); }
    .pg-retour { color:var(--vert); font-weight:600; font-size:13px; text-decoration:none; display:inline-block; margin-bottom:18px; }
    h1 { margin:0 0 8px; font-size:clamp(1.6rem,3vw,2.2rem); font-weight:800; letter-spacing:-.02em; line-height:1.15; text-wrap:balance; }
    .pg-intro { margin:0 0 20px; color:var(--text3); line-height:1.6; }
    .pg-carte { background:#fff; border:1px solid var(--border); border-radius:16px; box-shadow:var(--s1); padding:18px 20px; margin-bottom:14px; }
    .pg-carte h2 { font-size:1.05rem; font-weight:700; margin:0 0 10px; }
    .pg-carte h2 + ul { margin-top:0; }
    .pg-carte p, .pg-carte li { color:var(--text3); line-height:1.55; }
    .pg-carte a:not(.bouton) { color:var(--vert); font-weight:700; }
  `]
})
export class SupprimerCompteComponent implements OnInit {
  private document = inject(DOCUMENT);
  private title = inject(Title);
  private meta = inject(Meta);

  ngOnInit() {
    referencerPage(this.document, this.title, this.meta, {
      titre: 'Supprimer mon compte',
      description: "Comment supprimer votre compte Tabibi : depuis l'application ou le site (Mon compte → Supprimer mon compte) ou par e-mail à contact@tabibi.doctor.",
      chemin: '/supprimer-mon-compte',
      ar: false,
      bilingue: false,
    });
  }
}
