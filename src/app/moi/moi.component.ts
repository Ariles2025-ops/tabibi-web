import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { VISIO_ACTIVE, inscriptionFermee } from '../lancement';
import { RoleService } from '../auth/role.service';
import { LangueService } from '../partage/langue.service';
import { SelecteurLangueComponent } from '../partage/selecteur-langue.component';
import { ApiDisponibleService } from '../partage/api-disponible.service';
import { MoiService } from './moi.service';
import { marquerCompteSupprime } from './compte-supprime';

/** Libelles francais des roles metier ; tout autre role (technique) n'est pas affiche. */
const LIBELLES_ROLES: Partial<Record<string, [string, string]>> = {
  PATIENT: ['Patient', 'مريض'],
  MEDECIN: ['Médecin', 'طبيب'],
  SECRETAIRE: ['Secrétaire', 'سكرتيرة'],
  PHARMACIE: ['Pharmacie', 'صيدلية'],
  ADMIN: ['Administrateur', 'مسؤول'],
};

interface Raccourci { lien: string; libelle: string; badge?: string; }

/**
 * Mon compte : utilisateur connecte, role en francais, acces rapides selon le role, deconnexion et suppression
 * du compte (confirmation en deux temps dans la page, puis DELETE /api/moi et deconnexion).
 */
