import type { AreaId, ChallengeId, RoadId, ServiceId } from "@/config/nightMap";

/**
 * The copy of the consulting site (the night map), after the briefing
 * "Landingpage rsgnl consulting" (13.10.2026). German, addressed with "du".
 * Every text on the map follows one pattern: a first line with a situation or
 * a feeling, and a second, smaller one that names it in plain terms. Keyed by
 * the ids of src/config/nightMap.ts.
 */

/** A two-line text: the situation, then its plain classification. */
export interface TwoLines {
  line: string;
  detail: string;
}

/** The intro, shown while the camera flies up into the night. */
export const INTRO = {
  lines: [
    "Aus deiner Idee wurde ein Unternehmen.",
    "Und aus dir die Person, die alles entscheidet.",
    "Seitdem machst du das irgendwie. Ein, zwei Seminare, viel Bauchgefühl.",
    "Manchmal fragst du dich, warum die anderen nicht einfach so ticken wie du.",
    "Oder ob du überhaupt Chef:in sein willst.",
    "Und manchmal sieht man den Wald vor lauter Bäumen nicht mehr.",
  ],
  transition: "Zeit für jemanden mit Vogelperspektive, der Licht ins Dunkel bringt.",
  statement:
    "Unternehmensberatung für KMU. Ich bringe Strategie, Prozesse und Führung in dein Unternehmen, mit Methoden aus der Top-Management-Beratung, übersetzt in deinen Alltag.",
  hint: "Such dir eine Lichtung aus. Die, bei der du dich vielleicht wiederfindest.",
  skip: "Intro überspringen",
} as const;

export const AREA_TITLES: Record<AreaId, string> = {
  team: "Du und dein Team",
  business: "Dein Betrieb",
  market: "Dein Markt",
};

/** The challenges, one per clearing, and the path each one starts. */
export interface Challenge extends TwoLines {
  /** Woran du es merkst. */
  noticed?: string;
  /** Was dahintersteckt. */
  behind?: string;
  /** Wie ich dich unterstütze. */
  support?: string;
  /** The two services on its path, in the words of this challenge. */
  stations?: readonly [TwoLines, TwoLines];
  /** What changes at the end of the path (the mountains' preview). */
  result: TwoLines;
  /** A note on the BAFA subsidy for this path. */
  bafaNote?: string;
}

