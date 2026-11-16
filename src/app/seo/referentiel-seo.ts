/** Referentiel fige pour les pages de referencement (genere depuis assets/referentiel.json). */
/**
 * `article` : article indefini francais accorde (« une sage-femme », « une clinique privée », « un ORL »),
 * utilise par les textes des pages (textes-seo.ts) au lieu d'un « un » fixe.
 */
export interface SpecialiteSeo { slug: string; nom: string; nomAr: string; article: 'un' | 'une'; }
export interface WilayaSeo { code: string; nom: string; nomAr: string; slug: string; }

export const SPECIALITES_SEO: SpecialiteSeo[] = [
 {
  "slug": "allergologue",
  "nom": "Allergologue",
  "nomAr": "طبيب الحساسية",
  "article": "un"
 },
 {
  "slug": "anesthesiste",
  "nom": "Anesthésiste-réanimateur",
  "nomAr": "طبيب التخدير والإنعاش",
  "article": "un"
 },
 {
  "slug": "cardiologue",
  "nom": "Cardiologue",
  "nomAr": "طبيب القلب",
  "article": "un"
 },
 {
  "slug": "centre-sante",
  "nom": "Centre de santé",
  "nomAr": "مركز صحي",
  "article": "un"
 },
 {
  "slug": "chirurgien",
  "nom": "Chirurgien général",
  "nomAr": "جراح عام",
  "article": "un"
 },
 {
  "slug": "chirurgien-orthopediste",
  "nom": "Chirurgien orthopédiste",
  "nomAr": "جراح العظام",
  "article": "un"
 },
 {
  "slug": "clinique-privee",
  "nom": "Clinique privée",
  "nomAr": "عيادة خاصة",
  "article": "une"
 },
 {
  "slug": "dentiste",
  "nom": "Dentiste",
  "nomAr": "طبيب الأسنان",
  "article": "un"
 },
 {
  "slug": "dermatologue",
  "nom": "Dermatologue",
  "nomAr": "طبيب الجلد",
  "article": "un"
 },
 {
  "slug": "endocrinologue",
  "nom": "Endocrinologue",
  "nomAr": "طبيب الغدد الصماء",
  "article": "un"
 },
 {
  "slug": "gastro-enterologue",
  "nom": "Gastro-entérologue",
  "nomAr": "طبيب الجهاز الهضمي",
  "article": "un"
 },
 {
  "slug": "gynecologue",
  "nom": "Gynécologue",
  "nomAr": "طبيب النساء والتوليد",
  "article": "un"
 },
 {
  "slug": "hematologue",
  "nom": "Hématologue",
  "nomAr": "طبيب أمراض الدم",
  "article": "un"
 },
 {
  "slug": "hopital",
  "nom": "Hôpital",
  "nomAr": "مستشفى",
  "article": "un"
 },
 {
  "slug": "kinesitherapeute",
  "nom": "Kinésithérapeute",
  "nomAr": "أخصائي العلاج الطبيعي",
  "article": "un"
 },
 {
  "slug": "laboratoire",
  "nom": "Laboratoire d'analyses",
  "nomAr": "مخبر التحاليل الطبية",
  "article": "un"
 },
 {
  "slug": "medecin-sport",
  "nom": "Médecin du sport",
  "nomAr": "طبيب الرياضة",
  "article": "un"
 },
 {
  "slug": "medecin-travail",
  "nom": "Médecin du travail",
  "nomAr": "طبيب العمل",
  "article": "un"
 },
 {
  "slug": "medecin-generaliste",
  "nom": "Médecin généraliste",
  "nomAr": "طبيب عام",
  "article": "un"
 },
 {
  "slug": "neurologue",
  "nom": "Neurologue",
  "nomAr": "طبيب الأعصاب",
  "article": "un"
 },
 {
  "slug": "nutritionniste",
  "nom": "Nutritionniste",
  "nomAr": "أخصائي التغذية",
  "article": "un"
 },
 {
  "slug": "nephrologue",
  "nom": "Néphrologue",
  "nomAr": "طبيب الكلى",
  "article": "un"
 },
 {
  "slug": "ORL",
  "nom": "ORL",
  "nomAr": "طبيب الأنف والأذن والحنجرة",
  "article": "un"
 },
 {
  "slug": "oncologue",
  "nom": "Oncologue",
  "nomAr": "طبيب الأورام",
  "article": "un"
 },
 {
  "slug": "ophtalmologue",
  "nom": "Ophtalmologue",
  "nomAr": "طبيب العيون",
  "article": "un"
 },
 {
  "slug": "opticien",
  "nom": "Opticien",
  "nomAr": "أخصائي البصريات",
  "article": "un"
 },
 {
  "slug": "orthodontiste",
  "nom": "Orthodontiste",
  "nomAr": "أخصائي تقويم الأسنان",
  "article": "un"
 },
 {
  "slug": "orthophoniste",
  "nom": "Orthophoniste",
  "nomAr": "أخصائي تقويم النطق",
  "article": "un"
 },
 {
  "slug": "orthopediste",
  "nom": "Orthopédiste",
  "nomAr": "أخصائي العظام",
  "article": "un"
 },
 {
  "slug": "pharmacie",
  "nom": "Pharmacie",
  "nomAr": "صيدلية",
  "article": "une"
 },
 {
  "slug": "pneumologue",
  "nom": "Pneumologue",
  "nomAr": "طبيب الأمراض الصدرية",
  "article": "un"
 },
 {
  "slug": "podologue",
  "nom": "Podologue",
  "nomAr": "أخصائي أمراض القدم",
  "article": "un"
 },
 {
  "slug": "psychiatre",
  "nom": "Psychiatre",
  "nomAr": "طبيب نفسي",
  "article": "un"
 },
 {
  "slug": "pediatre",
  "nom": "Pédiatre",
  "nomAr": "طبيب الأطفال",
  "article": "un"
 },
 {
  "slug": "radiologue",
  "nom": "Radiologue",
  "nomAr": "طبيب الأشعة",
  "article": "un"
 },
 {
  "slug": "rhumatologue",
  "nom": "Rhumatologue",
  "nomAr": "طبيب الروماتيزم",
  "article": "un"
 },
 {
  "slug": "sage-femme",
  "nom": "Sage-femme",
  "nomAr": "قابلة",
  "article": "une"
 },
 {
  "slug": "urologue",
  "nom": "Urologue",
  "nomAr": "طبيب المسالك البولية",
  "article": "un"
 }
];