@Component({
    selector: 'app-moi',
    imports: [CommonModule, RouterLink, SelecteurLangueComponent],
    template: `
    <main style="max-width:640px;margin:40px auto;padding:0 16px" [attr.dir]="l.ar() ? 'rtl' : null" [attr.lang]="l.ar() ? 'ar' : null">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
        <h1 style="color:var(--vert);margin:0">{{ l.t('Mon compte', 'حسابي') }}</h1>
        <app-selecteur-langue />
      </div>
      <div *ngIf="!connecte()" style="display:flex;flex-direction:column;gap:12px;max-width:420px">
        <p *ngIf="inscriptionOuverte()" style="color:var(--text3);margin:0">{{ l.t('Créez votre compte avec votre adresse e-mail, ou connectez-vous par téléphone (code SMS), pour prendre rendez-vous.', 'أنشئ حسابك ببريدك الإلكتروني، أو سجّل الدخول برقم هاتفك (رمز SMS)، لحجز موعد.') }}</p>
        <p *ngIf="!inscriptionOuverte()" style="color:var(--text3);margin:0">{{ l.t('Connectez-vous avec votre compte Ndawik. Les comptes sont créés sur demande pendant la phase de test.', 'سجّل الدخول بحسابك في نداويك. تُنشأ الحسابات عند الطلب خلال مرحلة التجربة.') }} {{ l.t('Médecin ? Faites votre demande sur la page', 'طبيب؟ قدّم طلبك في صفحة') }} <a routerLink="/praticien" style="color:var(--vert)">{{ l.t('Vous êtes praticien ?', 'هل أنت ممارس صحي؟') }}</a></p>
        <button type="button" class="bouton" (click)="seConnecter()">{{ l.t('Se connecter', 'تسجيل الدخول') }}</button>
        <button *ngIf="inscriptionOuverte()" type="button" class="bouton-secondaire" (click)="sInscrireParEmail()">{{ l.t('Créer un compte', 'إنشاء حساب') }}</button>
      </div>
      <div *ngIf="connecte()">
        <p *ngIf="moi()?.nom?.trim() as nom; else sansNom">{{ l.t('Connecté en tant que', 'متصل باسم') }} <b>{{ nom }}</b></p>
        <ng-template #sansNom><p>{{ l.t('Vous êtes connecté(e).', 'أنت متصل.') }}</p></ng-template>
        <p *ngIf="rolesAffiches().length">{{ rolesAffiches().length > 1 ? l.t('Rôles', 'الأدوار') : l.t('Rôle', 'الدور') }} : {{ rolesAffiches().join(l.ar() ? '، ' : ', ') }}</p>
        <nav [attr.aria-label]="l.t('Accès rapides', 'وصول سريع')" style="display:flex;gap:8px;flex-wrap:wrap;margin:16px 0">
          <a *ngFor="let r of raccourcis(); let premier = first" [class.bouton]="premier" [class.bouton-secondaire]="!premier" [routerLink]="r.lien">{{ r.libelle }}<span *ngIf="r.badge" class="pastille-bientot">{{ r.badge }}</span></a>
        </nav>
        <p style="display:flex;gap:8px;flex-wrap:wrap">
          <button type="button" class="bouton-secondaire" (click)="seDeconnecter()">{{ l.t('Se déconnecter', 'تسجيل الخروج') }}</button>
        </p>

        <section aria-labelledby="titre-suppression" style="margin-top:32px;padding:16px;border:1px solid var(--border);border-radius:16px;background:#fff">
          <h2 id="titre-suppression" style="font-size:1.05rem;margin:0 0 6px">{{ l.t('Supprimer mon compte', 'حذف حسابي') }}</h2>
          <p style="color:var(--text3);margin:0 0 12px;font-size:.95rem">
            {{ l.t("Votre compte et vos données personnelles (profil, messages, listes d'attente) sont effacés définitivement, et vos rendez-vous à venir sont annulés. Les ordonnances et le journal de sécurité sont conservés le temps exigé par la loi. Vos rendez-vous passés restent, sans aucun lien avec vous, dans l'agenda du médecin, et la note (sans commentaire) de vos avis est conservée. Médecin : vos rendez-vous à venir sont annulés (patients prévenus) et votre fiche publique est retirée.", 'يُحذف حسابك وبياناتك الشخصية (الملف الشخصي والرسائل وقوائم الانتظار) نهائيًا، وتُلغى مواعيدك القادمة. يُحتفظ بالوصفات الطبية وسجل الأمان للمدة التي يفرضها القانون. تبقى مواعيدك السابقة، دون أي صلة بك، في أجندة الطبيب، ويُحتفظ بتقييم (النجوم) آرائك دون التعليق. الطبيب: تُلغى مواعيدك القادمة (ويُبلَّغ المرضى) وتُسحب صفحتك العامة.') }}
            <a routerLink="/supprimer-mon-compte" style="color:var(--vert)">{{ l.t('En savoir plus', 'اعرف المزيد') }}</a>
          </p>
          <button *ngIf="!confirmation()" type="button" class="bouton-secondaire" style="color:var(--red);border-color:var(--red)"
                  (click)="confirmation.set(true)">{{ l.t('Supprimer mon compte', 'حذف حسابي') }}</button>
          <div *ngIf="confirmation()" role="alert" style="display:flex;flex-direction:column;gap:10px">
            <p style="margin:0;color:var(--red);font-weight:600">{{ l.t('Cette action est définitive. Confirmez-vous la suppression de votre compte ?', 'هذا الإجراء نهائي. هل تؤكد حذف حسابك؟') }}</p>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <button type="button" class="bouton" style="background:var(--red);border-color:var(--red)"
                      (click)="supprimer()" [disabled]="suppressionEnCours()">
                {{ suppressionEnCours() ? l.t('Suppression…', 'جارٍ الحذف…') : l.t('Oui, supprimer définitivement', 'نعم، احذف نهائيًا') }}
              </button>
              <button type="button" class="bouton-secondaire" (click)="confirmation.set(false)" [disabled]="suppressionEnCours()">{{ l.t('Annuler', 'إلغاء') }}</button>
            </div>
          </div>
          <p *ngIf="erreurSuppression()" style="color:var(--red);margin:10px 0 0">{{ erreurSuppression() }}</p>
        </section>
      </div>
    </main>
  `
})
export class MoiComponent implements OnInit {
  l = inject(LangueService);
  private auth = inject(AuthService);
  private roleService = inject(RoleService);
  private moiService = inject(MoiService);
  private apiDisponible = inject(ApiDisponibleService);
  connecte = signal(false);
  /** Profil /api/moi, lu depuis le cache de RoleService (une seule requete par chargement de page). */
  moi = this.roleService.moi;
  private roles = computed(() => (this.moi()?.roles ?? []).map((r) => r.toUpperCase()));
  /** Roles metier en francais ; les roles techniques de Keycloak (default-roles-tabibi, offline_access...) sont masques. */
  rolesAffiches = computed(() =>
    this.roles()
      .map((r) => LIBELLES_ROLES[r])
      .filter((x): x is [string, string] => !!x)
      .map(([fr, ar]) => (this.l.ar() ? ar : fr)),
  );