export const CHALLENGES: Record<ChallengeId, Challenge> = {
  owner: {
    line: "Ohne mich läuft nichts. Und alle warten auf mich.",
    detail: "Entscheidungen, Verantwortung und Prozesse hängen an einer Person.",
    noticed:
      "Entscheidungen warten auf dich. Urlaub ist kaum möglich. Dein Team fragt, statt zu handeln. Du arbeitest im Unternehmen statt am Unternehmen.",
    behind:
      "Meist kein Motivationsproblem, sondern unklare Rollen, Verantwortungen und Entscheidungswege.",
    support:
      "Rollen und Verantwortungen klären, Entscheidungswege festlegen, Prozesse dokumentieren, Delegation im Sparring üben.",
    stations: [
      {
        line: "Du willst wieder an deiner Sache arbeiten, nicht nur den Betrieb am Laufen halten. Dafür musst du abgeben, und das lässt sich lernen.",
        detail: "Delegation und Rollenklärung.",
      },
      {
        line: "Wenn klar ist, wer was entscheidet, muss nicht mehr alles über deinen Tisch.",
        detail: "Entscheidungswege und Prozesse.",
      },
    ],
    result: {
      line: "Dein Unternehmen läuft, auch wenn du nicht da bist.",
      detail: "Ein Team, das selbst sieht, was zu tun ist.",
    },
  },
  team: {
    line: "Ich bin jetzt Chef:in. Und im Team knirscht es.",
    detail: "Führungsrolle, Zusammenarbeit und Konflikte im Team.",
    noticed:
      "Konflikte bleiben liegen oder eskalieren plötzlich. Es bilden sich Lager, jede:r macht das eigene Ding. Du fragst dich, warum die anderen nicht so ticken wie du. Du schwankst zwischen Kolleg:in und Chef:in, Feedbackgespräche fühlen sich unangenehm an.",
    behind:
      "Wo Menschen zusammenarbeiten, sind immer Gefühle im Spiel. Die meisten wachsen in die Führung hinein, weil sie fachlich gut sind. Spannungen anzusprechen und ein Team auszurichten, ist aber ein eigenes Handwerk.",
    support:
      "Führungs-Sparring 1:1, Konfliktklärung im Team, eigener Führungsstil, Feedback- und Gesprächsformate, gemeinsame Ziele und klare Rollen, Team-Workshops.",
    stations: [
      {
        line: "Spannungen anzusprechen ist Führungsaufgabe. Und das lässt sich lernen.",
        detail: "Konfliktklärung, Feedback, Führungsstil.",
      },
      {
        line: "Spannungen zeigen oft, dass sich etwas verändert. Ein Team zieht mit, wenn es versteht, warum.",
        detail: "Zusammenarbeit und Team Buy-in.",
      },
    ],
    result: {
      line: "Konflikte werden angesprochen statt ausgesessen, und alle ziehen an einem Strang.",
      detail: "Ein Team, das zusammenarbeitet.",
    },
    bafaNote: "Gefördert wird die Einzelberatung, nicht Team-Workshops.",
  },
  structures: {
    line: "Bei uns ist alles irgendwie gewachsen. Zum Aufräumen fehlt die Zeit.",
    detail: "Strukturen und Prozesse ordnen, im laufenden Betrieb.",
    noticed:
      "Ihr habt den Betrieb übernommen oder selbst aufgebaut. Jede:r macht es ein bisschen anders. Wissen steckt in Köpfen statt in Abläufen. Fehler passieren immer an denselben Stellen. Zum Innehalten fehlt die Zeit.",
    behind:
      "Abläufe wachsen mit dem Alltag mit, Schicht um Schicht. Irgendwann weiß niemand mehr, warum etwas so gemacht wird. Und das Entwirren kostet Zeit, die im Tagesgeschäft fehlt.",
    support:
      "Bestandsaufnahme der Abläufe, Prozessanalyse und -optimierung mit Lean, klare Zuständigkeiten, Dokumentation, Begleitung der Umstellung im Team. Bei einer Übernahme auch die Begleitung des Übergangs.",
    stations: [
      {
        line: "Gewachsene Abläufe haben einen Grund. Aber nicht jeder davon gilt noch.",
        detail: "Prozessanalyse und Lean.",
      },
      {
        line: "Neue Abläufe funktionieren nur, wenn das Team sie mitträgt.",
        detail: "Veränderung im laufenden Betrieb.",
      },
    ],
    result: {
      line: "Abläufe, die auch funktionieren, wenn es stressig wird.",
      detail: "Klare Strukturen.",
    },
    bafaNote: "Auch bei einer Unternehmensübernahme förderfähig.",
  },
  scaling: {
    line: "Es läuft richtig gut. Jetzt soll es größer werden.",
    detail: "Strategie, Strukturen und Prozesse, die Wachstum tragen.",
    noticed:
      "Die Nachfrage wächst schneller als die Kapazität. Abläufe hängen an Einzelnen. Ein neuer Standort, ein neues Segment oder ein Online-Angebot steht im Raum.",
    behind: "Was für zehn Leute funktioniert, trägt selten für dreißig.",
    support:
      "Wachstumsstrategie, Geschäftsmodell, Strukturen und Prozesse mit Lean, Markt- und Zielgruppenanalyse.",
    stations: [
      {
        line: "Wachstum planen, bevor es dich überrollt.",
        detail: "Geschäftsmodell, Strukturen, Prozesse.",
      },
      {
        line: "Die richtigen Märkte, Zielgruppen und Partner für den nächsten Schritt.",
        detail: "Strukturierte Marktbearbeitung.",
      },
    ],
    result: {
      line: "Du wächst, ohne dass es wackelt.",
      detail: "Kontrolliertes Wachstum.",
    },
  },
  visibility: {
    line: "Wir sind richtig gut. Weiß nur kaum jemand.",
    detail: "Zielgruppen, Positionierung und Vertriebsstrategie schärfen.",
    noticed:
      "Neue Kund:innen kommen fast nur über Empfehlungen. Es ist schwer zu erklären, was euch unterscheidet. Der Preis wird zum Hauptargument.",
    behind: "Oft fehlt die Klarheit, für wen genau ihr da seid und warum gerade ihr.",
    support:
      "Zielgruppen und Personas, Positionierung, Markenstrategie, Vertriebsstrategie und Vertriebswege.",
    stations: [
      {
        line: "Gute Arbeit verkauft sich nicht von allein. Erst muss klar sein, wer deine Kund:innen sind und wo du sie findest.",
        detail: "Zielgruppen, Personas, Vertriebswege.",
      },
      {
        line: "Wer klar zeigt, wofür er steht, muss weniger erklären.",
        detail: "Positionierung und Außenauftritt.",
      },
    ],
    result: {
      line: "Die richtigen Kund:innen finden dich und bleiben.",
      detail: "Mehr Umsatz durch Klarheit.",
    },
  },
  ideation: {
    line: "Es muss sich was verändern, damit wir weiter wachsen. Nur die Ideen fehlen.",
    detail: "Neue Produkte, Leistungen und Geschäftsfelder entwickeln.",
    noticed:
      "Ihr spürt, dass ihr euch verändern müsst, um weiter zu wachsen. Das Angebot ist seit Jahren gleich. Ideen versanden im Alltag. Wettbewerber ziehen vorbei. Dein Team hätte Ideen, aber kein Format dafür.",
    behind: "Im Tagesgeschäft fehlt der Raum, um strukturiert Neues zu entwickeln.",
    support:
      "Ideen- und Design-Thinking-Workshops, Design Sprints, Ideen bewerten und priorisieren, am Markt testen. Auch als einzelner Workshop buchbar.",
    stations: [
      {
        line: "Gute Ideen entstehen selten zufällig, sondern mit einem klaren Ablauf.",
        detail: "Design Thinking und Sprints.",
      },
      {
        line: "Eine neue Idee muss zu dem passen, wofür ihr steht. Sonst nimmt sie euch niemand ab.",
        detail: "Positionierung und Angebot.",
      },
    ],
    result: {
      line: "Neue Angebote, die zu euch passen, und Wachstum, das weitergeht.",
      detail: "Umsetzbare Innovation.",
    },
    bafaNote: "Gefördert wird „Der Blick von oben“ als Einzelberatung, nicht Ideen-Workshops.",
  },
  clarify: {
    line: "Irgendwas stimmt nicht. Ich weiß nur nicht, was.",
    detail: "Gemeinsam herausfinden, wo der Hebel liegt.",
    behind:
      "Oft liegt die Ursache woanders als das Symptom. Im kostenlosen Kennenlerngespräch finden wir gemeinsam heraus, wo der Hebel liegt.",
    result: {
      line: "Genau dafür ist das Kennenlerngespräch da.",
      detail: "Kostenlos, ehrlich, ohne Verkaufsgespräch.",
    },
  },
};

