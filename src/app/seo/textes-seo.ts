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
  /** `u` : nom avec son article accorde (« une sage-femme »), ignore en arabe. */
  cibleSpecWil: (s: string, w: string, u: string) => string;
  sousTitreSpecWil: (s: string, w: string) => string;
  introSpecWil: (s: string, w: string, u: string) => string;
  descSpecWil: (s: string, w: string) => string;
  titreSpec: (s: string) => string;
  cibleSpec: (s: string, u: string) => string;
  sousTitreSpec: (s: string) => string;
  introSpec: (s: string, u: string) => string;
  descSpec: (s: string) => string;
  titreWil: (w: string) => string;
  cibleWil: (w: string) => string;
  sousTitreWil: (w: string) => string;
  introWil: (w: string) => string;
  descWil: (w: string) => string;
  /** Rubrique Pharmacies (a part des medecins) : lien depuis les pages wilaya, textes sans « rendez-vous ». */
  pharmacies: string;
  /** Variantes pharmacie de chargement / aucun / nombre (la liste des pharmacies n'est pas une liste de praticiens). */
  chargementPharma: string;
  aucunPharma: string;
  nombrePharma: (n: number) => string;
  /** Fiche d'une pharmacie : titre du bloc des autres pharmacies. */
  autresPharmacies: string;
  pharmaciesA: (w: string) => string;
  pharmaciesIntro: string;
  /** w : nom de la wilaya, ou null pour toute l'Algerie. */
  introPharma: (w: string | null) => string;
  descPharma: (w: string | null) => string;
}