export const WILAYAS_SEO: WilayaSeo[] = [
 {
  "code": "1",
  "nom": "Adrar",
  "nomAr": "أدرار",
  "slug": "adrar"
 },
 {
  "code": "2",
  "nom": "Chlef",
  "nomAr": "الشلف",
  "slug": "chlef"
 },
 {
  "code": "3",
  "nom": "Laghouat",
  "nomAr": "الأغواط",
  "slug": "laghouat"
 },
 {
  "code": "4",
  "nom": "Oum El Bouaghi",
  "nomAr": "أم البواقي",
  "slug": "oum-el-bouaghi"
 },
 {
  "code": "5",
  "nom": "Batna",
  "nomAr": "باتنة",
  "slug": "batna"
 },
 {
  "code": "6",
  "nom": "Béjaïa",
  "nomAr": "بجاية",
  "slug": "bejaia"
 },
 {
  "code": "7",
  "nom": "Biskra",
  "nomAr": "بسكرة",
  "slug": "biskra"
 },
 {
  "code": "8",
  "nom": "Béchar",
  "nomAr": "بشار",
  "slug": "bechar"
 },
 {
  "code": "9",
  "nom": "Blida",
  "nomAr": "البليدة",
  "slug": "blida"
 },
 {
  "code": "10",
  "nom": "Bouira",
  "nomAr": "البويرة",
  "slug": "bouira"
 },
 {
  "code": "11",
  "nom": "Tamanrasset",
  "nomAr": "تمنراست",
  "slug": "tamanrasset"
 },
 {
  "code": "12",
  "nom": "Tébessa",
  "nomAr": "تبسة",
  "slug": "tebessa"
 },
 {
  "code": "13",
  "nom": "Tlemcen",
  "nomAr": "تلمسان",
  "slug": "tlemcen"
 },
 {
  "code": "14",
  "nom": "Tiaret",
  "nomAr": "تيارت",
  "slug": "tiaret"
 },
 {
  "code": "15",
  "nom": "Tizi Ouzou",
  "nomAr": "تيزي وزو",
  "slug": "tizi-ouzou"
 },
 {
  "code": "16",
  "nom": "Alger",
  "nomAr": "الجزائر",
  "slug": "alger"
 },
 {
  "code": "17",
  "nom": "Djelfa",
  "nomAr": "الجلفة",
  "slug": "djelfa"
 },
 {
  "code": "18",
  "nom": "Jijel",
  "nomAr": "جيجل",
  "slug": "jijel"
 },
 {
  "code": "19",
  "nom": "Sétif",
  "nomAr": "سطيف",
  "slug": "setif"
 },
 {
  "code": "20",
  "nom": "Saïda",
  "nomAr": "سعيدة",
  "slug": "saida"
 },
 {
  "code": "21",
  "nom": "Skikda",
  "nomAr": "سكيكدة",
  "slug": "skikda"
 },
 {
  "code": "22",
  "nom": "Sidi Bel Abbès",
  "nomAr": "سيدي بلعباس",
  "slug": "sidi-bel-abbes"
 },
 {
  "code": "23",
  "nom": "Annaba",
  "nomAr": "عنابة",
  "slug": "annaba"
 },
 {
  "code": "24",
  "nom": "Guelma",
  "nomAr": "قالمة",
  "slug": "guelma"
 },
 {
  "code": "25",
  "nom": "Constantine",
  "nomAr": "قسنطينة",
  "slug": "constantine"
 },
 {
  "code": "26",
  "nom": "Médéa",
  "nomAr": "المدية",
  "slug": "medea"
 },
 {
  "code": "27",
  "nom": "Mostaganem",
  "nomAr": "مستغانم",
  "slug": "mostaganem"
 },
 {
  "code": "28",
  "nom": "M'Sila",
  "nomAr": "المسيلة",
  "slug": "m-sila"
 },
 {
  "code": "29",
  "nom": "Mascara",
  "nomAr": "معسكر",
  "slug": "mascara"
 },
 {
  "code": "30",
  "nom": "Ouargla",
  "nomAr": "ورقلة",
  "slug": "ouargla"
 },
 {
  "code": "31",
  "nom": "Oran",
  "nomAr": "وهران",
  "slug": "oran"
 },
 {
  "code": "32",
  "nom": "El Bayadh",
  "nomAr": "البيض",
  "slug": "el-bayadh"
 },
 {
  "code": "33",
  "nom": "Illizi",
  "nomAr": "إليزي",
  "slug": "illizi"
 },
 {
  "code": "34",
  "nom": "Bordj Bou Arréridj",
  "nomAr": "برج بوعريريج",
  "slug": "bordj-bou-arreridj"
 },
 {
  "code": "35",
  "nom": "Boumerdès",
  "nomAr": "بومرداس",
  "slug": "boumerdes"
 },
 {
  "code": "36",
  "nom": "El Tarf",
  "nomAr": "الطارف",
  "slug": "el-tarf"
 },
 {
  "code": "37",
  "nom": "Tindouf",
  "nomAr": "تندوف",
  "slug": "tindouf"
 },
 {
  "code": "38",
  "nom": "Tissemsilt",
  "nomAr": "تيسمسيلت",
  "slug": "tissemsilt"
 },
 {
  "code": "39",
  "nom": "El Oued",
  "nomAr": "الوادي",
  "slug": "el-oued"
 },
 {
  "code": "40",
  "nom": "Khenchela",
  "nomAr": "خنشلة",
  "slug": "khenchela"
 },
 {
  "code": "41",
  "nom": "Souk Ahras",
  "nomAr": "سوق أهراس",
  "slug": "souk-ahras"
 },
 {
  "code": "42",
  "nom": "Tipaza",
  "nomAr": "تيبازة",
  "slug": "tipaza"
 },
 {
  "code": "43",
  "nom": "Mila",
  "nomAr": "ميلة",
  "slug": "mila"
 },
 {
  "code": "44",
  "nom": "Aïn Defla",
  "nomAr": "عين الدفلى",
  "slug": "ain-defla"
 },
 {
  "code": "45",
  "nom": "Naâma",
  "nomAr": "النعامة",
  "slug": "naama"
 },
 {
  "code": "46",
  "nom": "Aïn Témouchent",
  "nomAr": "عين تموشنت",
  "slug": "ain-temouchent"
 },
 {
  "code": "47",
  "nom": "Ghardaïa",
  "nomAr": "غرداية",
  "slug": "ghardaia"
 },
 {
  "code": "48",
  "nom": "Relizane",
  "nomAr": "غليزان",
  "slug": "relizane"
 },
 {
  "code": "49",
  "nom": "Timimoun",
  "nomAr": "تيميمون",
  "slug": "timimoun"
 },
 {
  "code": "50",
  "nom": "Bordj Badji Mokhtar",
  "nomAr": "برج باجي مختار",
  "slug": "bordj-badji-mokhtar"
 },
 {
  "code": "51",
  "nom": "Ouled Djellal",
  "nomAr": "أولاد جلال",
  "slug": "ouled-djellal"
 },
 {
  "code": "52",
  "nom": "Béni Abbès",
  "nomAr": "بني عباس",
  "slug": "beni-abbes"
 },
 {
  "code": "53",
  "nom": "In Salah",
  "nomAr": "عين صالح",
  "slug": "in-salah"
 },
 {
  "code": "54",
  "nom": "In Guezzam",
  "nomAr": "عين قزام",
  "slug": "in-guezzam"
 },
 {
  "code": "55",
  "nom": "Touggourt",
  "nomAr": "تقرت",
  "slug": "touggourt"
 },
 {
  "code": "56",
  "nom": "Djanet",
  "nomAr": "جانت",
  "slug": "djanet"
 },
 {
  "code": "57",
  "nom": "El M'Ghair",
  "nomAr": "المغير",
  "slug": "el-m-ghair"
 },
 {
  "code": "58",
  "nom": "El Meniaa",
  "nomAr": "المنيعة",
  "slug": "el-meniaa"
 },
 {
  "code": "59",
  "nom": "Aflou",
  "nomAr": "آفلو",
  "slug": "aflou"
 },
 {
  "code": "60",
  "nom": "Barika",
  "nomAr": "بريكة",
  "slug": "barika"
 },
 {
  "code": "61",
  "nom": "El Kantara",
  "nomAr": "القنطرة",
  "slug": "el-kantara"
 },
 {
  "code": "62",
  "nom": "Bir El Ater",
  "nomAr": "بئر العاتر",
  "slug": "bir-el-ater"
 },
 {
  "code": "63",
  "nom": "El Aricha",
  "nomAr": "العريشة",
  "slug": "el-aricha"
 },
 {
  "code": "64",
  "nom": "Ksar Chellala",
  "nomAr": "قصر الشلالة",
  "slug": "ksar-chellala"
 },
 {
  "code": "65",
  "nom": "Aïn Ouessara",
  "nomAr": "عين وسارة",
  "slug": "ain-ouessara"
 },
 {
  "code": "66",
  "nom": "Messaad",
  "nomAr": "مسعد",
  "slug": "messaad"
 },
 {
  "code": "67",
  "nom": "Ksar El Boukhari",
  "nomAr": "قصر البخاري",
  "slug": "ksar-el-boukhari"
 },
 {
  "code": "68",
  "nom": "Bou Saâda",
  "nomAr": "بوسعادة",
  "slug": "bou-saada"
 },
 {
  "code": "69",
  "nom": "El Abiodh Sidi Cheikh",
  "nomAr": "الأبيض سيدي الشيخ",
  "slug": "el-abiodh-sidi-cheikh"
 }
];