/** A block of a service's panel. */
export interface Block {
  title: string;
  text: string;
}

export interface Service {
  title: string;
  /** Hover preview: a line, then the plain terms. */
  preview: TwoLines;
  about: string;
  forWhom?: string;
  benefit?: string;
  /** Was du buchen kannst (or "außerdem", after a highlighted format). */
  book: string;
  bookTitle?: string;
  methods?: string;
  /** A format shown first and highlighted. */
  highlight?: Block;
  /** Further blocks after "Worum es geht" (e.g. the research, collapsible). */
  extra?: readonly (Block & { points?: readonly Block[]; source?: string; collapsible?: boolean })[];
}

export const SERVICES: Record<ServiceId, Service> = {
  strategy: {
    title: "Strategie & Skalierung",
    preview: {
      line: "Wachsen, ohne dass alles an dir hängt.",
      detail: "Geschäftsmodell, Strukturen und Prozesse.",
    },
    about:
      "Eine tragfähige Strategie für Geschäftsmodell, Positionierung und kontrolliertes Wachstum, von der lokalen Expansion bis zur Skalierung online.",
    forWhom: "Unternehmen, die wachsen wollen oder deren Strukturen nicht mehr passen.",
    benefit: "Wachstum mit Strukturen, die tragen. Teure Fehler durch fehlende Prozesse werden vermieden.",
    book: "Strategie-Workshop, Entwicklung des Geschäftsmodells, Ziele mit OKRs, Prozessanalyse und -optimierung, Wachstums- und Expansionsplanung.",
    methods: "Business Model Design, OKR, Lean Management, agile Frameworks.",
  },
  leadership: {
    title: "Leadership",
    preview: {
      line: "Führen lässt sich lernen, auch wenn man es nie geplant hat.",
      detail: "Rollen, Delegation, Feedback, Selbstführung.",
    },
    about: "Führungskompetenz für Gründer:innen und alle, die zum ersten Mal führen.",
    forWhom: "Inhaber:innen und Führungskräfte, die in ihre Rolle hineingewachsen sind.",
    benefit: "Souveräne Führung mit klaren Rollen, funktionierender Delegation und stabiler Selbstführung.",
    book: "Führungs-Sparring 1:1, Klärung von Rollen und Verantwortung, Delegation, Feedback-Kultur, Konfliktklärung im Team, Team-Workshops zu Zusammenarbeit und Teamdynamik.",
    methods: "Aus der Arbeit mit C-Level-Kund:innen und eigener Führung von Teams bis 60 Personen.",
  },
  bizdev: {
    title: "Business Development",
    preview: {
      line: "Neue Chancen finden und erschließen.",
      detail: "Märkte, Zielgruppen, Partnerschaften, Vertriebsstrategie.",
    },
    about:
      "Wachstumschancen systematisch finden, bewerten und erschließen. Die Strategie legt fest, wohin du willst. Business Development findet dort die Chancen. Der Vertrieb macht daraus Abschlüsse.",
    forWhom: "Unternehmen, die neue Kund:innen, Märkte oder Geschäftsfelder suchen.",
    benefit: "Ein konkreter Plan, welche Chancen sich lohnen und wie du sie mit deinen Ressourcen nutzt.",
    book: "Markt- und Wettbewerbsanalyse, Zielgruppen und Personas, neue Geschäftsfelder und Geschäftsmodelle, Partnerschaften und Kooperationen, Markteintritt und Vertriebsstrategie.",
    methods: "Marktanalyse, Personas, Business Model Design, Go-to-Market-Planung.",
  },
  innovation: {
    title: "Innovation & Ideation",
    preview: {
      line: "Ich bringe Ideen mit. Und entwickle sie mit euch weiter.",
      detail: "Neue Produkte, Erweiterungen, Design Thinking.",
    },
    about:
      "Ich schaue auf dein Unternehmen und sehe, was noch drinsteckt: neue Produkte, Erweiterungen des Angebots, neue Geschäftsfelder. Ich bringe konkrete Ideen mit und entwickle sie mit dir und deinem Team weiter, bis daraus ein Angebot wird.",
    forWhom:
      "Unternehmen, die wachsen wollen und spüren, dass sich etwas verändern muss. Und Teams, die selbst Ideen haben, aber kein Format dafür.",
    benefit: "Konkrete, priorisierte Ideen statt kreativem Chaos, mit klaren nächsten Schritten.",
    highlight: {
      title: "Der Blick von oben",
      text: "Du brauchst frische Ideen? Ich schaue mir dein Unternehmen an und bringe sie mit. Mehr dazu unter Formate.",
    },
    bookTitle: "Was du außerdem buchen kannst",
    book: "Ideen-Workshop, Design-Thinking-Workshop, Design Sprint, Bewertung und Priorisierung von Ideen, Test am Markt.",
    methods: "Design Thinking, Design Sprints, Business Model Design.",
  },
  brand: {
    title: "Markenführung",
    preview: {
      line: "Zeig, was du kannst, dann musst du weniger erklären.",
      detail: "Positionierung, Zielgruppen, Markenidentität.",
    },
    about:
      "Positionierung, Markenstrategie und Markenidentität. Wer deine Zielgruppe ist, was sie braucht und wie du sie erreichst.",
    forWhom: "Unternehmen, die mehr können, als sie nach außen zeigen.",
    benefit: "Klarheit und Wiedererkennbarkeit, von der Website bis zum Verkaufsgespräch.",
    book: "Positionierung, Zielgruppen und Personas, Markenstrategie, Markenidentität. Die visuelle Umsetzung erfolgt mit Kreativpartner:innen, die Steuerung bleibt bei mir.",
  },
  change: {
    title: "Change & Transformation",
    preview: {
      line: "Veränderung macht unsicher. Gut, wenn jemand vorangeht.",
      detail: "Kultur, Transformation, Team Buy-in.",
    },
    about:
      "Wo sich wirklich etwas verändern soll, entstehen Spannungen. Das ist normal. Wir Menschen sind Gewohnheitstiere, so ist unser Gehirn gebaut. Veränderung führt auf ungewohntes Terrain, und Unsicherheit setzt uns nachweislich unter Stress, manchmal stärker als eine schlechte Nachricht, die feststeht. Daraus entstehen Ängste. Diesen Ängsten muss man begegnen, statt sie zu übergehen.",
    extra: [
      {
        title: "Was die Forschung sagt",
        text: "",
        collapsible: true,
        points: [
          {
            title: "Gewohnheiten sind im Gehirn verdrahtet.",
            text: "Was wir oft tun, wird zur festen Bahn. Aus Trampelpfaden werden Autobahnen, und die leitet man nicht von heute auf morgen um.",
          },
          {
            title: "Unsicherheit stresst mehr als Gewissheit.",
            text: "In einer Studie des University College London war die Situation „vielleicht passiert etwas Unangenehmes“ belastender als die Gewissheit, dass es passiert.",
          },
          {
            title: "Veränderung beginnt in Gruppen.",
            text: "Sie wird von Menschen angestoßen, die vorangehen und andere mitnehmen.",
          },
        ],
        source: "de Berker et al., Nature Communications 2016; Maren Urner, Neurowissenschaftlerin.",
      },
      {
        title: "Die gute Nachricht",
        text: "In jedem Team gibt es Menschen, die Lust auf Neues haben und dem Unbekannten mit Neugier begegnen. Weißt du, wer die Abenteurer:innen in deinem Unternehmen sind? Die, die mutig vorangehen und die anderen mitnehmen?",
      },
    ],
    forWhom: "Unternehmen im Umbruch, im Wachstum oder in einer Neuausrichtung.",
    benefit: "Weniger Widerstand, mehr Bindung im Team und eine Veränderung, die tatsächlich gelebt wird.",
    book: "Begleitung von Transformationsprozessen, die Abenteurer:innen im Team finden und als Vorreiter:innen einbinden, Umgang mit Unsicherheit und Widerstand, Kommunikation von Veränderung, Kultur-Workshops.",
    methods: "Change Management, Transformationskommunikation, agile Umsetzung.",
  },
};

