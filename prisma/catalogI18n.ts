/*
 * Переводы курируемого каталога (prisma/catalog.ts).
 *
 * Базовый язык каталога — русский, он лежит в самих полях CatalogItem.
 * Здесь en и es: ключ — тот же `slug`, что и в каталоге.
 *
 * Отдельным файлом, а не полем внутри каждой карточки, по одной причине:
 * catalog.ts читают, когда думают про состав и пропорцию каталога, а этот
 * файл — когда правят формулировки. Смешивать эти две задачи в одном
 * объекте значит каждый раз пролистывать втрое больше текста.
 *
 * Полнота проверяется тестом (prisma/catalogI18n.test.ts): у каждого slug
 * обязаны быть оба языка, а `location` переведён везде, где он есть.
 * Забыть перевод у новой карточки нельзя — тест покраснеет.
 *
 * Тон тот же, что в русском (14-brand-and-copy): спокойно, конкретно,
 * без пафоса и без языка продуктивности. Это не подстрочник: где дословный
 * перевод звучит канцелярски, фраза пересобрана — важен тон, а не буква.
 *
 * Названия мест сербские: для en/es они не переводятся, а даются латиницей —
 * так их подпишет любая карта и так их поймёт таксист. Переводится только
 * то, что действительно является описанием («Двориште Кинотеке» → «двор
 * Синематеки»), а не именем собственным.
 */

export type CatalogTranslation = {
  title: string;
  description: string;
  /** Только там, где у карточки есть `location`. */
  location?: string;
};

export type CatalogTranslations = {
  en: CatalogTranslation;
  es: CatalogTranslation;
};