/** Specialites et wilayas mises en avant (pied de page, haut des pages). */
export const SPECIALITES_PRINCIPALES = ['medecin-generaliste', 'cardiologue', 'dentiste', 'pediatre', 'gynecologue', 'dermatologue', 'ophtalmologue', 'ORL', 'psychiatre', 'radiologue'];
export const WILAYAS_PRINCIPALES = ['16', '31', '25', '23', '9', '19', '6', '15', '5', '13'];

/** Slug de la rubrique Pharmacies : a part des medecins (le backend les exclut des listes sans specialite). */
export const SLUG_PHARMACIE = 'pharmacie';

/**
 * « un cardiologue », « une sage-femme », « un ORL » : article accorde puis nom en minuscules, sauf les sigles.
 */
export function avecArticle(s: SpecialiteSeo): string {
  const nom = /^[A-Z]{2,}$/.test(s.nom) ? s.nom : s.nom.toLowerCase();
  return `${s.article} ${nom}`;
}

/** Partie lisible d'une adresse : minuscules sans accents, mots separes par des tirets. */
export function slugifier(texte: string): string {
  return (texte || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'praticien';
}

/** Adresse publique (referencee) de la fiche d'un praticien. */
export function lienPraticien(m: { id: string; nomComplet: string }): string[] {
  return ['/praticiens', m.id, slugifier(m.nomComplet)];
}

export function wilayaParCode(code: string | null | undefined): WilayaSeo | undefined {
  return WILAYAS_SEO.find((w) => w.code === code);
}

/**
 * Liens hreflang entre la version francaise et la version arabe d'une page publique (chemin sans prefixe de langue).
 * Remplace les liens precedents : une page n'annonce que ses propres versions.
 */
export function liensLangues(doc: Document, chemin: string): void {
  doc.head.querySelectorAll('link[rel="alternate"][hreflang]').forEach((l) => l.remove());
  const base = 'https://tabibi.doctor';
  for (const [langue, url] of [['fr', base + chemin], ['ar', base + '/ar' + chemin], ['x-default', base + chemin]]) {
    const lien = doc.createElement('link');
    lien.setAttribute('rel', 'alternate');
    lien.setAttribute('hreflang', langue);
    lien.setAttribute('href', url);
    doc.head.appendChild(lien);
  }
}