/** The roads: why a challenge needs two services. */
export interface Road {
  /** Du merkst. */
  noticed: string;
  /** Warum beides zusammengehört. */
  why: string;
  /** Der Zusammenhang in einem Satz (bold; also the hover preview). */
  link: string;
  /** Dabei unterstütze ich dich. */
  support: string;
}

export const ROAD_TEXTS: Record<RoadId, Road> = {
  "leadership-strategy": {
    noticed: "Alles läuft über deinen Tisch, und dein Team wartet auf dich.",
    why: "Abgeben scheitert selten am Willen, sondern daran, dass niemand weiß, wer was entscheiden darf. Du kannst nur loslassen, wenn klar ist, wer übernimmt.",
    link: "Leadership: Du lernst abzugeben. Strategie: Es ist klar, wer was entscheidet.",
    support: "Ich kläre mit dir Rollen und Entscheidungswege und übe mit dir das Abgeben.",
  },
  "leadership-change": {
    noticed: "Gespräche drehen sich im Kreis, Konflikte bleiben liegen.",
    why: "Spannungen lösen sich nicht von allein. Jemand muss sie ansprechen, das ist Führung. Und das Team muss den neuen Weg mitgehen, das ist Veränderung.",
    link: "Führung spricht an. Change nimmt alle mit.",
    support: "Ich kläre Konflikte mit euch und begleite das Team zu einer Zusammenarbeit, die trägt.",
  },
  "strategy-change": {
    noticed: "Alle wissen, dass es so nicht bleiben kann. Und am Ende macht jede:r weiter wie bisher.",
    why: "Neue Abläufe auf dem Papier ändern nichts. Gewohnheiten ändern sich erst, wenn das Team versteht, warum, und es mitgestaltet.",
    link: "Strategie ordnet die Abläufe. Change sorgt dafür, dass sie gelebt werden.",
    support: "Ich entwirre mit euch die Abläufe und begleite die Umstellung im laufenden Betrieb.",
  },
  "strategy-bizdev": {
    noticed: "Die Nachfrage ist da, aber du weißt nicht, welches Wachstum sich wirklich lohnt.",
    why: "Ohne Strategie ist jede Chance die richtige. Die Strategie legt fest, wohin ihr wachsen wollt. Business Development findet dort die passenden Märkte, Zielgruppen und Partner.",
    link: "Strategie: wohin. Business Development: wo genau.",
    support: "Ich plane mit dir das Wachstum und kläre, welche Märkte und Kund:innen sich lohnen.",
  },
  "bizdev-brand": {
    noticed: "Im Gespräch überzeugt ihr, aber zu wenige kommen überhaupt bis dahin.",
    why: "Erst muss klar sein, wen ihr erreichen wollt. Dann muss diese Zielgruppe euch auch wahrnehmen. Bevor jemand mit dir spricht, hat er sich längst ein Bild gemacht.",
    link: "Business Development findet die richtigen Kund:innen. Die Marke sorgt dafür, dass sie euch finden.",
    support: "Ich sage dir, welche Menschen deine Zielgruppe sind, was sie brauchen und wie du sie ansprichst.",
  },
  "innovation-brand": {
    noticed: "Ihr wollt weiter wachsen, aber euch fällt nichts Neues ein. Oder das Neue passt nicht zu euch.",
    why: "Neue Ideen müssen zu dem passen, wofür ihr steht. Menschen kaufen Neues am ehesten von jemandem, dem sie schon vertrauen. Die Marke zeigt, in welche Richtung ihr euch glaubwürdig verändern könnt.",
    link: "Innovation liefert neue Ideen. Die Marke zeigt, welche zu euch passen.",
    support: "Ich entwickle mit deinem Team neue Ideen und prüfe mit dir, welche zu euch passen.",
  },
  "innovation-bizdev": {
    noticed: "Ihr habt eine gute Idee, aber keiner kauft sie.",
    why: "Eine Idee ohne Markt bleibt ein Hobby. Erst wenn klar ist, wer sie braucht und kauft, wird daraus ein Geschäft.",
    link: "Innovation liefert die Idee. Business Development macht ein Angebot daraus.",
    support: "Ich prüfe neue Ideen mit dir am Markt.",
  },
};

