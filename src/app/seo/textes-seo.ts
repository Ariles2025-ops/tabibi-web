/**
 * Textes des pages publiques de referencement, en francais et en arabe (pages /ar/...).
 * Les noms de specialites et de wilayas sont deja traduits dans referentiel-seo.ts (nom / nomAr).
 */
export interface TextesSeo {
  fil: string;
  accueil: string;
  annuaire: string;
  specialites: string;
  wilayas: string;
  chargement: string;
  erreur: string;
  aucun: string;
  reservable: string;
  note: string;
  introuvable: string;
  voirTout: string;
  faq: string;
  r1: string;
  q2: string;
  r2: string;
  q3: string;
  r3: string;
  praticien: string;
  suffixeTitre: string;
  medecinsA: (w: string) => string;
  specA: (s: string, w: string) => string;
  nombre: (n: number) => string;
  autreWilaya: (s: string) => string;
  specialitesA: (w: string, autres: boolean) => string;
  q1: (cible: string) => string;
  pageIntrouvable: string;
  descIntrouvable: string;
  titreIndex: string;
  introIndex: string;
  descIndex: string;
  titreSpecWil: (s: string, w: string) => string;
  cibleSpecWil: (s: string, w: string) => string;
  sousTitreSpecWil: (s: string, w: string) => string;
  introSpecWil: (s: string, w: string) => string;
  descSpecWil: (s: string, w: string) => string;
  titreSpec: (s: string) => string;
  cibleSpec: (s: string) => string;
  sousTitreSpec: (s: string) => string;
  introSpec: (s: string) => string;
  descSpec: (s: string) => string;
  titreWil: (w: string) => string;
  cibleWil: (w: string) => string;
  sousTitreWil: (w: string) => string;
  introWil: (w: string) => string;
  descWil: (w: string) => string;
}

const fr: TextesSeo = {
  fil: "Fil d'Ariane",
  accueil: 'Accueil',
  annuaire: 'Annuaire',
  specialites: 'Spécialités',
  wilayas: 'Wilayas',
  chargement: 'Chargement des praticiens…',
  erreur: "La liste n'a pas pu être chargée. Réessayez dans un instant.",
  aucun: 'Aucun praticien référencé pour le moment. Consultez les wilayas ou spécialités voisines ci-dessous.',
  reservable: 'Réservable en ligne',
  note: 'La fiche complète et la prise de rendez-vous sont accessibles avec un compte Tabibi gratuit.',
  introuvable: "Cette page n'existe pas.",
  voirTout: 'Voir toutes les spécialités',
  faq: 'Questions fréquentes',
  r1: 'Créez un compte Tabibi gratuit, ouvrez la fiche du praticien et choisissez un créneau disponible. La confirmation est immédiate.',
  q2: 'Faut-il payer en ligne ?',
  r2: "Non. La consultation se règle au cabinet, en espèces ou avec la carte Chifa selon le praticien. Aucun prépaiement n'est demandé.",
  q3: 'Je suis praticien, comment apparaître ici ?',
  r3: 'Retrouvez votre fiche et créez votre compte sur la page',
  praticien: 'Vous êtes praticien ?',
  suffixeTitre: 'prendre rendez-vous',
  medecinsA: (w) => `Médecins à ${w}`,
  specA: (s, w) => `${s} à ${w}`,
  nombre: (n) => (n >= 50 ? '50 premiers résultats' : `${n} ${n > 1 ? 'praticiens' : 'praticien'}`),
  autreWilaya: (s) => `${s} dans une autre wilaya`,
  specialitesA: (w, autres) => `${autres ? 'Autres spécialités' : 'Spécialités'} à ${w}`,
  q1: (cible) => `Comment prendre rendez-vous ${cible} ?`,
  pageIntrouvable: 'Page introuvable',
  descIntrouvable: "Cette page de l'annuaire Tabibi n'existe pas.",
  titreIndex: 'Annuaire des médecins en Algérie',
  introIndex: 'Retrouvez les praticiens référencés sur Tabibi par spécialité ou par wilaya, puis prenez rendez-vous en ligne gratuitement.',
  descIndex: "Annuaire Tabibi : toutes les spécialités médicales et les 69 wilayas d'Algérie. Trouvez un médecin et prenez rendez-vous en ligne.",
  titreSpecWil: (s, w) => `${s} à ${w}`,
  cibleSpecWil: (s, w) => `avec un ${s.toLowerCase()} à ${w}`,
  sousTitreSpecWil: (s, w) => `Praticiens : ${s} à ${w}`,
  introSpecWil: (s, w) => `Trouvez un ${s.toLowerCase()} à ${w} et prenez rendez-vous en ligne avec Tabibi. Paiement au cabinet, rappel avant le rendez-vous.`,
  descSpecWil: (s, w) => `${s} à ${w} : liste des praticiens référencés sur Tabibi. Prenez rendez-vous en ligne, paiement au cabinet.`,
  titreSpec: (s) => `${s} en Algérie`,
  cibleSpec: (s) => `avec un ${s.toLowerCase()}`,
  sousTitreSpec: (s) => `Praticiens : ${s}`,
  introSpec: (s) => `Trouvez un ${s.toLowerCase()} près de chez vous, dans toutes les wilayas d'Algérie, et prenez rendez-vous en ligne avec Tabibi.`,
  descSpec: (s) => `${s} en Algérie : praticiens référencés sur Tabibi dans les 69 wilayas. Choisissez votre wilaya et prenez rendez-vous en ligne.`,
  titreWil: (w) => `Médecins à ${w}`,
  cibleWil: (w) => `avec un médecin à ${w}`,
  sousTitreWil: (w) => `Praticiens à ${w}`,
  introWil: (w) => `Généralistes, spécialistes et dentistes à ${w} : trouvez un praticien et prenez rendez-vous en ligne avec Tabibi.`,
  descWil: (w) => `Médecins à ${w} : praticiens référencés sur Tabibi, toutes spécialités. Prenez rendez-vous en ligne, paiement au cabinet.`,
};

