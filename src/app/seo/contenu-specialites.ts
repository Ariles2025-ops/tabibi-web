/**
 * Contenu éditorial UNIQUE par spécialité (français + arabe).
 *
 * Objectif SEO : chaque page /specialites/:specialite[/:wilaya] partage aujourd'hui
 * le même paragraphe générique (introSpec/introSpecWil dans textes-seo.ts). Résultat :
 * des milliers de pages quasi identiques, mal classées. Ce fichier ajoute, par
 * spécialité, un vrai texte informatif + des questions fréquentes propres à la
 * spécialité, pour que chaque page soit substantielle et distincte.
 *
 * Règles de rédaction :
 *  - Information générale d'orientation, JAMAIS un conseil médical ni un diagnostic.
 *  - Pas de promesse de résultat, pas de prix. Ton factuel, utile, grand public.
 *  - FR et AR doivent dire la même chose.
 *  - Clé = slug de la spécialité (voir referentiel-seo.ts). Une spécialité absente
 *    d'ici garde simplement l'ancien affichage générique (rétrocompatible).
 *
 * Échantillon de départ : 5 spécialités à valider avant de généraliser.
 */
export interface ContenuSpecialite {
  /** Paragraphe de présentation du rôle de la spécialité (2–4 phrases). */
  apropos: string;
  /** Questions fréquentes propres à la spécialité (affichées avant la FAQ générique). */
  faq: { q: string; r: string }[];
}