/** The mountains: what changes after working together. */
export const RESULTS = {
  title: "Was sich verändert",
  preview: { line: "Aussicht auf Besserung.", detail: "Ergebnisse und Weitblick." },
  intro:
    "Der Ausblick kommt nicht von allein. Aber den Weg nach oben gehst du nicht allein.",
  emphasis: "Veränderung braucht Mitarbeit, von dir und deinem Team.",
  points: [
    "Entscheidungen werden dort getroffen, wo das Wissen ist.",
    "Rollen und Zuständigkeiten sind klar, die Wege kurz.",
    "Dein Team weiß, wohin es geht, und zieht mit.",
    "Wachstum ist geplant, nicht zufällig.",
    "Neue Ideen kommen bis zur Umsetzung.",
    "Du hast wieder Zeit für das, wofür du gegründet hast.",
  ],
} as const;

/** How working together goes, and the formats. */
export const PROCESS = {
  title: "Vorgehen und Formate",
  intro:
    "So läuft jede Zusammenarbeit ab: Konzeption und Exploration, Durchführung, Dokumentation, Nachbereitung. Du bekommst nach jedem Schritt Ergebnisse, mit denen du weiterarbeiten kannst.",
  steps: [
    { line: "Wir reden. Kostenlos, ehrlich, ohne Verkaufsgespräch.", detail: "Kennenlerngespräch" },
    { line: "Du bekommst ein Angebot, das zu dir passt, nicht zu meinem Portfolio.", detail: "Analyse und individuelles Angebot" },
    { line: "Wir setzen es um. So lange wie nötig, nicht länger.", detail: "Gemeinsame Umsetzung" },
  ],
  formats: [
    {
      title: "Der Blick von oben",
      text: "Ich schaue mir dein Unternehmen ein bis zwei Tage an, mit Gesprächen, Abläufen und Angebot. Danach bekommst du konkrete Ideen, was noch in deinem Unternehmen steckt: neue Produkte, Erweiterungen, Verbesserungen. Priorisiert und mit ersten Schritten.",
      note: "Fester Umfang, klares Ergebnis, auch einzeln buchbar.",
      highlight: true,
    },
    { title: "Sparring", text: "Ein bis zwei Stunden zu einer konkreten Frage, mit Vorbereitung. Einzeln oder als Paket." },
    { title: "Workshop", text: "Halb- oder ganztägig, mit dir oder deinem Team. Vor Ort oder online." },
    { title: "Sprint oder Projekt", text: "Mehrere Wochen zu einem klar umrissenen Thema." },
    { title: "Begleitung", text: "Monatlich, für alle, die eine feste Sparringspartnerin an ihrer Seite wollen." },
  ],
  costs: "Jedes Angebot ist individuell. Im Kennenlerngespräch klären wir Umfang und Kosten.",
} as const;