  /** Acces rapides selon le role (espace professionnel d'abord, sinon les pages patient). */
  raccourcis = computed<Raccourci[]>(() => {
    const r = this.roles();
    const t = (fr: string, ar: string) => this.l.t(fr, ar);
    const profil = { lien: '/moi/profil', libelle: t('Mon profil', 'ملفي الشخصي') };
    const notifications = { lien: '/notifications', libelle: t('Notifications', 'الإشعارات') };
    // Comme « Mon espace » de l'appli : l'invitation d'un médecin arrive à un compte patient, qui doit pouvoir l'ouvrir.
    const invitations = { lien: '/invitations', libelle: t('Invitations de cabinet', 'دعوات العيادات') };
    // Comme « Ma candidature de médecin » du profil de l'appli : un compte non médecin peut déposer ou suivre sa candidature.
    const candidature = { lien: '/medecin/candidature', libelle: t('Ma candidature de médecin', 'ترشحي كطبيب') };
    // L'API (GET /api/conversations) réserve la messagerie aux rôles PATIENT et MEDECIN : pas de lien vers une impasse (403) pour les autres.
    const messagerie = { lien: '/messagerie', libelle: t('Messagerie', 'الرسائل') };
    // Comme « Vérifier une ordonnance » de « Mon compte » dans l'appli, ouvert à tous les rôles.
    const verifier = { lien: this.l.ar() ? '/ar/verifier' : '/verifier', libelle: t('Vérifier une ordonnance', 'التحقق من وصفة طبية') };
    // Comme « Téléconsultation » de « Mon compte » dans l'appli : toujours visible, avec « Bientôt » tant que la visio n'est pas ouverte.
    const visio = {
      lien: r.includes('MEDECIN') ? '/medecin/teleconsultations' : '/teleconsultations',
      libelle: VISIO_ACTIVE ? t('Téléconsultations', 'الاستشارات عن بُعد') : t('Téléconsultation', 'الاستشارة عن بُعد'),
      badge: VISIO_ACTIVE ? undefined : t('Bientôt', 'قريبًا'),
    };
    // Comme « Mon espace » de l'appli : un compte à plusieurs rôles professionnels retrouve chacun de ses espaces
    // (médecin, secrétaire, pharmacie), pas seulement le premier.
    // Comme « Mon activité » et « Services » de « Mon compte » de l'appli (comptePro) : un compte médecin, secrétaire ou
    // pharmacie sans rôle PATIENT n'a pas « Mes avis », « Mes listes d'attente » ni Dawini (ces pages lui répondraient
    // « réservée aux patients ») ; avec le rôle PATIENT en plus, il les garde.
    const comptePro = ['MEDECIN', 'SECRETAIRE', 'PHARMACIE'].some((x) => r.includes(x)) && !r.includes('PATIENT');
    const mesAvis = { lien: '/mes-avis', libelle: t('Mes avis', 'آرائي') };
    const listesAttente = { lien: '/liste-attente', libelle: t("Mes listes d'attente", 'قوائم الانتظار') };
    const dawini = { lien: '/dawini', libelle: t('Dawini (pharmacies)', 'داويني (الصيدليات)') };
    const espaces: Raccourci[] = [];
    if (r.includes('MEDECIN')) {
      espaces.push(
        { lien: '/medecin/agenda', libelle: t('Mon agenda', 'المواعيد') },
        { lien: '/medecin/disponibilites', libelle: t('Disponibilités', 'الأوقات المتاحة') },
        // Comme « Mon espace » de l'appli : ordonnances rédigées, liste d'attente, avis et secrétaires du médecin.
        { lien: '/medecin/ordonnances', libelle: t('Mes ordonnances rédigées', 'وصفاتي التي حررتها') },
        { lien: '/medecin/liste-attente', libelle: t("Liste d'attente", 'قائمة الانتظار') },
        { lien: '/medecin/avis', libelle: t('Avis des patients', 'آراء المرضى') },
        { lien: '/medecin/secretaires', libelle: t('Mes secrétaires', 'سكرتيراتي') },
        // Comme « Ma fiche » de « Mon espace » dans l'appli : visible seulement si la route de l'API existe (sonde faite par le menu).
        ...(this.apiDisponible.ficheMedecin() ? [{ lien: '/medecin/ma-fiche', libelle: t('Ma fiche', 'صفحتي') }] : []),
      );
    }
    if (r.includes('SECRETAIRE')) espaces.push({ lien: '/secretaire', libelle: t('Agenda du cabinet', 'مواعيد العيادة') });
    if (r.includes('PHARMACIE')) espaces.push({ lien: '/pharmacie', libelle: t('Demandes de médicaments', 'طلبات الأدوية') });
    if (r.includes('ADMIN')) espaces.push({ lien: '/admin', libelle: t('Administration', 'الإدارة') });
    if (espaces.length > 0) {
      return [
        ...espaces,
        ...(r.includes('PATIENT') || r.includes('MEDECIN') ? [messagerie] : []),
        visio,
        ...(comptePro ? [] : [mesAvis, listesAttente, dawini]),
        verifier,
        // Comme « Cabinet » de « Mon espace » dans l'appli : les invitations de cabinet sont ouvertes à tous les rôles.
        invitations,
        ...(r.includes('MEDECIN') || !(r.includes('SECRETAIRE') || r.includes('PHARMACIE')) ? [] : [candidature]),
        profil,
        notifications,
      ];
    }
    // Patient : « Mon activité » et « Services » de « Mon compte » de l'appli (messagerie, avis, listes d'attente, Dawini).
    return [
      profil,
      { lien: '/mes-rendez-vous', libelle: t('Mes rendez-vous', 'مواعيدي') },
      { lien: '/mes-ordonnances', libelle: t('Mes ordonnances', 'وصفاتي الطبية') },
      messagerie,
      visio,
      mesAvis,
      listesAttente,
      dawini,
      verifier,
      invitations,
      candidature,
      notifications,
    ];
  });