export const CONTENU_SPECIALITES: Record<string, { fr: ContenuSpecialite; ar: ContenuSpecialite }> = {
  cardiologue: {
    fr: {
      apropos:
        "Le cardiologue prend en charge le cœur et les vaisseaux sanguins : hypertension artérielle, douleurs dans la poitrine, palpitations, essoufflement ou suivi après un problème cardiaque. Il réalise des examens comme l'électrocardiogramme (ECG) et l'échographie du cœur. Un bilan cardiologique est souvent conseillé à partir de la quarantaine, ou plus tôt en cas de diabète, de cholestérol élevé ou d'antécédents familiaux.",
      faq: [
        {
          q: 'Quand consulter un cardiologue ?',
          r: "En cas d'hypertension, de douleurs dans la poitrine, de palpitations ou d'un essoufflement inhabituel, et pour un bilan de prévention si vous avez du diabète, du cholestérol ou des antécédents cardiaques dans la famille. En cas de douleur thoracique intense, contactez les urgences.",
        },
        {
          q: 'Que faut-il apporter à la consultation ?',
          r: "Vos derniers examens (ECG, analyses de sang, comptes rendus) et la liste de vos traitements en cours aident le cardiologue à mieux vous suivre. Une lettre du médecin traitant est utile mais pas obligatoire pour prendre rendez-vous.",
        },
      ],
    },
    ar: {
      apropos:
        'يهتمّ طبيب القلب بالقلب والأوعية الدموية: ارتفاع ضغط الدم، آلام الصدر، الخفقان، ضيق التنفّس أو المتابعة بعد مشكلة قلبية. ويجري فحوصات مثل تخطيط القلب الكهربائي (ECG) وتصوير القلب بالصدى. يُنصح عادةً بإجراء فحص للقلب ابتداءً من سنّ الأربعين، أو قبل ذلك عند وجود السكري أو ارتفاع الكوليسترول أو تاريخ عائلي.',
      faq: [
        {
          q: 'متى يجب زيارة طبيب القلب؟',
          r: 'عند ارتفاع ضغط الدم أو ألم في الصدر أو خفقان أو ضيق تنفّس غير معتاد، وللفحص الوقائي إذا كان لديك سكري أو كوليسترول أو تاريخ عائلي بأمراض القلب. وعند ألم شديد في الصدر اتّصل بالإسعاف.',
        },
        {
          q: 'ماذا أُحضر معي إلى الموعد؟',
          r: 'إحضار آخر فحوصاتك (تخطيط القلب، تحاليل الدم، التقارير) وقائمة أدويتك الحالية يساعد الطبيب على متابعتك بشكل أفضل. ورسالة من الطبيب المعالج مفيدة لكنها ليست إلزامية للحجز.',
        },
      ],
    },
  },

  dentiste: {
    fr: {
      apropos:
        "Le dentiste (chirurgien-dentiste) soigne les dents et les gencives : caries, détartrage, dévitalisation, extraction, prothèses et pose d'implants. Un contrôle une à deux fois par an permet de prévenir les caries et les maladies des gencives. En cas de rage de dent, de gonflement ou d'abcès, une consultation rapide est recommandée.",
      faq: [
        {
          q: 'À quelle fréquence consulter un dentiste ?',
          r: "Un contrôle tous les six mois à un an est conseillé pour un détartrage et le dépistage des caries, même sans douleur. Chez l'enfant, un suivi régulier dès l'apparition des premières dents aide à prévenir les problèmes.",
        },
        {
          q: 'Le dentiste pose-t-il des prothèses et des implants ?',
          r: "Oui. Selon les cabinets, le dentiste réalise couronnes, bridges, prothèses amovibles et implants. La fiche du praticien et la prise de rendez-vous en ligne sont accessibles gratuitement avec un compte Tabibi.",
        },
      ],
    },
    ar: {
      apropos:
        'يعالج طبيب الأسنان الأسنان واللثة: التسوّس، إزالة الجير، علاج العصب، الخلع، التركيبات وزرع الأسنان. ويساعد الفحص مرّة إلى مرّتين في السنة على الوقاية من التسوّس وأمراض اللثة. وعند ألم الأسنان الحادّ أو التورّم أو الخرّاج يُنصح بالمراجعة السريعة.',
      faq: [
        {
          q: 'كم مرّة يجب زيارة طبيب الأسنان؟',
          r: 'يُنصح بفحص كل ستة أشهر إلى سنة لإزالة الجير والكشف عن التسوّس حتى دون ألم. وعند الأطفال تساعد المتابعة المنتظمة منذ ظهور الأسنان الأولى على الوقاية.',
        },
        {
          q: 'هل يركّب طبيب الأسنان التركيبات والزرعات؟',
          r: 'نعم. حسب العيادات، يقوم الطبيب بالتيجان والجسور والأطقم المتحرّكة وزرع الأسنان. وصفحة الطبيب والحجز عبر الإنترنت متاحة مجانًا بحساب طبيبي.',
        },
      ],
    },
  },

  dermatologue: {
    fr: {
      apropos:
        "Le dermatologue traite la peau, les cheveux et les ongles : acné, eczéma, psoriasis, mycoses, allergies cutanées et chute de cheveux. Il surveille aussi les grains de beauté et dépiste les cancers de la peau. Il est conseillé de consulter pour toute lésion qui change de taille, de forme ou de couleur, qui démange ou qui saigne.",
      faq: [
        {
          q: 'Quand consulter un dermatologue pour un grain de beauté ?',
          r: "Consultez si un grain de beauté change de taille, de forme ou de couleur, devient irrégulier, démange ou saigne. Un contrôle régulier est utile si vous avez de nombreux grains de beauté ou des antécédents familiaux.",
        },
        {
          q: "Le dermatologue traite-t-il l'acné et la chute de cheveux ?",
          r: "Oui. Le dermatologue prend en charge l'acné, l'eczéma, le psoriasis, les mycoses ainsi que la chute de cheveux et les problèmes du cuir chevelu, et propose un suivi adapté à chaque cas.",
        },
      ],
    },
    ar: {
      apropos:
        'يعالج طبيب الجلد البشرة والشعر والأظافر: حبّ الشباب، الإكزيما، الصدفية، الفطريات، الحساسية الجلدية وتساقط الشعر. كما يراقب الشامات ويكشف عن سرطانات الجلد. ويُنصح بالمراجعة عند أي بقعة تتغيّر في الحجم أو الشكل أو اللون، أو تسبّب الحكّة أو النزيف.',
      faq: [
        {
          q: 'متى أراجع طبيب الجلد بخصوص شامة؟',
          r: 'راجع الطبيب إذا تغيّرت الشامة في الحجم أو الشكل أو اللون، أو أصبحت غير منتظمة أو مثيرة للحكّة أو نازفة. والفحص المنتظم مفيد إذا كان لديك عدد كبير من الشامات أو تاريخ عائلي.',
        },
        {
          q: 'هل يعالج طبيب الجلد حبّ الشباب وتساقط الشعر؟',
          r: 'نعم. يتكفّل طبيب الجلد بحبّ الشباب والإكزيما والصدفية والفطريات وكذلك تساقط الشعر ومشاكل فروة الرأس، ويقترح متابعة مناسبة لكل حالة.',
        },
      ],
    },
  },

  gynecologue: {
    fr: {
      apropos:
        "Le gynécologue suit la santé des femmes : contraception, suivi de grossesse, ménopause, troubles du cycle et dépistage (frottis, examen des seins). Un suivi régulier est recommandé dès le début de la vie adulte, puis pendant la grossesse. La consultation est confidentielle et peut être réalisée par un médecin homme ou femme selon votre préférence.",
      faq: [
        {
          q: 'À quelle fréquence consulter un gynécologue ?',
          r: "Un suivi une fois par an est généralement conseillé pour le dépistage et la contraception, et plus rapproché pendant une grossesse ou en cas de symptôme particulier (douleurs, saignements inhabituels).",
        },
        {
          q: 'Le gynécologue assure-t-il le suivi de grossesse ?',
          r: "Oui, de nombreux gynécologues assurent le suivi de grossesse, les échographies et la préparation à l'accouchement. Vous pouvez choisir votre praticien par wilaya et prendre rendez-vous en ligne.",
        },
      ],
    },
    ar: {
      apropos:
        'يتابع طبيب أمراض النساء صحّة المرأة: وسائل منع الحمل، متابعة الحمل، سنّ اليأس، اضطرابات الدورة والكشف المبكّر (مسحة عنق الرحم، فحص الثدي). ويُنصح بالمتابعة المنتظمة منذ بداية سنّ الرشد ثمّ أثناء الحمل. والاستشارة سرّية ويمكن أن يجريها طبيب أو طبيبة حسب تفضيلك.',
      faq: [
        {
          q: 'كم مرّة يجب زيارة طبيب أمراض النساء؟',
          r: 'يُنصح عمومًا بمتابعة مرّة في السنة للكشف ووسائل منع الحمل، وبشكل أقرب أثناء الحمل أو عند ظهور عرض خاصّ (آلام أو نزيف غير معتاد).',
        },
        {
          q: 'هل يتولّى طبيب أمراض النساء متابعة الحمل؟',
          r: 'نعم، يتولّى كثير من الأطبّاء متابعة الحمل والتصوير بالصدى والتحضير للولادة. يمكنك اختيار الطبيب حسب الولاية والحجز عبر الإنترنت.',
        },
      ],
    },
  },

  pediatre: {
    fr: {
      apropos:
        "Le pédiatre suit la santé des enfants, de la naissance à l'adolescence : croissance, vaccinations, maladies courantes et développement. Des consultations rapprochées sont prévues durant les premiers mois, puis un suivi régulier. En cas de fièvre élevée, de difficultés à respirer, de vomissements répétés ou de déshydratation chez un nourrisson, une consultation rapide est nécessaire.",
      faq: [
        {
          q: 'À quel âge et à quelle fréquence consulter un pédiatre ?',
          r: "Le suivi commence dès la naissance, avec des consultations fréquentes la première année, puis au moins une fois par an. Le pédiatre surveille la croissance, le développement et les vaccinations.",
        },
        {
          q: "Le pédiatre réalise-t-il les vaccins de l'enfant ?",
          r: "Oui, le pédiatre assure le calendrier vaccinal et le suivi de la croissance. Vous pouvez trouver un pédiatre près de chez vous par wilaya et prendre rendez-vous en ligne gratuitement.",
        },
      ],
    },
    ar: {
      apropos:
        'يتابع طبيب الأطفال صحّة الطفل من الولادة إلى المراهقة: النموّ، التلقيحات، الأمراض الشائعة والتطوّر. وتُبرمَج مواعيد متقاربة في الأشهر الأولى ثمّ متابعة منتظمة. وعند ارتفاع الحرارة أو صعوبة التنفّس أو القيء المتكرّر أو الجفاف لدى الرضيع تكون المراجعة السريعة ضرورية.',
      faq: [
        {
          q: 'في أيّ سنّ وكم مرّة يُراجَع طبيب الأطفال؟',
          r: 'تبدأ المتابعة منذ الولادة بمواعيد متقاربة في السنة الأولى ثمّ مرّة في السنة على الأقلّ. ويراقب الطبيب النموّ والتطوّر والتلقيحات.',
        },
        {
          q: 'هل يقوم طبيب الأطفال بتلقيح الطفل؟',
          r: 'نعم، يتكفّل طبيب الأطفال بجدول التلقيحات ومتابعة النموّ. يمكنك إيجاد طبيب قريب منك حسب الولاية والحجز عبر الإنترنت مجانًا.',
        },
      ],
    },
  },
  'medecin-generaliste': {
    fr: {
      apropos: 'Le médecin généraliste joue un rôle crucial en tant qu\'intermédiaire entre le patient et les spécialistes. Il est recommandé de consulter ce professionnel de santé pour des examens de routine et des soins non urgents.',
      faq: [
        { q: 'Peut-on consulter un médecin généraliste pour des symptômes courants?', r: 'Oui, il est courant de consulter un médecin généraliste pour des maux d\'estomac, des rhumes ou des douleurs musculaires bénins.' },
        { q: 'Quelles sont les situations dans lesquelles il vaut mieux contacter un médecin généraliste?', r: 'Il est préférable de contacter un médecin généraliste si vous avez des questions sur votre santé globale ou si vous avez besoin d\'un suivi régulier comme pour la gestion d\'une affection chronique.' },
      ],
    },
    ar: {
      apropos: 'طبيب العام هو طبيب عام يقدم الرعاية الصحية الأولية ويقوم بالفحوصات الجسمانية والتشخيص البسيط. يُستشير الطبيب العام في حالات الطوارئ الأولية والمشكلات الصحية البسيطة التي لا تتطلب عناية طبية متخصصة.',
      faq: [
        { q: 'هل يمكن للطبيب العام تقديم فحوصات متخصصة؟', r: 'لا، الطبيب العام يقدم الرعاية الصحية الأولية والفحوصات البسيطة فقط. الفحوصات المتخصصة تكون تحت رعاية الأطباء المتخصصين.' },
        { q: 'متى أحتاج إلى استشارة الطبيب العام؟', r: 'يجب استشارة الطبيب العام في حالات الطوارئ الأولية والمشاكل الصحية البسيطة مثل الصداع أو الحمى.' },
      ],
    },
  },
  ophtalmologue: {
    fr: {
      apropos: 'Un ophtalmologue est un médecin spécialisé dans le diagnostic et le traitement des maladies oculaires et des troubles de la vision. Il est conseillé de consulter un ophtalmologue régulièrement, notamment lorsqu\'on observe des modifications dans sa vision ou des symptômes douloureux aux yeux.',
      faq: [
        { q: 'Quels symptômes devraient m\'amener à consulter un ophtalmologue ?', r: 'Si vous constatez des douleurs oculaires persistantes, des larmoiements excessifs, des modifications dans votre champ de vision ou des yeux rouges, il est recommandé de consulter un ophtalmologue rapidement.' },
        { q: 'Dois-je consulter un ophtalmologue si je n\'ai pas de symptômes particuliers ?', r: 'Bien que vous n\'ayez pas de symptômes, une visite régulière chez l\'ophtalmologue est recommandée pour détecter précocement des problèmes de santé oculaire et maintenir une bonne santé visuelle.' },
      ],
    },
    ar: {
      apropos: 'طبيب العيون متخصص في تشخيص وعلاج أمراض العين والجفن. يُنصح بالاستشارة الطبية عند الشعور بأي تغييرات غير طبيعية في الرؤية أو الإحساس بالألم في العين.',
      faq: [
        { q: 'هل يمكن لطبيب العيون علاج مشاكل الرؤية الموروثة؟', r: 'نعم، يمكن لطبيب العيون متابعة وعلاج العديد من مشاكل الرؤية الموروثة، مثل قصر النظر والبصيرة الحادة.' },
        { q: 'متى يجب الاتصال بطبيب العيون؟', r: 'يجب الاتصال بطبيب العيون عند الشعور بأي ألم في العين أو تغيرات في الرؤية مثل ضبابية الرؤية أو تغيرات في حساسية الضوء.' },
      ],
    },
  },
  'ORL': {
    fr: {
      apropos: 'L\'ORL (Otolaryngologie) est une spécialité médicale qui se charge de l\'évaluation et du traitement des maladies touchant l\'oreille, le nez, la gargarique et la bouche. Il est recommandé de consulter un ORL lorsque vous souffrez de problèmes persistants d\'ouïe, de maux de tête persistants, ou d\'obstruction du nez.',
      faq: [
        { q: 'Quels sont les symptômes courants qui peuvent nécessiter une consultation chez un ORL ?', r: 'Les symptômes comme des problèmes d\'ouïe, des douleurs à la tête, des saignements de nez fréquents, ou une sensation de congestion dans l\'oreille peuvent indiquer le besoin d\'une consultation chez un ORL.' },
        { q: 'Est-il normal d\'avoir des saignements de nez ?', r: 'Des saignements de nez occasionnels sont souvent normaux, mais s\'ils sont fréquents ou accompagnés d\'autres symptômes, il est préférable de consulter un ORL pour évaluer la cause sous-jacente.' },
      ],
    },
    ar: {
      apropos: 'طبيب الأنف والأذن والحنجرة هو متخصص في علاج الأمراض المرتبطة بالأنف والأذن والحنجرة. يُشجع الاستشارة مع هذا الطبيب عند الشعور بأي أعراض غير طبيعية في هذه المناطق، مثل التهاب الأذن أو صعوبات في التنفس من الأنف.',
      faq: [
        { q: 'هل يمكن لطبيب الأنف والأذن والحنجرة تشخيص أمراض الأذن فقط؟', r: 'لا، طبيب الأنف والأذن والحنجرة متخصص في علاج الأمراض المتعلقة بالأنف والأذن والحنجرة على حد سواء.' },
        { q: 'ما هي الأعراض التي يجب استشارة طبيب الأنف والأذن والحنجرة بشأنها؟', r: 'الأعراض مثل التهاب الأنف المستمر، ضعف السمع، صعوبات في البلع، أو تغييرات في نسيج اللسان والحنجرة تستلزم استشارة هذا الطبيب.' },
      ],
    },
  },
};