/** The meadow: about Simone. */
export const ABOUT = {
  name: "Simone Slawik",
  role: "Unternehmensberaterin für KMU und Gründer:innen",
  intro:
    "Ich habe Konzerne beraten, ein eigenes Startup gegründet und eine Baustelle mit über dreißig Firmen geleitet. Gelernt habe ich dabei vor allem eins: Die wenigsten Probleme sind Sachprobleme. Und meine größte Stärke: auf ein Unternehmen zu schauen und zu sehen, was noch drinsteckt.",
  approach:
    "Ich schaue aufs Ganze, weil Probleme selten dort entstehen, wo sie wehtun. Menschen vor Effizienz, weil ein Team mehr kann als jeder Prozess. Und wenn du den Wald vor lauter Bäumen nicht siehst, schauen wir gemeinsam von oben drauf.",
  approachTags: "Systemisch, methodisch, umsetzungsorientiert.",
  stations: [
    {
      years: "2021 bis 2026",
      text: "Technology Consultant bei Accenture. C-Level-Beratung, Transformation, Innovations- und Design-Thinking-Workshops, OKR-Facilitation, Führung von Teams bis 60 Personen.",
    },
    { years: "2019 bis 2021", text: "Corporate Communications und New Business bei BurdaForward." },
    { years: "2018 bis 2021", text: "Gründerin und CEO eines KI-Recruiting-Startups." },
    {
      years: "2016 bis 2018",
      text: "Bauleiterin bei Wayss & Freytag. Lean Management, Führung von 20 Mitarbeitenden und über 30 Nachunternehmern.",
    },
  ],
  education: "M.Sc. Management and Technology, B.Eng. Bauingenieurwesen, Grundstudium Philosophie und Ethik.",
  more: "BAFA-gelistete Unternehmensberaterin. Mentorin bei Women in Tech.",
} as const;