const fr: TextesSeo = {
  fil: "Fil d'Ariane",
  accueil: 'Accueil',
  annuaire: 'Médecins',
  specialites: 'Spécialités',
  wilayas: 'Wilayas',
  chargement: 'Chargement des praticiens…',
  erreur: "La liste n'a pas pu être chargée. Réessayez dans un instant.",
  aucun: 'Aucun praticien référencé pour le moment. Consultez les wilayas ou spécialités voisines ci-dessous.',
  reservable: 'Réservable en ligne',
  note: 'La fiche complète et la prise de rendez-vous sont accessibles avec un compte Ndawik gratuit.',
  introuvable: "Cette page n'existe pas.",
  voirTout: 'Voir toutes les spécialités',
  faq: 'Questions fréquentes',
  r1: 'Créez un compte Ndawik gratuit, ouvrez la fiche du praticien et choisissez un créneau disponible. La confirmation est immédiate.',
  q2: 'Faut-il payer en ligne ?',
  r2: "Non. La consultation se règle au cabinet, en espèces ou avec la carte Chifa selon le praticien. Aucun prépaiement n'est demandé.",
  q3: 'Je suis praticien, comment apparaître ici ?',
  r3: 'Retrouvez votre fiche et rejoignez Ndawik depuis la page',
  praticien: 'Vous êtes praticien ?',
  suffixeTitre: 'prendre rendez-vous',
  medecinsA: (w) => `Médecins à ${w}`,
  specA: (s, w) => `${s} à ${w}`,
  nombre: (n) => (n >= 50 ? '50 premiers résultats' : `${n} ${n > 1 ? 'praticiens' : 'praticien'}`),
  autreWilaya: (s) => `${s} dans une autre wilaya`,
  specialitesA: (w, autres) => `${autres ? 'Autres spécialités' : 'Spécialités'} à ${w}`,
  q1: (cible) => `Comment prendre rendez-vous ${cible} ?`,
  pageIntrouvable: 'Page introuvable',
  descIntrouvable: "Cette page de Ndawik n'existe pas.",
  titreIndex: 'Médecins en Algérie',
  introIndex: 'Retrouvez les praticiens référencés sur Ndawik par spécialité ou par wilaya, puis prenez rendez-vous en ligne gratuitement.',
  descIndex: "Ndawik, plateforme médicale : toutes les spécialités médicales et les 69 wilayas d'Algérie. Trouvez un médecin et prenez rendez-vous en ligne.",
  titreSpecWil: (s, w) => `${s} à ${w}`,
  cibleSpecWil: (_s, w, u) => `avec ${u} à ${w}`,
  sousTitreSpecWil: (s, w) => `Praticiens : ${s} à ${w}`,
  introSpecWil: (_s, w, u) => `Trouvez ${u} à ${w} et prenez rendez-vous en ligne avec Ndawik. Paiement au cabinet, rappel avant le rendez-vous.`,
  descSpecWil: (s, w) => `${s} à ${w} : liste des praticiens référencés sur Ndawik. Prenez rendez-vous en ligne, paiement au cabinet.`,
  titreSpec: (s) => `${s} en Algérie`,
  cibleSpec: (_s, u) => `avec ${u}`,
  sousTitreSpec: (s) => `Praticiens : ${s}`,
  introSpec: (_s, u) => `Trouvez ${u} près de chez vous, dans toutes les wilayas d'Algérie, et prenez rendez-vous en ligne avec Ndawik.`,
  descSpec: (s) => `${s} en Algérie : praticiens référencés sur Ndawik dans les 69 wilayas. Choisissez votre wilaya et prenez rendez-vous en ligne.`,
  titreWil: (w) => `Médecins à ${w}`,
  cibleWil: (w) => `avec un médecin à ${w}`,
  sousTitreWil: (w) => `Praticiens à ${w}`,
  introWil: (w) => `Généralistes, spécialistes et dentistes à ${w} : trouvez un praticien et prenez rendez-vous en ligne avec Ndawik.`,
  descWil: (w) => `Médecins à ${w} : praticiens référencés sur Ndawik, toutes spécialités. Prenez rendez-vous en ligne, paiement au cabinet.`,
  pharmacies: 'Pharmacies',
  chargementPharma: 'Chargement des pharmacies…',
  aucunPharma: 'Aucune pharmacie référencée pour le moment.',
  nombrePharma: (n) => (n >= 50 ? '50 premiers résultats' : `${n} ${n > 1 ? 'pharmacies' : 'pharmacie'}`),
  autresPharmacies: 'Autres pharmacies',
  pharmaciesA: (w) => `Pharmacies à ${w}`,
  pharmaciesIntro: "Les pharmacies ont leur propre rubrique, à part des médecins : adresses par wilaya, et bientôt la recherche de médicaments avec Dawini.",
  introPharma: (w) => `Pharmacies ${w ? 'à ' + w : 'en Algérie'} : retrouvez les officines référencées sur Ndawik. Bientôt, demandez la disponibilité d'un médicament avec Dawini.`,
  descPharma: (w) => `Pharmacies ${w ? 'à ' + w : 'en Algérie'} : officines référencées sur Ndawik, avec leur ville. Dawini, la recherche de médicaments en pharmacie, arrive bientôt.`,
};

