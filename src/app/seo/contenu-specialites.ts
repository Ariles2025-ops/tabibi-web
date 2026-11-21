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
  'chirurgien-orthopediste': {
    fr: {
      apropos: 'Le chirurgien orthopédiste est un médecin spécialisé dans la prévention, le diagnostic et le traitement des troubles et des maladies des os, des articulations, des muscles et des ligaments. Il est conseillé de consulter ce spécialiste en cas de douleurs persistantes ou de limitations fonctionnelles des membres.',
      faq: [
        { q: 'Quelles sont les principales maladies traitées par un chirurgien orthopédiste?', r: 'Un chirurgien orthopédiste traite des conditions comme l\'arthrite, les fractures, et les déchirures des ligaments. Ces problèmes peuvent survenir après un accident ou se développer au fil du temps.' },
        { q: 'Quelles sont les procédures chirurgicales courantes pratiquées par un chirurgien orthopédiste?', r: 'Les chirurgiens orthopédistes peuvent effectuer des opérations telles que les ostéotomies, les replacements articulaires et les interventions pour corriger les déformations osseuses. Ces interventions visent à soulager la douleur et à améliorer la mobilité.' },
      ],
    },
    ar: {
      apropos: 'جراح العظام هو طبيب متخصص في تشخيص وإصلاح مشاكل العظام والأنسجة المحيطة بها. يُستشير هذا الطبيب عند وجود مشاكل في العظام مثل التواءات أو كسور أو التهابات، وكذلك عند الحاجة إلى إجراء جراحة عظمية.',
      faq: [
        { q: 'هل يمكن أن يعالج جراح العظام جميع مشاكل العظام؟', r: 'لا، فهم يركزون بشكل رئيسي على العلاجات الجراحية والإزالة للمشاكل العظمية، مع مساعدة الأطباء الأسنان والمناظير في التشخيص والعلاج.' },
        { q: 'متى يكون استشارة جراح العظام ضرورية؟', r: 'يجب استشارة جراح العظام عند الشعور بألم متواصل في العظام أو الأوتار أو الإصابة بكسر أو تواء، أو عند الحاجة إلى إجراء عملية جراحية عظمية.' },
      ],
    },
  },
  hopital: {
    fr: {
      apropos: 'L\'hôpital joue un rôle crucial dans le système de santé en Algérie en fournissant des soins médicaux de qualité et en garantissant l\'urgence des cas nécessitant un traitement rapide. Il est recommandé de consulter un hôpital en cas de maladies graves, d\'accidents ou lorsqu\'on doit passer des examens médicaux importants.',
      faq: [
        { q: 'Quelles sont les principales fonctions d\'un hôpital en Algérie ?', r: 'Un hôpital en Algérie offre des soins de santé complets, des services d\'urgence et de réanimation, ainsi que des espaces pour des opérations chirurgicales.' },
        { q: 'Dans quelles situations devrait-on consulter un hôpital ?', r: 'On devrait consulter un hôpital en cas de maladies nécessitant une surveillance médicale ou chirurgicale, ainsi que lors de situations d\'urgence comme les accidents ou les malaises.' },
      ],
    },
    ar: {
      apropos: 'مستشفى في الجزائر هو مكان يوفر الرعاية الطبية للمرضى من خلال الأطباء والطاقم الطبي المتخصصين. يُستشار فيه عند الحاجة إلى العلاج أو الفحص الطبي أو تلقي الاستشارة الصحية العامة.',
      faq: [
        { q: 'هل يمكنني طلب موعد مسبق؟', r: 'نعم، يمكنك طلب المواعيد المسبقة عن طريق الاتصال بالمستشفى أو زيارة موقعه الإلكتروني.' },
        { q: 'ما هي العيادات المتاحة في المستشفى؟', r: 'العيادات المتاحة تتضمن عيادات الأطباء المتخصصين في مختلف المجالات الطبية مثل الأمراض的心脏骤停无法直接翻译为阿拉伯语，因为它包含了一个中文术语“心脏骤停”，而“心脏骤停”在阿拉伯语中通常表达为“انقطاع القلب”. 以下是根据您的要求修改后的版本： ``` APROPOS: مستشفى في الجزائر هو مكان يوفر الرعاية الطبية للمرضى من خلال الأطباء والطاقم الطبي المتخصصين. يُستشار فيه عند الحاجة إلى العلاج أو الفحص الطبي أو تلقي الاستشارة الصحية العامة. Q1: هل يمكنني طلب موعد مسبق؟ R1: نعم، يمكنك طلب المواعيد المسبقة عن طريق الاتصال بالمستشفى أو زيارة موقعه الإلكتروني. Q2: ما هي العيادات المتاحة في المستشفى؟ R2: العيادات المتاحة تتضمن عيادات الأطباء المتخصصين في مختلف المجالات الطبية مثل الأمراض的心脏骤停通常用“انقطاع القلب”表示。 ``` 请注意，“心脏骤停”在阿拉伯语中应翻译为“انقطاع القلب”。如果您需要更准确的翻译，可能需要咨询专业翻译人员。' },
      ],
    },
  },
  kinesitherapeute: {
    fr: {
      apropos: 'Le kinésithérapeute est un professionnel de santé qui s\'occupe des troubles et des pathologies musculo-squelettiques. Il conseille et guide les patients dans la rééducation et l\'exercice physique. Il est recommandé de consulter un kinésithérapeute en cas de douleurs musculaires, de problèmes de posture ou de troubles articulaires.',
      faq: [
        { q: 'Quel est le rôle principal d\'un kinésithérapeute?', r: 'Le kinésithérapeute évalue les capacités et les limites du mouvement d\'un patient. Il élaboré un plan de rééducation personnalisé pour améliorer sa mobilité et sa force.' },
        { q: 'Dans quelles situations devrais-je consulter un kinésithérapeute?', r: 'Vous devriez consulter un kinésithérapeute si vous éprouvez des douleurs musculaires persistantes, si vous avez des problèmes de posture ou si vous souhaitez améliorer votre condition physique.' },
      ],
    },
    ar: {
      apropos: 'الأخصائي في العلاج الطبيعي يلعب دورًا حيويًا في تقديم العلاجات الفعالة للحالة الجسدية والعضوية. يمكن للمرضى الاستعانة بهم عند الشعور بألم مزمن أو عند الاصابة بأي مشاكل صحية تتعلق بالجهاز العضلي-عظامي.',
      faq: [
        { q: 'ما هو العلاج الطبيعي؟', r: 'العلاج الطبيعي هو مجال مهني يهدف إلى تحسين صحة الأفراد ورفاهيتهم من خلال تدريب العضلات وتحسين نطاق الحركة. هو يستخدم تقنيات مختلفة لعلاج الألم والضعف.' },
        { q: 'متى يمكن الاستعانة بالأخصائي في العلاج الطبيعي؟', r: 'يمكن الاستعانة بالأخصائي في العلاج الطبيعي عند الشعور بألم مزمن أو عند الإصابة بأي مشاكل صحية تتعلق بالجهاز العضلي-عظامي، مثل التهاب الركبة أو الظهر.' },
      ],
    },
  },
  laboratoire: {
    fr: {
      apropos: 'Le laboratoire d\'analyses joue un rôle crucial dans la santé publique en fournissant des résultats d\'examens médicaux précieux. Il est recommandé de consulter ce spécialiste lorsque des symptômes persistent ou lorsque l\'on souhaite effectuer des examens de screening ou de suivi médical.',
      faq: [
        { q: 'Quels types d\'examens peuvent être réalisés dans un laboratoire d\'analyses?', r: 'Un laboratoire d\'analyses peut effectuer une variété d\'examens, allant des tests sanguins aux analyses urinaires, des examens génétiques aux examens de dépistage.' },
        { q: 'Comment peut-on interpréter les résultats d\'un examen d\'analyses?', r: 'Les résultats doivent être interprétés par un médecin qui connaît le contexte clinique du patient. Il est important de ne pas interpréter les résultats soi-même pour éviter toute mauvaise compréhension.' },
      ],
    },
    ar: {
      apropos: 'مخبر التحاليل الطبية هو قسم طبي مهم يقوم بتقديم خدمات الفحوصات الطبية الأولية. يجب استشارة هذا النوع من المختبرات عند الشك في وجود حالة صحية أو قبل الخضوع لعلاج معين. كما يمكن الاستعانة به في فحص التحاليل للتأكد من صحة الفرد قبل أدخاله في برامج العمل أو الدراسية.',
      faq: [
        { q: 'ما هي الخدمات التي يقدمها مخبر التحاليل الطبية؟', r: 'يقدم مخبر التحاليل الطبية مجموعة من الفحوصات الطبية الأولية مثل فحوصات الدم والبول والهيموغلوبين. يمكن أيضًا إجراء فحوصات خاصة بناءً على الاحتياجات الطبية.' },
        { q: 'لماذا يجب استشارة مخبر التحاليل الطبية؟', r: 'يجب استشارة مخبر التحاليل الطبية عند الشك في وجود حالة صحية أو قبل الخضوع لعلاج معين لضمان صحة الفرد. كما يمكن استخدام نتائج الفحوصات المخبرية لاتخاذ قرارات طبية مبنية على الأدلة.' },
      ],
    },
  },
  'medecin-sport': {
    fr: {
      apropos: 'Le médecin du sport est un professionnel médical spécialisé dans l\'évaluation et la prise en charge des besoins médicaux des sportifs. Il conseille et accompagne les sportifs de tous niveaux, qu\'ils soient amateurs ou professionnels, pour optimiser leur performance et prévenir les blessures.',
      faq: [
        { q: 'Comment savoir si j\'ai besoin d\'une consultation chez un médecin du sport ?', r: 'Consultez un médecin du sport si vous souhaitez optimiser votre entraînement, prévenir les blessures ou vous retrouver d\'une blessure. Il peut également vous aider à adapter votre programme d\'entraînement en fonction de votre état de santé.' },
        { q: 'Quelles sont les principales missions d\'un médecin du sport ?', r: 'Le médecin du sport évalue la santé globale du sportif, propose des conseils d\'entraînement adaptés, et intervient en cas de blessure pour un retour progressif à l\'activité sportive.' },
      ],
    },
    ar: {
      apropos: 'طبيب الرياضة هو متخصص في الرعاية الصحية الرياضية ومتابعة الأداء البدني للرياضيين المحترفين والهواة على حد سواء. يُفضل استشارة طبيب الرياضة عند الشعور بأي ألم أو إصابات رياضية، أو عند الحاجة إلى برنامج تدريبي مخصص للوصول إلى أهداف اللياقة البدنية.',
      faq: [
        { q: 'هل يمكن لطبيب الرياضة مساعدتي في تحسين أدائي الرياضي؟', r: 'نعم، يمكنه تقديم تدريب مخصص وشروحات حولTechniques correctes pour éviter les blessures et améliorer la performance.' },
        { q: 'ما هي الخدمات التي يقدمها طبيب الرياضة؟', r: 'يوفر خدمات تقييم اللياقة البدنية، وإجراء الفحوصات الطبية، وتقديم نصائح حول التغذية والراحة.' },
      ],
    },
  },
  'medecin-travail': {
    fr: {
      apropos: 'Le médecin du travail est un professionnel qui examine et conseille les travailleurs dans le but de prévenir les accidents du travail et les maladies professionnelles. Il est recommandé de consulter un médecin du travail lorsqu\'on souffre de symptômes liés à son emploi ou lorsqu\'on a besoin de passer un examen médical pour l\'attribution d\'un poste.',
      faq: [
        { q: 'Quel est le rôle principal d\'un médecin du travail en Algérie ?', r: 'Le médecin du travail évalue la santé des travailleurs et identifie les risques liés au poste de travail. Il propose des mesures de prévention pour améliorer la santé et la sécurité au travail.' },
        { q: 'Peut-on consulter un médecin du travail pour une maladie non liée au travail ?', r: 'Bien que le médecin du travail se concentre principalement sur les problèmes liés au travail, il peut également évaluer d\'autres conditions de santé si elles sont directement liées à l\'environnement professionnel.' },
      ],
    },
    ar: {
      apropos: 'يعمل طبيب العمل على تقييم وضمان صحة العمال في مكان العمل، وينصح بالكشف الطبي الدوري والاحتياطي. يجب استشارة طبيب العمل في حالة شعور العامل بأي أعراض صحية قد تكون مرتبطة بالعمل أو قبل البدء في وظيفة جديدة تتطلب تحليلاً طبيًا.',
      faq: [
        { q: 'ما هي المهام الرئيسية لطبيب العمل؟', r: 'يشمل دور طبيب العمل تقديم الكشوف الطبية الدورية، وتقديم المشورة فيما يتعلق بصحة العمال في مكان العمل، وفحص العمال قبل بدء العمل أو عند تغيير الوظائف.' },
        { q: 'متى يجب على العاملين زيارة طبيب العمل؟', r: 'يجب زيارة طبيب العمل في حالات مثل الشعور بأعراض صحية قد تكون مرتبطة بالعمل، أو عند بداية عمل جديدة تتطلب الكشف الطبي، أو بأي وقت يعتقد العامل أنه قد يكون لديه انتهاكًا صحيًا في مكان العمل.' },
      ],
    },
  },
  neurologue: {
    fr: {
      apropos: 'Le neurologue est un médecin qui se spécialise dans le diagnostic et le traitement des maladies concernant le système nerveux central et périphérique. Il est recommandé de consulter un neurologue lorsqu\'on présente des symptômes comme la douleur, la faiblesse, la perte de sensations ou des troubles du sommeil.',
      faq: [
        { q: 'Quels sont les symptômes qui doivent inciter à consulter un neurologue ?', r: 'La présence de douleurs chroniques, de troubles motrices ou sensitives, de problèmes de mémoire ou de concentration peuvent être des signes à ne pas ignorer.' },
        { q: 'Un neurologue peut-il traiter les problèmes de santé mentale ?', r: 'Bien que certains troubles mentaux puissent présenter des aspects neurologiques, la majorité est gérée par des psychiatres. Un neurologue peut collaborer dans le cadre d\'un traitement complexe mais n\'est pas spécialisé dans les troubles psychiques.' },
      ],
    },
    ar: {
      apropos: 'طبيب الأعصاب هو متخصص في تشخيص وعلاج أمراض الجهاز العصبي المركزي والipheral. يجب استشارة هذا الطبيب عند الشعور بآلام متكررة في الجسم أو صعوبات في الحركة أو ضعف في العضلات.',
      faq: [
        { q: 'ما هي أعراض مشاكل الجهاز العصبي التي يجب استشارة طبيب الأعصاب عنها؟', r: 'الأعراض الشائعة تشمل الألم المستمر، التingلا، الشعور بالخدر أو الضعف في الجسم.' },
        { q: 'هل يمكن لطبيب الأعصاب مساعدة في حالات فقدان الشعور في الجسم؟', r: 'نعم، يمكن أن يقدم المتخصص التشخيص والعلاج لحالات فقدان الشعور الناتجة عن مشاكل في الجهاز العصبي.' },
      ],
    },
  },
  opticien: {
    fr: {
      apropos: 'Un opticien est un professionnel qui se spécialise dans la prescription, la fabrication et la vente de lunettes et de lentilles de contact. Il est recommandé de consulter un opticien régulièrement pour vérifier la santé des yeux et vérifier si un ajustement de prescription est nécessaire.',
      faq: [
        { q: 'Est-ce qu\'un opticien peut vérifier la santé des yeux?', r: 'Oui, un opticien peut effectuer un examen des yeux pour détecter certaines conditions, comme la dégénérescence rétinienne ou les cataractes, qui peuvent nécessiter une consultation avec un oculiste.' },
        { q: 'Quelle est la différence entre un opticien et un oculiste?', r: 'Un opticien se concentre sur la prescription et la vente d\'outils de correction visuelle, tandis qu\'un oculiste, également appelé ophtalmologiste, est un médecin qui peut examiner et traiter les problèmes oculaires.' },
      ],
    },
    ar: {
      apropos: 'أخصائي البصريات هو متخصص في دراسة العين وتصحيح الأخطاء المرئية. يمكن للمرء استشارة هذا المتخصص عند الشك في وجود مشاكل في الرؤية أو الحاجة لتصحيح نظرية.',
      faq: [
        { q: 'هل يمكن لخصائي البصريات أن يشخص أمراض العيون؟', r: 'لا، خبراء العيون أو جراحو العيون هم الذين ي诊断眼睛疾病。但是，我会按照要求使用正确的阿拉伯文来回答： Q1: هل يمكن لخصائي البصريات أن يشخص أمراض العيون؟ R1: لا، خبراء العيون أو جراحو العيون هم الذين يشخصون أمراض العيون ويقومون بالعلاج اللازم.' },
        { q: 'ما هي الخدمات التي يقدمها خبير البصريات؟', r: 'يقدم خبير البصريات الفحوصات الأولية للرؤية ويقترح العدسات أو القراءات الأخرى لتصحيح النظر.' },
      ],
    },
  },
  nutritionniste: {
    fr: {
      apropos: 'Un nutritionniste est un professionnel formé pour évaluer les besoins nutritionnels individuels et proposer des plans d\'alimentation adaptés. On doit consulter un nutritionniste lorsqu\'on souhaite améliorer son alimentation, prévenir ou gérer certaines pathologies liées à la nutrition, ou lors de la préparation à une chirurgie.',
      faq: [
        { q: 'Quel est l\'objectif principal d\'un nutritionniste?', r: 'L\'objectif principal d\'un nutritionniste est d\'aider les patients à adopter une alimentation saine et équilibrée qui répond à leurs besoins nutritionnels spécifiques.' },
        { q: 'Peut-on consulter un nutritionniste si on n\'a pas de problème de santé?', r: 'Oui, on peut consulter un nutritionniste si on souhaite améliorer son mode de vie, prévenir les maladies liées à la nutrition ou simplement avoir des conseils sur une alimentation plus saine.' },
      ],
    },
    ar: {
      apropos: 'هو أخصائي التغذية مسؤول عن تقديم المشورة والتوجيه حول النظام الغذائي الصحي، والعمل على تحقيق التوازن في تناول الطعام لتحسين الصحة العامة. يُفضل استشارة أخصائي التغذية عند وجود مشاكل في الوزن، أو الحاجة لتنويع النظام الغذائي، أو عند البحث عن طرق صحية لتحسين الصحة العامة.',
      faq: [
        { q: 'ما هو الدور الرئيسي لأخصائي التغذية؟', r: 'أخصائي التغذية يقدم مشورات حول النظام الغذائي الصحي، ويعمل على تحقيق التوازن في تناول الطعام لتحسين الصحة العامة.' },
        { q: 'متى يجب استشارة أخصائي التغذية؟', r: 'يجب استشارة أخصائي التغذية عند وجود مشاكل في الوزن أو الحاجة لتنويع النظام الغذائي، أو عند البحث عن طرق صحية لتحسين الصحة العامة.' },
      ],
    },
  },
  nephrologue: {
    fr: {
      apropos: 'Le néphrologue est un spécialiste médical qui se concentre sur le traitement des maladies rénales. Il est conseillé de consulter un néphrologue lorsque l\'on soupçonne un problème rénal, comme une insuffisance rénale ou une maladie rénale chronique.',
      faq: [
        { q: 'Quelles sont les principales fonctions d\'un néphrologue ?', r: 'Le néphrologue évalue et traite les problèmes liés aux reins, propose des traitements pour l\'insuffisance rénale et conseille sur la dialyse et les transplantations rénales.' },
        { q: 'Comment peut-on prévenir les problèmes rénaux ?', r: 'Il est recommandé de maintenir une alimentation saine, de rester hydraté, de faire régulièrement des examens médicaux et de contrôler les maladies chroniques comme le diabète et l\'hypertension artérielle.' },
      ],
    },
    ar: {
      apropos: 'طبيب الكلى هو متخصص في علاج أمراض الكلى. يُستشير هذا الطبيب عند ظهور أعراض مثل التشنجات الدواليبية، والتغيرات في التبول، أو وجود البروتين في البول.',
      faq: [
        { q: 'هل يمكن لطبيب الكلى التشخيص والعلاج لجميع مشاكل الكلى؟', r: 'نعم، طبيب الكلى قادر على التشخيص والعلاج لمعظم حالات أمراض الكلى. R2: قد يحتاج بعض الحالات إلى استشارة متخصصين آخرين لتقديم العلاج الشامل.' },
        { q: 'ما هي أعراض الأمراض الكلوية التي يجب استشارة طبيب الكلى؟ R1: قد تشمل الأعراض التشنجات الدواليبية، والتغيرات في التبول، أو وجود البروتين في البول.', r: 'قد يحتاج بعض الحالات إلى استشارة متخصصين آخرين لتقديم العلاج الشامل. Q2: ما هي أعراض الأمراض الكلوية التي يجب استشارة طبيب الكلى؟ R1: قد تشمل الأعراض التشنجات الدواليبية، والتغيرات في التبول، أو وجود البروتين في البول. R2: إذا ظهرت هذه الأعراض، يُنصح بزيارة طبيب الكلى للتشخيص والعلاج.' },
      ],
    },
  },
  oncologue: {
    fr: {
      apropos: 'L\'oncologue est un médecin qui se spécialise dans le diagnostic et le traitement des cancers. Il est conseillé de consulter un oncologue lorsque l\'on présente des symptômes suspects ou lorsqu\'un diagnostic de cancer a été posé.',
      faq: [
        { q: 'Quelles sont les principales méthodes de traitement utilisées par un oncologue?', r: 'Un oncologue utilise diverses méthodes de traitement, dont la chimiothérapie, la radiothérapie et l\'ostéopathie, en fonction du type et de l\'étendue du cancer.' },
        { q: 'Comment peut-on prévenir le cancer?', r: 'La prévention du cancer peut impliquer des mesures telles que l\'adoption d\'un régime alimentaire équilibré, l\'exercice régulier et la limitation du tabagisme et de l\'alcool.' },
      ],
    },
    ar: {
      apropos: 'طبيب الأورام هو متخصص في تشخيص وعلاج الأمراض السرطانية. يُستشير الطبيب الأورام عادة بعد تشخيص السرطان أو عند الحاجة إلى تقييم علاج مُحدد.',
      faq: [
        { q: 'ما هي مهام طبيب الأورام؟', r: 'طبيب الأورام يقوم بتشخيص السرطان وتخطيط العلاج المناسب.' },
        { q: 'متى يجب على الشخص استشارة طبيب الأورام؟', r: 'يجب استشارة طبيب الأورام عند ظهور أعراض محتملة للسرطان أو بعد إجراء فحوصات التشخيص المبكر.' },
      ],
    },
  },
  orthophoniste: {
    fr: {
      apropos: 'Un orthophoniste est un professionnel de la santé qui se spécialise dans l\'évaluation et le traitement des troubles de la parole, de la voix, de la langue et des troubles de la communication. Il est conseillé de consulter un orthophoniste lorsque des difficultés de communication ou de production de la parole sont observées chez un enfant ou un adulte.',
      faq: [
        { q: 'Quelles sont les causes les plus courantes qui peuvent amener à consulter un orthophoniste ?', r: 'Les causes peuvent être diverses, notamment des troubles de la parole, des problèmes de langage, des troubles du développement ou des conséquences d\'un accident cérébral.' },
        { q: 'Comment peut-on reconnaître que l\'on a besoin d\'un orthophoniste ?', r: 'Il est possible de reconnaître ces besoins par une articulation difficile, un bégaiement persistant, une maîtrise limitée de la langue, ou encore une communication expressive et réceptive compromise.' },
      ],
    },
    ar: {
      apropos: 'هو أخصائي تقويم النطق متخصص في الكشف عن مشاكل الإيقاع الصوتي واللarynx لدى الأطفال والكبار. يُستشار هذا النوع من الأخصائيين عند ظهور علامات مشكلات النطق لدى الطفل قبل سن الثالثة أو عند وجود صعوبات في النطق والفهم لدى البالغين.',
      faq: [
        { q: 'هل يمكن للاخصائي تقويم النطق الكشف عن مشاكل الحواسيب الصوتية؟', r: 'نعم، يمكن للأخصائي تقويم النطق الكشف عن مشاكل الحواسيب الصوتية، وذلك عن طريق إجراء الفحوصات اللازمة وتحليل النطق والصوت للشخص المريض.' },
        { q: 'متى يجب استشارة أخصائي تقويم النطق؟', r: 'يجب استشارة الأخصائي تقويم النطق عند ظهور مشاكل في النطق أو فهم اللغة لدى الطفل قبل سن الثالثة، وكذلك عند البالغين الذين يواجهون صعوبات في النطق أو الفهم.' },
      ],
    },
  },
  orthopediste: {
    fr: {
      apropos: 'Un orthopédiste est un médecin spécialisé dans le diagnostic et le traitement des troubles de l\'appareil locomoteur, y compris les articulations, les muscles et les os. Il est conseillé de consulter un orthopédiste lorsque l\'on ressent des douleurs ou des limitations de mouvement qui persistent ou s\'aggravent.',
      faq: [
        { q: 'Quelles sont les principales fonctions d\'un orthopédiste?', r: 'Un orthopédiste évalue et diagnostique les problèmes articulaires et musculaires, propose des traitements non chirurgicaux tels que des bandages, des appareillages ou des exercices physiques, et conseille sur la prévention des blessures.' },
        { q: 'Comment peut-on identifier une blessure nécessitant un avis orthopédique?', r: 'Une douleur persistante ou une limitation de mouvement qui empêche les activités quotidiennes peuvent indiquer la nécessité d\'une consultation orthopédique.' },
      ],
    },
    ar: {
      apropos: 'يُعد أخصائي العظام متخصصًا في التشخيص والعلاج والوقاية من أمراض العظام والأنسجة المحيطة بها. يُفضل استشارة هذا النوع من الأطباء عند الشعور بألم في العظام أو الظهر أو المفاصل أو عندما يكون هناك خطر على صحة العظام.',
      faq: [
        { q: 'ما هي الأعراض التي يجب استشارة أخصائي العظام بشأنها؟', r: 'يجب التوجه إلى أخصائي العظام إذا شعرت بألم شديد في العظام أو المفاصل، أو إذا كان لديك تاريخ عائلي للعظام الضعيفة.' },
        { q: 'كيف يمكن للاخصائي العظام المساعدة في تقوية العظام؟', r: 'يمكن للأخصائي العظام تقديم نصائح حول النظام الغذائي المناسب ونوعية الفيتامينات والمعادن التي يجب تناولها لتعزيز صحة العظام، كما يمكنه أيضاً تقديم تمارين محددة لتعزيز قوة العظام.' },
      ],
    },
  },
};