/**
 * Testimonials, one firefly each (at most three for now; add entries to add
 * fireflies, see TESTIMONIAL_HOMES). Only with the client's written consent.
 */
export const TESTIMONIALS: readonly { quote: string; name: string; role: string; company: string }[] = [
  {
    quote:
      "Simone hat sich wirklich viel Zeit genommen, um sich meine ganz persönliche Situation anzuhören. Ihr Lösungsansatz ist immer auf die Situation abgestimmt und man hat nie das Gefühl, dass einem gerade Methoden übergestülpt werden. Der Mensch steht hier klar im Mittelpunkt.",
    // Name, role and company follow once the client has agreed.
    name: "Name folgt",
    role: "Rolle",
    company: "Firma",
  },
];

/** The first sentence of a quote, for the hover preview. */
export const firstSentence = (text: string) => text.match(/^.*?[.!?](\s|$)/)?.[0].trim() ?? text;

/** The lantern: the BAFA subsidy (until the end of 2026). */
export const BAFA_TEXT = {
  title: "BAFA-Förderung bis Ende 2026",
  text: "Ich bin beim BAFA gelistet. Für kleine und mittlere Unternehmen in Bayern übernimmt das BAFA bis zu 1.750 € der Beratungskosten. Der Antrag muss vor Beginn der Beratung gestellt werden. Ich zeige dir, wie es geht.",
} as const;