const ar: TextesSeo = {
  fil: 'مسار التصفح',
  accueil: 'الرئيسية',
  annuaire: 'الأطباء',
  specialites: 'التخصصات',
  wilayas: 'الولايات',
  chargement: 'جارٍ تحميل قائمة الأطباء…',
  erreur: 'تعذّر تحميل القائمة. حاول مرة أخرى بعد قليل.',
  aucun: 'لا يوجد أطباء مسجلون حاليًا. تصفّح الولايات أو التخصصات المجاورة أدناه.',
  reservable: 'الحجز متاح عبر الإنترنت',
  note: 'الصفحة الكاملة للطبيب وحجز الموعد متاحان بحساب نداويك مجاني.',
  introuvable: 'هذه الصفحة غير موجودة.',
  voirTout: 'عرض جميع التخصصات',
  faq: 'أسئلة شائعة',
  r1: 'أنشئ حسابًا مجانيًا على نداويك، افتح صفحة الطبيب واختر موعدًا متاحًا. التأكيد فوري.',
  q2: 'هل يجب الدفع عبر الإنترنت؟',
  r2: 'لا. تُدفع الاستشارة في العيادة نقدًا أو ببطاقة الشفاء حسب الطبيب. لا يُطلب أي دفع مسبق.',
  q3: 'أنا طبيب، كيف أظهر هنا؟',
  r3: 'ابحث عن صفحتك وانضم إلى نداويك عبر صفحة',
  praticien: 'هل أنت طبيب؟',
  suffixeTitre: 'احجز موعدك',
  medecinsA: (w) => `أطباء في ${w}`,
  specA: (s, w) => `${s} في ${w}`,
  nombre: (n) => (n >= 50 ? 'أول 50 نتيجة' : `${n} طبيب`),
  autreWilaya: (s) => `${s} في ولاية أخرى`,
  specialitesA: (w, autres) => `${autres ? 'تخصصات أخرى' : 'التخصصات'} في ${w}`,
  q1: (cible) => `كيف أحجز موعدًا ${cible}؟`,
  pageIntrouvable: 'الصفحة غير موجودة',
  descIntrouvable: 'هذه الصفحة من نداويك غير موجودة.',
  titreIndex: 'الأطباء في الجزائر',
  introIndex: 'ابحث عن الأطباء المسجلين في نداويك حسب التخصص أو الولاية، ثم احجز موعدك عبر الإنترنت مجانًا.',
  descIndex: 'نداويك، منصة طبية: جميع التخصصات الطبية وولايات الجزائر الـ69. ابحث عن طبيب واحجز موعدك عبر الإنترنت.',
  titreSpecWil: (s, w) => `${s} في ${w}`,
  cibleSpecWil: (s, w) => `مع ${s} في ${w}`,
  sousTitreSpecWil: (s, w) => `الأطباء: ${s} في ${w}`,
  introSpecWil: (s, w) => `ابحث عن ${s} في ${w} واحجز موعدك عبر الإنترنت مع نداويك. الدفع في العيادة وتذكير قبل الموعد.`,
  descSpecWil: (s, w) => `${s} في ${w}: قائمة الأطباء المسجلين في نداويك. احجز موعدك عبر الإنترنت، والدفع في العيادة.`,
  titreSpec: (s) => `${s} في الجزائر`,
  cibleSpec: (s) => `مع ${s}`,
  sousTitreSpec: (s) => `الأطباء: ${s}`,
  introSpec: (s) => `ابحث عن ${s} قريب منك في جميع ولايات الجزائر واحجز موعدك عبر الإنترنت مع نداويك.`,
  descSpec: (s) => `${s} في الجزائر: أطباء مسجلون في نداويك في الولايات الـ69. اختر ولايتك واحجز موعدك عبر الإنترنت.`,
  titreWil: (w) => `أطباء في ${w}`,
  cibleWil: (w) => `مع طبيب في ${w}`,
  sousTitreWil: (w) => `الأطباء في ${w}`,
  introWil: (w) => `أطباء عامون وأخصائيون وأطباء أسنان في ${w}: ابحث عن طبيب واحجز موعدك عبر الإنترنت مع نداويك.`,
  descWil: (w) => `أطباء في ${w}: أطباء مسجلون في نداويك من جميع التخصصات. احجز موعدك عبر الإنترنت، والدفع في العيادة.`,
  pharmacies: 'الصيدليات',
  chargementPharma: 'جارٍ تحميل قائمة الصيدليات…',
  aucunPharma: 'لا توجد صيدليات مسجلة حاليًا.',
  nombrePharma: (n) => (n >= 50 ? 'أول 50 نتيجة' : `${n} صيدلية`),
  autresPharmacies: 'صيدليات أخرى',
  pharmaciesA: (w) => `الصيدليات في ${w}`,
  pharmaciesIntro: 'للصيدليات قسم خاص بها منفصل عن الأطباء: العناوين حسب الولاية، وقريبًا البحث عن الأدوية مع دوايني.',
  introPharma: (w) => `الصيدليات ${w ? 'في ' + w : 'في الجزائر'}: تصفّح الصيدليات المسجلة في نداويك. قريبًا، اسأل عن توفر دواء مع دوايني.`,
  descPharma: (w) => `الصيدليات ${w ? 'في ' + w : 'في الجزائر'}: صيدليات مسجلة في نداويك مع مدينتها. دوايني، البحث عن الأدوية في الصيدليات، قريبًا.`,
};

export const TEXTES_SEO: Record<'fr' | 'ar', TextesSeo> = { fr, ar };
