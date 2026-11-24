import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Conversation, LONGUEUR_MAX_MESSAGE, Message, MessagerieService, abregerIdentifiant, derniereActivite, libelleMedecin, trierParActivite } from './messagerie.service';

const BASE = 'http://localhost:8080';

const CONVERSATION: Conversation = {
  id: 'c1',
  patientId: '22222222-2222-2222-2222-222222222222',
  medecinId: '33333333-3333-3333-3333-333333333333',
  creeLe: '2026-09-18T10:00:00Z',
  dernierMessageLe: '2026-09-18T10:05:00Z',
  nonLus: 1,
  fermee: false,
};

const MESSAGE: Message = {
  id: 'm1',
  conversationId: 'c1',
  auteurId: '22222222-2222-2222-2222-222222222222',
  contenu: 'Bonjour docteur, dois-je poursuivre le traitement ?',
  envoyeLe: '2026-09-18T10:05:00Z',
  luLe: null,
};

describe('MessagerieService', () => {
  let service: MessagerieService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(MessagerieService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('ouvre une conversation par POST /api/conversations avec { medecinId }', () => {
    let recu: Conversation | undefined;
    service.ouvrir(CONVERSATION.medecinId).subscribe((c) => (recu = c));

    const requete = http.expectOne(`${BASE}/api/conversations`);
    expect(requete.request.method).toBe('POST');
    expect(requete.request.body).toEqual({ medecinId: CONVERSATION.medecinId });
    requete.flush(CONVERSATION, { status: 201, statusText: 'Created' });

    expect(recu).toEqual(CONVERSATION);
  });

  it('lit mes conversations sur GET /api/conversations', () => {
    let recu: Conversation[] | undefined;
    service.mesConversations().subscribe((liste) => (recu = liste));

    const requete = http.expectOne(`${BASE}/api/conversations`);
    expect(requete.request.method).toBe('GET');
    requete.flush([CONVERSATION]);

    expect(recu).toEqual([CONVERSATION]);
  });

  it('lit les messages sur GET /api/conversations/{id}/messages', () => {
    let recu: Message[] | undefined;
    service.messages('c1').subscribe((liste) => (recu = liste));

    const requete = http.expectOne(`${BASE}/api/conversations/c1/messages`);
    expect(requete.request.method).toBe('GET');
    requete.flush([MESSAGE]);

    expect(recu).toEqual([MESSAGE]);
  });

  it('envoie un message par POST /api/conversations/{id}/messages avec { contenu }', () => {
    let recu: Message | undefined;
    service.envoyer('c1', MESSAGE.contenu).subscribe((m) => (recu = m));

    const requete = http.expectOne(`${BASE}/api/conversations/c1/messages`);
    expect(requete.request.method).toBe('POST');
    expect(requete.request.body).toEqual({ contenu: MESSAGE.contenu });
    requete.flush(MESSAGE, { status: 201, statusText: 'Created' });

    expect(recu).toEqual(MESSAGE);
  });

  it('ferme une conversation par POST /api/conversations/{id}/fermer', () => {
    let fini = false;
    service.fermer('c1').subscribe(() => (fini = true));

    const requete = http.expectOne(`${BASE}/api/conversations/c1/fermer`);
    expect(requete.request.method).toBe('POST');
    requete.flush(null, { status: 204, statusText: 'No Content' });

    expect(fini).toBeTrue();
  });

  it('transmet le { erreur } d un 403 (aucun rendez-vous commun) et d un 400 (message vide)', () => {
    let statut = 0;
    let message = '';
    service.ouvrir(CONVERSATION.medecinId).subscribe({
      error: (e) => {
        statut = e.status;
        message = e.error.erreur;
      },
    });
    http.expectOne(`${BASE}/api/conversations`)
      .flush({ erreur: 'Aucun rendez-vous commun.' }, { status: 403, statusText: 'Forbidden' });
    expect(statut).toBe(403);
    expect(message).toBe('Aucun rendez-vous commun.');

    service.envoyer('c1', '').subscribe({
      error: (e) => {
        statut = e.status;
        message = e.error.erreur;
      },
    });
    http.expectOne(`${BASE}/api/conversations/c1/messages`)
      .flush({ erreur: 'Le contenu du message est obligatoire.' }, { status: 400, statusText: 'Bad Request' });
    expect(statut).toBe(400);
    expect(message).toBe('Le contenu du message est obligatoire.');
  });

  it('borne un message a 2000 caracteres et abrege un identifiant a huit caracteres', () => {
    expect(LONGUEUR_MAX_MESSAGE).toBe(2000);
    expect(abregerIdentifiant('22222222-2222-2222-2222-222222222222')).toBe('22222222');
    expect(abregerIdentifiant('p1')).toBe('p1');
  });
});

describe('libelleMedecin', () => {
  it('repli d un praticien dont la fiche est indisponible : « Médecin » + identifiant abrégé, comme dans l appli', () => {
    expect(libelleMedecin('33333333-3333-3333-3333-333333333333')).toBe('Médecin 33333333');
    expect(libelleMedecin('33333333-3333-3333-3333-333333333333', true)).toBe('طبيب 33333333');
  });

  it('sans identifiant : « Médecin inconnu » / « طبيب غير معروف »', () => {
    expect(libelleMedecin('')).toBe('Médecin inconnu');
    expect(libelleMedecin(null, true)).toBe('طبيب غير معروف');
  });
});

describe('trierParActivite', () => {
  const c = (id: string, dernierMessageLe: string, creeLe: string): Conversation => ({ ...CONVERSATION, id, dernierMessageLe, creeLe });

  it('prend le dernier message, sinon la date d ouverture, sinon rien', () => {
    expect(derniereActivite(c('a', '2026-09-18T10:05:00Z', '2026-09-18T10:00:00Z'))).toBe(Date.parse('2026-09-18T10:05:00Z'));
    expect(derniereActivite(c('a', '', '2026-09-18T10:00:00Z'))).toBe(Date.parse('2026-09-18T10:00:00Z'));
    expect(derniereActivite(c('a', 'pas une date', ''))).toBeNull();
  });

  it('classe du plus récent au plus ancien, sans date en fin, sans modifier la liste d origine', () => {
    const liste = [
      c('sans-date', '', ''),
      c('vieille', '2026-09-10T10:00:00Z', '2026-09-01T10:00:00Z'),
      c('ouverte', '', '2026-09-15T10:00:00Z'),
      c('recente', '2026-09-18T10:05:00Z', '2026-09-18T10:00:00Z'),
    ];
    expect(trierParActivite(liste).map((x) => x.id)).toEqual(['recente', 'ouverte', 'vieille', 'sans-date']);
    expect(liste[0].id).toBe('sans-date');
  });
});