/** `bafa`: the subsidy note is added to the answer while it runs. */
export const FAQ: readonly { question: string; answer: string; bafa?: boolean }[] = [
  {
    question: "Für wen ist deine Beratung?",
    answer:
      "Für Inhaber:innen, Geschäftsführer:innen und Gründer:innen kleiner und mittlerer Unternehmen, die an einem Wachstums- oder Wendepunkt stehen.",
  },
  {
    question: "Was kostet eine Beratung?",
    answer:
      "Jedes Angebot ist individuell und richtet sich nach Umfang und Format. Das Kennenlerngespräch ist kostenlos.",
    bafa: true,
  },
  {
    question: "Kann ich dich einfach für Ideen buchen?",
    answer:
      "Ja. Dafür gibt es den „Blick von oben“: Ich schaue mir dein Unternehmen an und bringe konkrete, priorisierte Ideen mit.",
  },
  {
    question: "Kann ich auch nur einen Workshop buchen?",
    answer: "Ja. Viele starten mit einem einzelnen Workshop oder einer Sparring-Session.",
  },
  {
    question: "Arbeitest du vor Ort oder online?",
    answer: "In München und Umgebung vor Ort, deutschlandweit online.",
  },
  {
    question: "Wie lange dauert eine Zusammenarbeit?",
    answer:
      "Von einer einzelnen Session bis zu einer Begleitung über mehrere Monate, je nachdem, was du brauchst.",
  },
  {
    question: "Muss mein Team dabei sein?",
    answer:
      "Kommt aufs Thema an. Führungsthemen beginnen oft im 1:1, Strategie- und Ideen-Workshops funktionieren am besten mit dem Team.",
  },
  {
    question: "Was unterscheidet dich von großen Beratungen oder Coaches?",
    answer:
      "Methodische Tiefe aus der Top-Management-Beratung, verbunden mit dem Blick auf die Menschen. Und bezahlbar für kleine und mittlere Unternehmen.",
  },
  { question: "Bleibt das vertraulich?", answer: "Ja. Alles, was du mir erzählst, bleibt unter uns." },
];
/** Added to the answers marked `bafa` while the subsidy runs. */
export const FAQ_BAFA_NOTE = "Bis Ende 2026 kann das BAFA bis zu 1.750 € übernehmen.";

/** The goal at the edge of the map. */
export const CONTACT = {
  preview: "Kennenlerngespräch",
  title: "Erzähle mir, vor welcher Herausforderung du gerade stehst.",
  text: "Eine kurze Zusammenfassung reicht. Den Rest besprechen wir gemeinsam. Ich melde mich innerhalb von zwei Werktagen persönlich.",
  cta: "Termin vereinbaren",
  /** Placeholders until the real details exist. */
  email: "hallo@rsgnl-consulting.de",
  phone: "+49 89 000000",
  /** The booking mail (a stand-in for the calendar): its subject, and the line the visitor's challenge follows. */
  mailSubject: "Kennenlerngespräch",
  mailChallenge: "Meine Herausforderung:",
  newsletter: "Newsletter „Leadership in wilden Zeiten“",
} as const;

/** Labels of the night navigation and the panel. */
export const UI = {
  nav: {
    services: "Leistungen",
    process: "Vorgehen",
    about: "Über mich",
    contact: "Erstgespräch vereinbaren",
    contactShort: "Erstgespräch",
    menu: "Menü",
    closeMenu: "Menü schließen",
    sound: "Umgebungsklang",
  },
  footer: { label: "Service", faq: "Häufige Fragen", contact: "Kontakt", imprint: "Impressum" },
  map: { label: "Karte", challenges: "Herausforderungen", more: "Weitere Orte", tapToOpen: "Antippen zum Öffnen" },
  path: {
    station: "Station",
    more: "Mehr zu",
    bafaDefault: "Die Beratung auf diesem Pfad ist förderfähig.",
    bafaLink: "Förderung und Ablauf",
    results: "Was sich verändert",
    yourClearing: "Deine Lichtung",
    roads: "Zusammenhänge",
    sources: "Quellen",
  },
  categories: {
    challenge: "Herausforderung",
    service: "Leistung",
    road: "Zusammenhang",
    results: "Ergebnis",
    process: "Vorgehen",
    about: "Über mich",
    testimonial: "Kundenstimme",
    bafa: "Förderung",
    faq: "Häufige Fragen",
    contact: "Kontakt",
    services: "Leistungen",
  },
  blocks: {
    noticed: "Woran du es merkst",
    behind: "Was dahintersteckt",
    support: "Wie ich dich unterstütze",
    about: "Worum es geht",
    forWhom: "Für wen",
    benefit: "Was du davon hast",
    book: "Was du buchen kannst",
    methods: "Methoden",
    roadNoticed: "Du merkst",
    roadWhy: "Warum beides zusammengehört",
    roadSupport: "Dabei unterstütze ich dich",
    approach: "So arbeite ich",
    stations: "Stationen",
    education: "Ausbildung",
    more: "Außerdem",
    formats: "Formate",
    costs: "Kosten",
    steps: "So läuft es ab",
  },
  related: "Weiterlesen",
  close: "Schließen",
  servicesIntro:
    "Vier Kernleistungen und zwei ergänzende. Welche zusammengehören, zeigen die Pfade auf der Karte.",
} as const;