export const CATALOG_I18N: Record<string, CatalogTranslations> = {
  /* ───────────────────────────── EVENT ───────────────────────────── */

  "bg-ada-sunrise-kayak": {
    en: {
      title: "Sunrise kayaking on Ada",
      description: "Groups of up to six, no experience needed. Gear included.",
      location: "Ada Ciganlija",
    },
    es: {
      title: "Kayak al amanecer en Ada",
      description: "Grupos de hasta seis, sin experiencia previa. Equipo incluido.",
      location: "Ada Ciganlija",
    },
  },
  "bg-kalemegdan-night-walk": {
    en: {
      title: "Night walk through Kalemegdan",
      description:
        "The fortress, the meeting of the Sava and the Danube, the city from above. Free.",
      location: "Kalemegdan",
    },
    es: {
      title: "Paseo nocturno por Kalemegdan",
      description: "La fortaleza, la unión del Sava y el Danubio, la ciudad desde arriba. Gratis.",
      location: "Kalemegdan",
    },
  },
  "bg-pottery-workshop": {
    en: {
      title: "Pottery workshop for beginners",
      description: "The potter fires your piece afterwards. You can come as a pair.",
      location: "Dorćol",
    },
    es: {
      title: "Taller de cerámica para principiantes",
      description: "El ceramista hornea tu pieza después. Puedes venir en pareja.",
      location: "Dorćol",
    },
  },
  "bg-kolarac-organ": {
    en: {
      title: "Organ evening at Kolarac",
      description: "A classical programme by candlelight. There are usually tickets left.",
      location: "Ilija M. Kolarac Endowment",
    },
    es: {
      title: "Noche de órgano en Kolarac",
      description: "Programa clásico a la luz de las velas. Casi siempre quedan entradas.",
      location: "Fundación Ilija M. Kolarac",
    },
  },
  "bg-climbing-intro": {
    en: {
      title: "Climbing gym: first session",
      description: "Instructor and gear included. Coming alone is fine.",
      location: "Voždovac",
    },
    es: {
      title: "Rocódromo: primera sesión",
      description: "Monitor y equipo incluidos. Puedes ir solo.",
      location: "Voždovac",
    },
  },
  "bg-skydive-tandem": {
    en: {
      title: "Tandem skydive",
      description: "An hour of briefing, forty seconds of free fall. Book ahead.",
      location: "Lisičji Jarak Airfield",
    },
    es: {
      title: "Salto en paracaídas en tándem",
      description:
        "Una hora de instrucción, cuarenta segundos de caída libre. Reserva con antelación.",
      location: "Aeródromo Lisičji Jarak",
    },
  },
  "bg-dance-first-class": {
    en: {
      title: "First salsa class",
      description: "People come without a partner and without experience — partners rotate.",
      location: "Vračar",
    },
    es: {
      title: "Primera clase de salsa",
      description: "Se viene sin pareja y sin experiencia: las parejas van rotando.",
      location: "Vračar",
    },
  },
  "bg-flea-market-dawn": {
    en: {
      title: "Flea market at dawn",
      description: "The good things are gone by eight. Bring cash.",
      location: "Buvljak, Zemun",
    },
    es: {
      title: "Mercadillo al amanecer",
      description: "Lo bueno vuela antes de las ocho. Lleva efectivo.",
      location: "Buvljak, Zemun",
    },
  },
  "ns-petrovaradin-sunrise": {
    en: {
      title: "Sunrise at Petrovaradin Fortress",
      description: "The Danube in mist and the empty city below. It means getting up early.",
      location: "Petrovaradin Fortress",
    },
    es: {
      title: "Amanecer en la fortaleza de Petrovaradin",
      description: "El Danubio entre la niebla y la ciudad vacía abajo. Hay que madrugar.",
      location: "Fortaleza de Petrovaradin",
    },
  },
  "ns-danube-cycling": {
    en: {
      title: "A day on a bike along the Danube",
      description: "A flat route along the embankment, rentals right there.",
      location: "Štrand",
    },
    es: {
      title: "Un día en bici junto al Danubio",
      description: "Ruta llana por el paseo fluvial, con alquiler al lado.",
      location: "Štrand",
    },
  },
  "ns-shared-dinner": {
    en: {
      title: "Dinner at a shared table",
      description: "Made for meeting people: eight seats, home cooking from Vojvodina.",
      location: "City centre",
    },
    es: {
      title: "Cena en mesa compartida",
      description: "Pensado para conocer gente: ocho comensales, cocina casera de Voivodina.",
      location: "Centro",
    },
  },
  "ns-fruska-gora-hike": {
    en: {
      title: "A day on foot in Fruška Gora",
      description: "A marked trail with monasteries along the way. Bus from the centre.",
      location: "Fruška Gora",
    },
    es: {
      title: "Un día a pie por Fruška Gora",
      description: "Sendero señalizado y monasterios por el camino. Autobús desde el centro.",
      location: "Fruška Gora",
    },
  },
  "bg-blood-donation": {
    en: {
      title: "Give blood",
      description: "Half an hour, bring ID, eat something light beforehand. No appointment needed.",
      location: "Blood Transfusion Institute",
    },
    es: {
      title: "Donar sangre",
      description: "Media hora, lleva documento y come algo ligero antes. Sin cita previa.",
      location: "Instituto de Transfusión Sanguínea",
    },
  },
  "bg-shelter-volunteering": {
    en: {
      title: "A day at the dog shelter",
      description: "Walking and cleaning. One-off visits are fine, with no commitment.",
      location: "Shelter, Ovča",
    },
    es: {
      title: "Un día en la protectora de perros",
      description: "Pasear y limpiar. Se puede ir una sola vez, sin compromiso.",
      location: "Refugio, Ovča",
    },
  },
  "bg-thermal-bath": {
    en: {
      title: "A day at the thermal springs",
      description: "Hot water in the open air. Open all year round.",
      location: "Banja Koviljača",
    },
    es: {
      title: "Un día en las termas",
      description: "Agua caliente al aire libre. Abierto todo el año.",
      location: "Banja Koviljača",
    },
  },
  "bg-open-air-cinema": {
    en: {
      title: "Cinema in the open air",
      description: "Bring a blanket. It starts after sunset.",
      location: "Cinematheque courtyard",
    },
    es: {
      title: "Cine al aire libre",
      description: "Lleva una manta. Empieza después del atardecer.",
      location: "Patio de la Filmoteca",
    },
  },

  /* ─────────────────────────── CHALLENGE ─────────────────────────── */

  "ch-ask-someone-out": {
    en: {
      title: "Ask out the person you keep thinking about",
      description: "One message. Not a perfect one — just a sent one.",
    },
    es: {
      title: "Invitar a salir a quien no te quitas de la cabeza",
      description: "Un mensaje. No perfecto, solo enviado.",
    },
  },
  "ch-call-after-year": {
    en: {
      title: "Call someone you haven't spoken to in a year",
      description: "No reason, and no explaining the silence.",
    },
    es: {
      title: "Llamar a alguien con quien no hablas desde hace un año",
      description: "Sin motivo y sin explicar el silencio.",
    },
  },
  "ch-say-the-thing": {
    en: {
      title: "Say out loud the thing you keep postponing",
      description: "To that one person. Short is fine, awkward is fine.",
    },
    es: {
      title: "Decir en voz alta eso que llevas aplazando",
      description: "A esa persona. Puede ser breve, puede ser torpe.",
    },
  },
  "ch-apologize-first": {
    en: {
      title: "Be the one who apologises first",
      description: "With no “but” in the second half of the sentence.",
    },
    es: {
      title: "Pedir perdón primero",
      description: "Sin un «pero» en la segunda mitad de la frase.",
    },
  },
  "ch-thank-a-parent": {
    en: {
      title: "Tell a parent what you're grateful to them for",
      description: "Something specific: not “for everything”, but one time you remember.",
    },
    es: {
      title: "Decirle a tu padre o a tu madre qué le agradeces",
      description: "Algo concreto: no «por todo», sino una vez que recuerdas.",
    },
  },
  "ch-talk-to-stranger": {
    en: {
      title: "Speak first to someone you don't know",
      description: "In a queue, in a lift, at the next table. One sentence counts.",
    },
    es: {
      title: "Hablar primero con un desconocido",
      description: "En la cola, en el ascensor, en la mesa de al lado. Una frase cuenta.",
    },
  },
  "ch-ask-for-help": {
    en: {
      title: "Ask for help",
      description: "With the thing you've been carrying alone because asking feels awkward.",
    },
    es: {
      title: "Pedir ayuda",
      description: "Con eso que arrastras solo porque te incomoda pedirlo.",
    },
  },
  "ch-say-no": {
    en: {
      title: "Say no to something you always say yes to",
      description: "Once, without a long justification.",
    },
    es: {
      title: "Decir que no a algo a lo que siempre dices que sí",
      description: "Una vez, sin justificarte largamente.",
    },
  },
  "ch-dinner-alone": {
    en: {
      title: "Have dinner alone at a restaurant",
      description: "No phone on the table. The first ten minutes are the strangest.",
    },
    es: {
      title: "Cenar solo en un restaurante",
      description: "Sin el móvil en la mesa. Los primeros diez minutos son los más raros.",
    },
  },
  "ch-sing-in-public": {
    en: {
      title: "Sing in front of people",
      description: "Karaoke, a courtyard, a room of friends. Singing well is not required.",
    },
    es: {
      title: "Cantar delante de gente",
      description: "Karaoke, un patio, unos amigos. No hace falta cantar bien.",
    },
  },
  "ch-cold-water": {
    en: {
      title: "Step into cold water",
      description: "A river, the sea, the shower. Three minutes, breathing slowly.",
    },
    es: {
      title: "Meterte en agua fría",
      description: "Un río, el mar, la ducha. Tres minutos, respirando despacio.",
    },
  },
  "ch-childhood-fear": {
    en: {
      title: "Do the thing you've been afraid of since childhood",
      description: "Heights, water, the dark, a stage — you know which one.",
    },
    es: {
      title: "Hacer eso que temes desde la infancia",
      description: "Las alturas, el agua, la oscuridad, el escenario: ya sabes cuál.",
    },
  },
  "ch-speak-in-front": {
    en: {
      title: "Speak in front of people",
      description: "A toast, a talk, an open mic. Five minutes is enough.",
    },
    es: {
      title: "Hablar delante de gente",
      description: "Un brindis, una charla, un micro abierto. Con cinco minutos basta.",
    },
  },
  "ch-solo-overnight": {
    en: {
      title: "Spend a night outdoors alone",
      description: "One night, a tent, no signal. The silence is louder than you expect.",
    },
    es: {
      title: "Pasar una noche solo en la naturaleza",
      description:
        "Una noche, una tienda, sin cobertura. El silencio suena más fuerte de lo que esperas.",
    },
  },
  "ch-unknown-town": {
    en: {
      title: "Go to a town you know nothing about",
      description: "A ticket for the next bus, no plan and not one article read beforehand.",
    },
    es: {
      title: "Irte a un pueblo del que no sabes nada",
      description: "Billete para el próximo autobús, sin plan y sin leer nada antes.",
    },
  },
  "ch-day-without-phone": {
    en: {
      title: "Get through a day without your phone",
      description: "Morning to night. Tell the people close to you first, so no one worries.",
    },
    es: {
      title: "Pasar un día sin móvil",
      description: "De la mañana a la noche. Avisa antes a los tuyos para que no te busquen.",
    },
  },
  "ch-hitchhike": {
    en: {
      title: "Hitchhike part of the way",
      description: "One leg is enough. In daylight, on a road with somewhere to pull over.",
    },
    es: {
      title: "Hacer autostop en parte del camino",
      description: "Basta un tramo. De día, en una carretera con sitio para parar.",
    },
  },
  "ch-learn-and-show": {
    en: {
      title: "Learn something in a week and show it",
      description: "One song, one trick, one dish. Show it to an actual person.",
    },
    es: {
      title: "Aprender algo en una semana y enseñarlo",
      description: "Una canción, un truco, un plato. Enseñárselo a alguien en persona.",
    },
  },
  "ch-cook-for-parent": {
    en: {
      title: "Cook dinner for whoever used to feed you",
      description: "A parent, a grandmother, an older friend. You cook, they sit.",
    },
    es: {
      title: "Cocinar una cena para quien te daba de comer",
      description: "Tu madre, tu abuela, un amigo mayor. Tú cocinas, ellos se sientan.",
    },
  },
  "ch-blind-date": {
    en: {
      title: "Go on a blind date",
      description: "Let a friend choose for you. Coffee, an hour, no obligations.",
    },
    es: {
      title: "Ir a una cita a ciegas",
      description: "Que la elija un amigo por ti. Un café, una hora, sin compromiso.",
    },
  },
  "ch-fifty-km": {
    en: {
      title: "Ride fifty kilometres on a bike",
      description: "In one day, with stops. Take water and a pump.",
    },
    es: {
      title: "Recorrer cincuenta kilómetros en bici",
      description: "En un día, con paradas. Lleva agua y bomba.",
    },
  },
  "ch-walk-till-dark": {
    en: {
      title: "Walk until it gets dark",
      description: "Pick a direction and don't turn off towards a bus stop.",
    },
    es: {
      title: "Caminar hasta que anochezca",
      description: "Elige una dirección y no te desvíes hacia el transporte.",
    },
  },
  "ch-dawn-alone": {
    en: {
      title: "Get up before dawn and meet it",
      description: "A roof, a hill, a window. Alone, with no music in your ears.",
    },
    es: {
      title: "Levantarte antes del alba y recibirla",
      description: "Una azotea, una colina, una ventana. Solo, sin música en los oídos.",
    },
  },
  "ch-paraglide": {
    en: {
      title: "Fly a paraglider with an instructor",
      description: "Tandem, and it depends on the wind. Leave room in the plan for weather.",
    },
    es: {
      title: "Volar en parapente con un instructor",
      description: "En tándem y sujeto al viento. Deja margen en el plan por el tiempo.",
    },
  },
  "ch-dance-sober": {
    en: {
      title: "Dance sober",
      description: "At a party, at home, anywhere — just not after a drink for courage.",
    },
    es: {
      title: "Bailar sobrio",
      description: "En una fiesta, en casa, donde sea, pero sin beber para envalentonarte.",
    },
  },
  "ch-give-to-stranger": {
    en: {
      title: "Help a stranger and leave without giving your name",
      description: "Then tell no one about it for a week.",
    },
    es: {
      title: "Ayudar a un desconocido y marcharte sin decir tu nombre",
      description: "Y no contárselo a nadie durante una semana.",
    },
  },
  "ch-teach-someone": {
    en: {
      title: "Teach someone something you know how to do",
      description: "One evening, one person. The thing that seems obvious to you.",
    },
    es: {
      title: "Enseñar a alguien algo que sabes hacer",
      description: "Una tarde, una persona. Eso que a ti te parece obvio.",
    },
  },
  "ch-pay-it-forward": {
    en: {
      title: "Pay for the coffee of the next person in line",
      description: "And don't turn round to watch the reaction.",
    },
    es: {
      title: "Pagar el café al siguiente de la fila",
      description: "Y no girarte a ver la reacción.",
    },
  },
  "ch-clean-favorite-place": {
    en: {
      title: "Pick up the litter in a place you love",
      description: "A bag, gloves, an hour. A riverbank, a park, a courtyard.",
    },
    es: {
      title: "Recoger la basura de un lugar que quieres",
      description: "Una bolsa, guantes, una hora. Una orilla, un parque, un patio.",
    },
  },
  "ch-confess-feelings": {
    en: {
      title: "Say how you feel",
      description: "Without counting on an answer. The point is saying it, not hearing it back.",
    },
    es: {
      title: "Confesar lo que sientes",
      description: "Sin contar con una respuesta. Lo importante es decirlo, no oírlo.",
    },
  },
  "ch-first-time-solo-trip": {
    en: {
      title: "Go away for a weekend on your own",
      description: "Two nights, no company, the route invented as you go.",
    },
    es: {
      title: "Irte un fin de semana solo",
      description: "Dos noches, sin compañía, la ruta te la inventas sobre la marcha.",
    },
  },
  "ch-draw-a-person": {
    en: {
      title: "Draw a person from life",
      description: "Ask someone to sit for twenty minutes. It doesn't have to look like them.",
    },
    es: {
      title: "Dibujar a una persona del natural",
      description: "Pídele a alguien que pose veinte minutos. No hace falta que se parezca.",
    },
  },

  /* ──────────────────────────── RITUAL ───────────────────────────── */

  "ri-postponed-film": {
    en: {
      title: "Watch the film you've put off for years",
      description: "That one, from the list. All of it, no phone and no pausing.",
    },
    es: {
      title: "Ver la película que llevas años aplazando",
      description: "Esa, la de la lista. Entera, sin móvil y sin pausas.",
    },
  },
  "ri-book-in-one-evening": {
    en: {
      title: "Read a book in one evening",
      description: "A short one, under two hundred pages. First page to last.",
    },
    es: {
      title: "Leer un libro en una tarde",
      description: "Uno corto, de menos de doscientas páginas. De la primera página a la última.",
    },
  },
  "ri-album-whole": {
    en: {
      title: "Listen to an album all the way through",
      description: "Start to finish, headphones on, doing nothing else alongside it.",
    },
    es: {
      title: "Escuchar un álbum entero",
      description: "De principio a fin, con auriculares, sin hacer nada más a la vez.",
    },
  },
  "ri-childhood-film": {
    en: {
      title: "Rewatch a film from your childhood",
      description: "The one you knew by heart. Half of it you remembered wrong.",
    },
    es: {
      title: "Volver a ver una película de tu infancia",
      description: "Esa que te sabías de memoria. La mitad la recordabas mal.",
    },
  },
  "ri-letter-to-future-self": {
    en: {
      title: "Write a letter to yourself a year from now",
      description: "By hand, sealed, put somewhere you won't find it soon.",
    },
    es: {
      title: "Escribirte una carta para dentro de un año",
      description: "A mano, cerrada, guardada donde no la encuentres pronto.",
    },
  },
  "ri-grandmother-recipe": {
    en: {
      title: "Cook a dish from a family recipe",
      description: "Call and write it down while there's still someone to ask.",
    },
    es: {
      title: "Cocinar un plato de receta familiar",
      description: "Llama y apúntala mientras todavía haya a quién preguntar.",
    },
  },
  "ri-old-photos": {
    en: {
      title: "Go through old photographs",
      description: "A box, a folder on a drive, an old phone. Out loud with someone is better.",
    },
    es: {
      title: "Revisar fotos antiguas",
      description:
        "Una caja, una carpeta en el disco, un móvil viejo. Mejor en voz alta con alguien.",
    },
  },
  "ri-call-grandparent": {
    en: {
      title: "Call your grandmother and just listen",
      description: "Don't report on how things are going. Ask about when she was young.",
    },
    es: {
      title: "Llamar a tu abuela y solo escuchar",
      description: "No le cuentes cómo te va. Pregúntale por su juventud.",
    },
  },
  "ri-candlelight-evening": {
    en: {
      title: "Spend an evening by candlelight",
      description: "Lights off, screens too. The three hours before sleep.",
    },
    es: {
      title: "Pasar una noche a la luz de las velas",
      description: "Luces apagadas, pantallas también. Las tres horas antes de dormir.",
    },
  },
  "ri-sleep-without-alarm": {
    en: {
      title: "Sleep with no alarm",
      description: "One day with nowhere to be. Arrange it in advance.",
    },
    es: {
      title: "Dormir sin despertador",
      description: "Un día sin nada a lo que ir. Organízalo con antelación.",
    },
  },
  "ri-bath-no-phone": {
    en: {
      title: "An hour in the bath without your phone",
      description: "Hot water, a book or silence. The phone stays in another room.",
    },
    es: {
      title: "Una hora en la bañera sin móvil",
      description: "Agua caliente, un libro o silencio. El móvil, en otra habitación.",
    },
  },
  "ri-morning-pages": {
    en: {
      title: "Three handwritten pages in the morning",
      description: "Whatever is in your head, unedited and with no aim. No one will read it.",
    },
    es: {
      title: "Tres páginas a mano por la mañana",
      description: "Todo lo que tengas en la cabeza, sin corregir y sin objetivo. Nadie las leerá.",
    },
  },
  "ri-playlist-seventeen": {
    en: {
      title: "Make a playlist of the songs you were seventeen to",
      description: "Twenty tracks. Listen in the evening, the whole thing.",
    },
    es: {
      title: "Hacer una lista con las canciones de tus diecisiete",
      description: "Veinte temas. Escúchala de noche, entera.",
    },
  },
  "ri-list-of-done": {
    en: {
      title: "Write a list of what has already come true",
      description: "Things you once badly wanted and have long since taken for granted.",
    },
    es: {
      title: "Escribir una lista de lo que ya se cumplió",
      description: "Cosas que un día deseaste mucho y que hace tiempo das por normales.",
    },
  },
  "ri-breakfast-in-silence": {
    en: {
      title: "Have breakfast in silence by the window",
      description: "No feed, no music, no conversation. Twenty minutes.",
    },
    es: {
      title: "Desayunar en silencio junto a la ventana",
      description: "Sin redes, sin música, sin conversación. Veinte minutos.",
    },
  },
  "ri-breakfast-for-someone": {
    en: {
      title: "Make breakfast for whoever you live with",
      description: "Get up earlier. Say nothing about it beforehand.",
    },
    es: {
      title: "Preparar el desayuno a quien vive contigo",
      description: "Levántate antes. No lo anuncies.",
    },
  },
  "ri-declutter-and-give": {
    en: {
      title: "Clear out the wardrobe and give away what you don't wear",
      description: "One bag. Take it the same day, before you change your mind.",
    },
    es: {
      title: "Vaciar el armario y dar lo que no te pones",
      description: "Una bolsa. Llévala el mismo día, antes de arrepentirte.",
    },
  },
  "ri-old-neighbourhood": {
    en: {
      title: "Go back to the yard you grew up in",
      description: "That one. Stand there a while, photographing nothing.",
    },
    es: {
      title: "Volver al patio donde creciste",
      description: "Ese. Quédate un rato sin fotografiar nada.",
    },
  },
  "ri-board-game-evening": {
    en: {
      title: "An evening over a board game",
      description: "Two people or more, phones in another room.",
    },
    es: {
      title: "Una noche de juego de mesa",
      description: "Dos o más, los móviles en otra habitación.",
    },
  },
  "ri-map-of-good-places": {
    en: {
      title: "Map the places where you felt good",
      description: "By hand or in notes. One line next to each saying why.",
    },
    es: {
      title: "Hacer un mapa de los lugares donde estuviste bien",
      description: "A mano o en notas. Una línea junto a cada uno diciendo por qué.",
    },
  },
  "ri-long-bath-of-a-walk": {
    en: {
      title: "Walk for an hour with no route",
      description: "Leave the house and turn wherever you haven't been. No headphones.",
    },
    es: {
      title: "Pasear una hora sin ruta",
      description: "Sal de casa y gira hacia donde no hayas estado. Sin auriculares.",
    },
  },
  "ri-plant-something": {
    en: {
      title: "Plant something",
      description: "A tree in the yard or herbs on the windowsill. Water it afterwards.",
    },
    es: {
      title: "Plantar algo",
      description: "Un árbol en el patio o hierbas en la ventana. Y luego regarlo.",
    },
  },
  "ri-stretch-before-sleep": {
    en: {
      title: "Twenty minutes of stretching before bed",
      description: "On the floor, slowly. Your body remembers you haven't met in a while.",
    },
    es: {
      title: "Veinte minutos de estiramientos antes de dormir",
      description: "En el suelo, despacio. Tu cuerpo recuerda que hace tiempo que no os veis.",
    },
  },
  "ri-cook-something-new": {
    en: {
      title: "Cook a dish you have never made",
      description: "From a country you haven't been to. Buy one spice you don't know.",
    },
    es: {
      title: "Cocinar un plato que nunca has hecho",
      description: "De un país en el que no has estado. Compra una especia que no conozcas.",
    },
  },
  "ri-voice-note-to-self": {
    en: {
      title: "Record a voice note to yourself",
      description: "What matters now and what you're afraid of. Listen to it in six months.",
    },
    es: {
      title: "Grabarte una nota de voz a ti mismo",
      description: "Qué te importa ahora y qué te da miedo. Escúchalo dentro de medio año.",
    },
  },
  "ri-museum-one-room": {
    en: {
      title: "Go to a museum for one room",
      description: "Don't walk the whole thing. Sit in front of one object for twenty minutes.",
    },
    es: {
      title: "Ir a un museo por una sola sala",
      description: "No lo recorras entero. Siéntate ante una sola pieza veinte minutos.",
    },
  },
};