const ar: TextesSeo = {
  fil: 'مسار التصفح',
  accueil: 'الرئيسية',
  annuaire: 'دليل الأطباء',
  specialites: 'التخصصات',
  wilayas: 'الولايات',
  chargement: 'جارٍ تحميل قائمة الأطباء…',
  erreur: 'تعذّر تحميل القائمة. حاول مرة أخرى بعد قليل.',
  aucun: 'لا يوجد أطباء مسجلون حاليًا. تصفّح الولايات أو التخصصات المجاورة أدناه.',
  reservable: 'الحجز متاح عبر الإنترنت',
  note: 'الصفحة الكاملة للطبيب وحجز الموعد متاحان بحساب طبيبي مجاني.',
  introuvable: 'هذه الصفحة غير موجودة.',
  voirTout: 'عرض جميع التخصصات',
  faq: 'أسئلة شائعة',
  r1: 'أنشئ حسابًا مجانيًا على طبيبي، افتح صفحة الطبيب واختر موعدًا متاحًا. التأكيد فوري.',
  q2: 'هل يجب الدفع عبر الإنترنت؟',
  r2: 'لا. تُدفع الاستشارة في العيادة نقدًا أو ببطاقة الشفاء حسب الطبيب. لا يُطلب أي دفع مسبق.',
  q3: 'أنا طبيب، كيف أظهر هنا؟',
  r3: 'ابحث عن صفحتك وأنشئ حسابك عبر صفحة',
  praticien: 'هل أنت طبيب؟',
  suffixeTitre: 'احجز موعدك',
  medecinsA: (w) => `أطباء في ${w}`,
  specA: (s, w) => `${s} في ${w}`,
  nombre: (n) => (n >= 50 ? 'أول 50 نتيجة' : `${n} طبيب`),
  autreWilaya: (s) => `${s} في ولاية أخرى`,
  specialitesA: (w, autres) => `${autres ? 'تخصصات أخرى' : 'التخصصات'} في ${w}`,
  q1: (cible) => `كيف أحجز موعدًا ${cible}؟`,
  pageIntrouvable: 'الصفحة غير موجودة',
  descIntrouvable: 'هذه الصفحة من دليل طبيبي غير موجودة.',
  titreIndex: 'دليل الأطباء في الجزائر',
  introIndex: 'ابحث عن الأطباء المسجلين في طبيبي حسب التخصص أو الولاية، ثم احجز موعدك عبر الإنترنت مجانًا.',
  descIndex: 'دليل طبيبي: جميع التخصصات الطبية وولايات الجزائر الـ69. ابحث عن طبيب واحجز موعدك عبر الإنترنت.',
  titreSpecWil: (s, w) => `${s} في ${w}`,
  cibleSpecWil: (s, w) => `مع ${s} في ${w}`,
  sousTitreSpecWil: (s, w) => `الأطباء: ${s} في ${w}`,
  introSpecWil: (s, w) => `ابحث عن ${s} في ${w} واحجز موعدك عبر الإنترنت مع طبيبي. الدفع في العيادة وتذكير قبل الموعد.`,
  descSpecWil: (s, w) => `${s} في ${w}: قائمة الأطباء المسجلين في طبيبي. احجز موعدك عبر الإنترنت، والدفع في العيادة.`,
  titreSpec: (s) => `${s} في الجزائر`,
  cibleSpec: (s) => `مع ${s}`,
  sousTitreSpec: (s) => `الأطباء: ${s}`,
  introSpec: (s) => `ابحث عن ${s} قريب منك في جميع ولايات الجزائر واحجز موعدك عبر الإنترنت مع طبيبي.`,
  descSpec: (s) => `${s} في الجزائر: أطباء مسجلون في طبيبي في الولايات الـ69. اختر ولايتك واحجز موعدك عبر الإنترنت.`,
  titreWil: (w) => `أطباء في ${w}`,
  cibleWil: (w) => `مع طبيب في ${w}`,
  sousTitreWil: (w) => `الأطباء في ${w}`,
  introWil: (w) => `أطباء عامون وأخصائيون وأطباء أسنان في ${w}: ابحث عن طبيب واحجز موعدك عبر الإنترنت مع طبيبي.`,
  descWil: (w) => `أطباء في ${w}: أطباء مسجلون في طبيبي من جميع التخصصات. احجز موعدك عبر الإنترنت، والدفع في العيادة.`,
};

export const TEXTES_SEO: Record<'fr' | 'ar', TextesSeo> = { fr, ar };