  /** Seconde etape de la suppression du compte affichee (pas de confirm() du navigateur). */
  confirmation = signal(false);
  suppressionEnCours = signal(false);
  erreurSuppression = signal('');

  async ngOnInit() {
    await this.auth.pret();
    if (this.auth.estConnecte()) {
      this.connecte.set(true);
      this.roleService.charger();
    }
  }

  seConnecter() { this.auth.seConnecter(); }
  sInscrireParEmail() { this.auth.sInscrireParEmail(); }
  inscriptionOuverte() { return !inscriptionFermee(); }
  seDeconnecter() { this.auth.seDeconnecter(); this.connecte.set(false); }

  /** DELETE /api/moi (204) puis deconnexion : la session Keycloak du compte supprime n'a plus d'objet. */
  supprimer() {
    this.suppressionEnCours.set(true);
    this.erreurSuppression.set('');
    this.moiService.supprimer().subscribe({
      next: () => {
        this.suppressionEnCours.set(false);
        marquerCompteSupprime();
        this.seDeconnecter();
      },
      error: (e: HttpErrorResponse) => {
        this.suppressionEnCours.set(false);
        if (e.status === 401) {
          this.auth.seConnecter('/moi');
        } else {
          this.erreurSuppression.set(
            e.error?.erreur ??
              this.l.t(
                'La suppression a échoué. Réessayez ou écrivez à contact@ndawik.com.',
                'فشل الحذف. أعد المحاولة أو راسلنا على contact@ndawik.com.',
              ),
          );
        }
      },
    });
  }
}
