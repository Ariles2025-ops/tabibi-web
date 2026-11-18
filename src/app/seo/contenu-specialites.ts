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
          r: "Oui. Selon les cabinets, le dentiste réalise couronnes, bridges, prothèses amovibles et implants. La fiche du praticien et la prise de rendez-vous en ligne sont accessibles gratuitement avec un compte Ndawik.",
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
          r: 'نعم. حسب العيادات، يقوم الطبيب بالتيجان والجسور والأطقم المتحرّكة وزرع الأسنان. وصفحة الطبيب والحجز عبر الإنترنت متاحة مجانًا بحساب نداويك.',
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
  psychiatre: {
    fr: {
      apropos: 'Le psychiatre est un médecin spécialisé dans l\'étude et le traitement des troubles mentaux et des comportements perturbés. On peut consulter un psychiatre lorsque l\'on ressent des troubles émotionnels persistants, lorsque l\'on a des difficultés de sommeil ou de concentration, ou lorsque l\'on subit des changements de comportement inquiétants.',
      faq: [
        { q: 'Peut-on consulter un psychiatre sans ordonnance?', r: 'En Algérie, il n\'est pas obligatoire d\'avoir une ordonnance pour consulter un psychiatre, mais un avis médical général est souvent requis pour une première consultation.' },
        { q: 'Quels sont les symptômes qui devraient inciter à consulter un psychiatre?', r: 'Il est recommandé de consulter un psychiatre si l\'on éprouve des pensées ou des sentiments dépressifs, anxieux ou de désespoir persistants, ou si l\'on observe des modifications radicales dans son comportement ou ses habitudes quotidiennes.' },
      ],
    },
    ar: {
      apropos: 'الطبيب النفسي متخصص في التشخيص والعلاج النفسي للأمراض العقلية والسلوكية. ينصح بالاستعانة به عند الشعور بالتوتر والقلق المستمر، أو عند الحاجة إلى مساعدة في التعامل مع المشكلات النفسية والemotions.',
      faq: [
        { q: 'ما هي المهام الرئيسية للطبيب النفسي؟', r: 'الطبيب النفسي يجري الفحوصات النفسية ويقدم العلاجات المناسبة. يقوم بوصف العقاقير النفسية إذا لزم الأمر ويوجه المرضى للعلاجات الأخرى.' },
        { q: 'متى يجب استشارة الطبيب النفسي؟', r: 'يجب استشارة الطبيب النفسي عند الشعور بالتوتر والقلق المستمر، أو عند وجود مشكلات في العلاقات الاجتماعية أو العائلية، أو عند الحاجة للمساعدة في التعامل مع الإجهاد والتوتر.' },
      ],
    },
  },
  radiologue: {
    fr: {
      apropos: 'Le radiologue est un médecin spécialisé dans l\'interprétation des images médicalisées telles que les radiographies, les IRM, les scans et les mammographies. On le consulte généralement après une prise de rendez-vous avec un médecin traitant pour interpréter les résultats d\'imagerie médicale.',
      faq: [
        { q: 'Quel est le rôle d\'un radiologue dans un hôpital?', r: 'Le radiologue analyse les images médicales et rédige un rapport qui est utilisé par les médecins traitants pour diagnostiquer et évaluer la santé d\'un patient.' },
        { q: 'Pourquoi consulter un radiologue?', r: 'Un radiologue est consulté pour interpréter les résultats d\'imagerie médicale, aidant ainsi les médecins à prendre des décisions thérapeutiques éclairées et à surveiller l\'état de santé du patient.' },
      ],
    },
    ar: {
      apropos: 'طبيب الأشعة هو متخصص في استخدام التقنيات التشخيصية لفحص الجسم وإعداد التقارير الطبية. يُستشير هذا الطبيب عند الحاجة إلى صور دentrالجسم لتشخيص الحالة المرضية أو التحقق من صحتها.',
      faq: [
        { q: 'هل يمكن لطبيب الأشعة تقديم التشخيص؟', r: 'لا، وظيفة طبيب الأشعة تقتصر على إجراء الفحوصات والتقنيات التشخيصية وتقديم التقارير الطبية. التشخيص يتم من قبل الطبيب المختص بناءً على النتائج.' },
        { q: 'متى يكون الحاجة لزيارة طبيب الأشعة؟', r: 'يكون الحاجة لزيارة طبيب الأشعة عند الحاجة إلى إجراء فحوصات مثل الأشعة السينية أو الأشعة المقطعية أو السونار أو مri للحصول على صور دentر الجسم.' },
      ],
    },
  },
  anesthesiste: {
    fr: {
      apropos: 'Un anesthésiste-réanimateur est un médecin spécialisé dans la gestion de la prise en charge anesthésique et réanimatoire des patients. Il est également chargé de la surveillance et de la stabilisation des patients en situation critique. On doit consulter ce spécialiste lorsqu\'une intervention chirurgicale est prévue ou en cas d\'urgence médicale nécessitant une assistance respiratoire ou cardiaque.',
      faq: [
        { q: 'Quelle est la différence entre un anesthésiste et un anesthésiste-réanimateur ?', r: 'Un anesthésiste se spécialise dans l\'anesthésie et la gestion des complications liées à la chirurgie, tandis qu\'un anesthésiste-réanimateur a également des compétences en réanimation et en soins intensifs.' },
        { q: 'Pourquoi est-il important d\'être accompagné d\'un anesthésiste-réanimateur en cas d\'urgence médicale ?', r: 'L\'accompagnement d\'un anesthésiste-réanimateur en cas d\'urgence garantit une intervention rapide et efficace pour stabiliser le patient et le maintenir en vie jusqu\'à ce qu\'il soit transféré dans un service spécialisé si nécessaire.' },
      ],
    },
    ar: {
      apropos: 'طبيب التخدير والإنعاش هو اختصاصي يقوم بضمان سلامة المرضى خلال العمليات الجراحية وأي حالات طبية تتطلب استخدام التخدير. يمكن للفئات التي تتعرض للعمليات الجراحية أو التي تتلقى علاجات طارئة في غرفة الإسعاف استشارة هذا النوع من الأطباء.',
      faq: [
        { q: 'ما العمل الذي يقوم به طبيب التخدير والإنعاش؟', r: 'يضمن هذا الطبيب سلامة المريض خلال الجراحة ويعمل على الحفاظ على حياة المريض أثناء حالات الطوارئ.' },
        { q: 'متى يجب استشارة طبيب التخدير والإنعاش؟', r: 'يجب استشارة هذا الطبيب قبل الجراحة وفي حالات الطوارئ حيث يتطلب الأمر التخدير أو الإسعافات الأولية المتقدمة.' },
      ],
    },
  },
  'centre-sante': {
    fr: {
      apropos: 'Le Centre de santé joue un rôle essentiel en assurant la prévention et le suivi de la santé de la population. Il est recommandé de le consulter pour des consultations générales et des dépistages réguliers.',
      faq: [
        { q: 'Peut-on se faire vacciner au centre de santé ?', r: 'Oui, le centre de santé propose diverses vaccinations selon les campagnes et les besoins de la population. R2: Il est important de vérifier les horaires et les dates des vaccinations avant de se rendre au centre.' },
        { q: 'Quel type de services de santé offre généralement un centre de santé ? R1: Un centre de santé offre des consultations médicales, des tests de dépistage et des vaccinations.', r: 'Il est important de vérifier les horaires et les dates des vaccinations avant de se rendre au centre. Q2: Quel type de services de santé offre généralement un centre de santé ? R1: Un centre de santé offre des consultations médicales, des tests de dépistage et des vaccinations. R2: Il peut également proposer des conseils sur la santé et des recommandations pour une meilleure hygiène de vie.' },
      ],
    },
    ar: {
      apropos: 'مركز صحي هو مؤسسة طبية تقدم خدمات الرعاية الصحية الأولية للجمهور. يجب استشارة هذا المركز عند الحاجة إلى خدمات صحية عامة أو الوقاية من الأمراض.',
      faq: [
        { q: 'متى يمكنني زيارة مركز صحة في الجزائر؟', r: 'يمكن زيارتك في أي وقت، وفقًا لساعات العمل المعلنة. يُفضل الاتصال مسبقًا للتأكد من توافر الخدمة المطلوبة.' },
        { q: 'ما الخدمات التي يقدمها مركز صحة في الجزائر؟', r: 'يقدم المركز خدمات الرعاية الصحية الأولية مثل الفحص الطبي العام والتطعيمات والنصائح الصحية.' },
      ],
    },
  },
  chirurgien: {
    fr: {
      apropos: 'Le chirurgien général est un médecin spécialisé dans la pratique chirurgicale qui peut traiter une variété de maladies et de blessures. On le consulte généralement lorsque la chirurgie est nécessaire pour une intervention médicale.',
      faq: [
        { q: 'Est-il nécessaire de consulter un chirurgien général pour une blessure superficielle?', r: 'Non, une blessure superficielle est généralement traitée par un médecin généraliste ou un pharmacien. Un chirurgien général intervient lorsque la blessure nécessite une intervention chirurgicale.' },
        { q: 'Quelles sont les maladies qui peuvent nécessiter l\'intervention d\'un chirurgien général?', r: 'Un chirurgien général peut intervenir pour une variété de problèmes, notamment les cancers, les infections, les problèmes de la prostate, les problèmes de la gorge, des oreilles et du nez, ainsi que certaines maladies du système digestif.' },
      ],
    },
    ar: {
      apropos: 'الجراح العام هو طبيب متخصص في علاج الحالات الجراحية البسيطة والمعقدة التي قد تحدث في الجسم البشري. يُنصح بالاستعانة به في حالات الطوارئ الطبية أو عند الحاجة إلى إجراء جراحة بسيطة.',
      faq: [
        { q: 'هل يجب استشارة الجراح العام في حالة الإصابة بجروح عميقة؟', r: 'نعم، يجب استشارة الجراح العام في حالة الإصابة بجروح عميقة، حيث يمكنه التقييم والعلاج المناسب. R2: قد يحتاج المريض في هذه الحالة إلى عملية جراحية لإزالة الأوساخ والمواد الملوثة والضمادات.' },
        { q: 'ما هي الحالات التي يمكن أن يتم علاجها بواسطة الجراح العام؟ R1: الجراح العام يمكنه علاج العديد من الحالات مثل الجروح العميقة والالتهابات الجلدية والتهابات الغدد اللمفاوية وحصوات المرارة.', r: 'قد يحتاج المريض في هذه الحالة إلى عملية جراحية لإزالة الأوساخ والمواد الملوثة والضمادات. Q2: ما هي الحالات التي يمكن أن يتم علاجها بواسطة الجراح العام؟ R1: الجراح العام يمكنه علاج العديد من الحالات مثل الجروح العميقة والالتهابات الجلدية والتهابات الغدد اللمفاوية وحصوات المرارة. R2: في بعض الأحيان، قد يحتاج المريض إلى إجراء جراحة بسيطة مثل إزالة طفية أو تنظيف غضروف.' },
      ],
    },
  },
  allergologue: {
    fr: {
      apropos: 'Un allergologue est un médecin spécialisé dans le diagnostic et le traitement des allergies. Il est conseillé de consulter un allergologue lorsqu\'on présente des symptômes d\'allergies persistantes ou lorsqu\'on souhaite identifier et traiter une allergie.',
      faq: [
        { q: 'Quels sont les principaux symptômes qui justifient de consulter un allergologue ?', r: 'Les principaux symptômes incluent l\'éternuement fréquent, les éruptions cutanées, la congestion nasale, les bronchospasmes et les démangeaisons. Ces symptômes peuvent indiquer une allergie qui nécessite une évaluation.' },
        { q: 'Comment peut-on diagnostiquer une allergie chez soi ?', r: 'Il est difficile de diagnostiquer une allergie sans l\'aide d\'un professionnel. Le diagnostic repose généralement sur l\'analyse clinique, la prise d\'historique et des tests d\'provocation cutanée ou de prélèvements sanguins pour identifier les allergènes.' },
      ],
    },
    ar: {
      apropos: 'طبيب الحساسية هو متخصص في التشخيص والعلاج للأمراض المناعية والأллергенية. ينصح بزيارة الطبيب في حالة الشعور بالسعال المزمن، أو الحكة الشديدة، أو الصعوبة في التنفس.',
      faq: [
        { q: 'هل يمكن أن أتعرض لحساسية food بدون وجود تاريخ عائلى للمتلازمة؟', r: 'نعم، يمكن لأشخاص ليس لديهم تاريخ عائلي أن يعانون من حساسية الطعام. هذه الحساسية قد تأتي بسبب عوامل مختلفة مثل الأطعمة الجديدة أو التغيرات البيئية.' },
        { q: 'هل يمكن علاج الحساسية للأجواء الرطبة والحرارة؟ R1: نعم، يمكن علاج الحساسية المرتبطة بالاجواء الرطبة والحرارة باستخدام الأدوية والعلاجات المناعية.', r: 'ينصح بمراقبة مؤشر الرطوبة والحرارة في المنزل واستشارة الطبيب لتحديد أفضل طرق العلاج.' },
      ],
    },
  },
  'clinique-privee': {
    fr: {
      apropos: 'La clinique privée joue un rôle essentiel dans le secteur de la santé en Algérie en offrant des soins médicaux de qualité supérieure. Elle est recommandée pour des consultations ou des traitements ponctuels, ainsi que pour des soins spécialisés non urgents.',
      faq: [
        { q: 'Peut-on consulter une clinique privée pour des problèmes d\'ordre général ?', r: 'Oui, les cliniques privées sont adaptées aux problèmes de santé généraux et permettent d\'obtenir des avis médicaux rapidement et efficacement.' },
        { q: 'Quelles sont les avantages de consulter une clinique privée ?', r: 'Les avantages incluent un service plus personnalisé, une meilleure confidentialité, et un accès à des équipements médicaux de pointe, facilitant le diagnostic et le traitement.' },
      ],
    },
    ar: {
      apropos: 'عيادة خاصة هي مؤسسة طبية مخصصة لعلاج بعض الأمراض أو تقوية بعض الأعضاء الحيوية في الجسم. يمكن اللجوء إلى هذا النوع من العيادات عندما يرغب الشخص في استشارة طبيب متخصص بشكل مسائي لعلاج أمراض معينة أو لتحسين الصحة العامة.',
      faq: [
        { q: 'متى يمكنني الذهاب إلى عيادة خاصة؟', r: 'يمكن الذهاب إلى عيادة خاصة في أي وقت يراه المريض مناسباً، وخاصة عند الحاجة إلى استشارة طبيب متخصص بشكل منتظم.' },
        { q: 'ما هي الأسباب التي تدعو لزيارة عيادة خاصة؟', r: 'قد يزور المريض عيادة خاصة عندما يرغب في متابعة علاج معين، أو عند الحاجة إلى الرعاية الطبية المتخصصة بشكل منتظم، أو لتحسين حالة صحية عامة.' },
      ],
    },
  },
  endocrinologue: {
    fr: {
      apropos: 'Un endocrinologue est un médecin spécialiste qui traite les troubles endocriniens, tels que les maladies thyroïdiennes, diabète, ou troubles de la croissance. Il est recommandé de consulter un endocrinologue lorsque l\'on présente des symptômes comme la fatigue excessive, des variations inhabituelles de poids, ou des problèmes de production hormonale.',
      faq: [
        { q: 'Quels sont les signes qui devraient me faire consulter un endocrinologue ?', r: 'Si vous éprouvez des fatigues prolongées, des changements importants de poids, des troubles de l\'hydratation, ou des perturbations de votre cycle menstruel, il est préférable de consulter un spécialiste.' },
        { q: 'Comment peux-je savoir si je souffre d\'un trouble endocrinien ?', r: 'Si vous présentez des symptômes comme la faiblesse constante, des peurs anormales, des saignements menstruels irréguliers, ou des troubles de la vue, consultez un endocrinologue qui pourra effectuer des tests adaptés.' },
      ],
    },
    ar: {
      apropos: 'طبيب الغدد الصماء هو متخصص فيDiagnostique et traitement des problèmes liés aux glandes endocrines. ينصح بالاستشارة في حالة ظهور أعراض مثل السمنة المفرطة أو نقص الوزن، أو الاضطرابات في الدورة الشهرية.',
      faq: [
        { q: 'هل يمكن لطبيب الغدد الصماء التشخيص والعلاج من مشاكل الغدد الدرقية؟', r: 'نعم، يمكن له التشخيص والعلاج من مشاكل الغدد الدرقية مثل الهرمونات المنخفضة أو المرتفعة. يقوم بتقييم الحالة وتوصيل العلاج المناسب.' },
        { q: 'متى يجب على الشخص استشارة طبيب الغدد الصماء؟', r: 'يجب استشارة الطبيب في حالة وجود أعراض مثل تغييرات في الوزن أو الشعور بالتعب الشديد أو تقلبات� في المزاج، بالإضافة إلى أعراض أخرى مرتبطة بالغدد الصماء.' },
      ],
    },
  },
  'gastro-enterologue': {
    fr: {
      apropos: 'Un gastro-entérologue est un médecin spécialiste qui se concentre sur le diagnostic et le traitement des maladies du système digestif. Il est conseillé de consulter un gastro-entérologue lorsque vous rencontrez des problèmes tels que des douleurs abdominales, des nausées, des vomissements ou des troubles de l\'absorption des nutriments.',
      faq: [
        { q: 'Quels sont les symptômes qui indiquent une consultation chez un gastro-entérologue ?', r: 'Des douleurs abdominales persistantes, des altérations du mode de digestion, des modifications des habitudes intestinales peuvent être des signes à consulter un gastro-entérologue.' },
        { q: 'Est-il nécessaire de faire un diagnostic avant de consulter un gastro-entérologue ?', r: 'Non, il n\'est pas nécessaire d\'avoir un diagnostic préalable, le gastro-entérologue se chargera d\'évaluer l\'état de santé et de déterminer les tests nécessaires pour une évaluation précise.' },
      ],
    },
    ar: {
      apropos: 'طبيب الجهاز الهضمي هو متخصص في تشخيص وعلاج مشاكل الجهاز الهضمي. يُنصح بالاستعانة به عند ظهور أي أعراض متكررة أو شديدة في الجهاز الهضمي.',
      faq: [
        { q: 'هل يمكن أن يعالج طبيب الجهاز الهضمي جميع مشاكل الجهاز الهضمي؟', r: 'يمكن لطبيب الجهاز الهضمي تشخيص وعلاج العديد من مشاكل الجهاز الهضمي، لكن في بعض الحالات المركبة أو الخطيرة، قد يتعين اللجوء إلى متخصص آخر.' },
        { q: 'متى يكون من الأفضل استشارة طبيب الجهاز الهضمي؟', r: 'يجب استشارة طبيب الجهاز الهضمي عند تواجد أعراض مثل النوبات المستمرة للغثيان، أو فقدان الوزن غير المتعمد، أو التورم المستمر في منطقة البطن.' },
      ],
    },
  },
  hematologue: {
    fr: {
      apropos: 'Un hématologue est un médecin spécialisé dans l\'étude, le diagnostic et le traitement des maladies liées au sang, notamment les cancers de sang, les anémies et les maladies du foie. On consulte généralement un hématologue lorsque l\'on présente des symptômes évoquant des problèmes sanguins ou lorsque des anomalies sont détectées lors d\'examen de routine.',
      faq: [
        { q: 'Quels symptômes indiquent une nécessité de consulter un hématologue ?', r: 'Des signes tels que la fatigue excessive, une forte perte de cheveux, des ecchymoses fréquentes ou inexpliquées, et des infections récurrentes peuvent être des signes d\'une maladie sanguine qui nécessite l\'attention d\'un hématologue.' },
        { q: 'Quels examens peut réaliser un hématologue ?', r: 'Un hématologue peut effectuer des prélèvements sanguins, des épreuves de culture sanguine et des examens de biopsie osseuse pour évaluer l\'état des cellules sanguines et détecter potentiellement des anomalies.' },
      ],
    },
    ar: {
      apropos: 'طبيب أمراض الدم هو متخصص في التشخيص والعلاج للأمراض المتعلقة بالدم وخلايا الدم. يُفضل استشارة هذا الطبيب عند الشك بوجود مشاكل في جودة الدم أو عند وجود أعراض مثل النزيف الزائد أو الدوخة المستمرة.',
      faq: [
        { q: 'هل يمكن لطبيب أمراض الدم فحص نقص الحديد في الدم؟', r: 'نعم، يمكن له فحص نقص الحديد في الدم، حيث يقوم بتحليل العينات الدموية للتأكد من مستوى الحديد الطبيعي.' },
        { q: 'ما هو العلاج الشائع لارتفاع ضغط الدم عند مرضى أمراض الدم؟', r: 'العلاج قد يشمل تغييرات في نمط الحياة مثل الحمية الصحية والتقليل من الوزن الزائد، بالإضافة إلى استخدام الأدوية الدوائية وفقًا للنصائح الطبية.' },
      ],
    },
  },
};
