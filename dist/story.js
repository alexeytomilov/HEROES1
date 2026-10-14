// The journey script: every screen, its text and where it leads.
// type: story — screen with a picture and text (hold = display time, ms); question — Yes/No (next / no);
// game — a level (game = which level); victory — reward screen; epilogue — the final screen.
// Special targets: hero — character creation, map — the map, title — intro 1.
window.PENINSULA_STORY = {
  "chapterQuestions": [
    "ПРОДОЛЖИТЬ ПУТЬ?",
    "ПРОЕХАТЬ ПО МОСТУ?",
    "ШАМПАНСКОГО?",
    "ЧТО-НИБУДЬ ВИДНО?",
    "ПОЕХАТЬ ДОМОЙ?"
  ],
  "nodes": {
    "intro2": {
      "type": "story",
      "image": "intro2",
      "body": "Древний зов заставляет\nгероев отправиться навстречу\nнеизвестному",
      "next": "intro3",
      "hold": 7000
    },
    "intro3": {
      "type": "story",
      "image": "intro3",
      "body": "Древний зов заставляет\nгероев отправиться навстречу\nнеизвестному",
      "next": "intro4",
      "hold": 7000
    },
    "intro4": {
      "type": "story",
      "image": "intro4",
      "body": "Помоги странникам найти путь",
      "next": "intro5",
      "hold": 6000
    },
    "intro5": {
      "type": "story",
      "image": "party",
      "body": "",
      "next": "map",
      "hold": 4000
    },
    "1.1": {
      "type": "story",
      "image": "coast",
      "body": "Вы на полуострове.\nВнимательно следуйте за проводником. Доберитесь до безопасного для ночлега места.",
      "next": "drive1",
      "hold": 8500
    },
    "drive1": {
      "type": "game",
      "game": "sredny",
      "next": "1.2"
    },
    "1.2": {
      "type": "story",
      "image": "shore_north",
      "body": "Нужно найти место для лагеря.",
      "next": "camp1",
      "hold": 5000
    },
    "camp1": {
      "type": "game",
      "game": "coast",
      "next": "1.3"
    },
    "1.3": {
      "type": "story",
      "image": "camp_good",
      "body": "Герои установили лагерь и могут поужинать.",
      "next": "sleep",
      "hold": 6500
    },
    "sleep": {
      "type": "question",
      "image": "camp_good",
      "body": "Спать?",
      "next": "1.4",
      "no": "map"
    },
    "1.4": {
      "type": "story",
      "image": "shore_west",
      "body": "Трудно уснуть в полярную ночь.\nДухи полуострова говорят с вами.",
      "next": "win1",
      "hold": 7000
    },
    "win1": {
      "type": "victory",
      "image": "reward_fish",
      "body": "Вы нашли рыбные какашечки.\n+10 к ловкости каждого персонажа.",
      "reward": "ЛОВКОСТЬ",
      "item": "РЫБНЫЕ КАКАШЕЧКИ",
      "chapter": 0,
      "next": "map"
    },
    "2.1": {
      "type": "story",
      "image": "bear_floor",
      "body": "В этих местах обитают медведи. Найди средства обезопасить себя и товарищей.",
      "next": "bear2",
      "hold": 7500
    },
    "bear2": {
      "type": "game",
      "game": "bear",
      "next": "2.2"
    },
    "2.2": {
      "type": "story",
      "image": "camp_inland",
      "body": "Зверя больше не слышно.\n+10 к спокойствию каждого персонажа.",
      "reward": "СПОКОЙСТВИЕ",
      "next": "2.3",
      "hold": 6500
    },
    "2.3": {
      "type": "story",
      "image": "coast",
      "body": "Вы посмотрели на старые фотографии этих мест.",
      "next": "ruin",
      "hold": 6500
    },
    "ruin": {
      "type": "question",
      "image": "walk_wall",
      "body": "Зайти в руину?",
      "next": "house2",
      "no": "map"
    },
    "house2": {
      "type": "game",
      "game": "house",
      "next": "win2"
    },
    "win2": {
      "type": "victory",
      "image": "reward_niva",
      "body": "Вы нашли старую ниву.\n+10 к скорости каждого персонажа.",
      "reward": "СКОРОСТЬ",
      "item": "СТАРАЯ НИВА",
      "chapter": 1,
      "next": "map"
    },
    "3.1": {
      "type": "story",
      "image": "shore_north",
      "body": "Вам обязательно нужно найти особенный местный сувенир.",
      "next": "village3",
      "hold": 6500
    },
    "village3": {
      "type": "game",
      "game": "village",
      "next": "3.2"
    },
    "3.2": {
      "type": "story",
      "image": "shop_scene",
      "body": "Вы нашли лавку таинственного торговца.",
      "next": "shop3",
      "hold": 6500
    },
    "shop3": {
      "type": "game",
      "game": "shop",
      "next": "win3"
    },
    "win3": {
      "type": "victory",
      "image": "shop_leviathan",
      "body": "Вы купили сахарного левиафана.\n+10 к насмотренности.",
      "reward": "НАСМОТРЕННОСТЬ",
      "item": "САХАРНЫЙ ЛЕВИАФАН",
      "chapter": 2,
      "next": "map"
    },
    "4.1": {
      "type": "story",
      "image": "coast",
      "body": "Вы посмотрели фотографии этих мест из гугла.",
      "next": "fog4",
      "hold": 6500
    },
    "fog4": {
      "type": "game",
      "game": "fog",
      "next": "4.2"
    },
    "4.2": {
      "type": "story",
      "image": "wanderer",
      "body": "Вы встретили странника.",
      "next": "exchange4",
      "hold": 6500
    },
    "exchange4": {
      "type": "game",
      "game": "exchange",
      "next": "win4"
    },
    "win4": {
      "type": "victory",
      "image": "reward_room",
      "body": "Особая ловкость просыпается в теле, когда делишь тесную келью с товарищем.\n+10 к ловкости двух персонажей.",
      "reward": "ЛОВКОСТЬ ДВУХ",
      "chapter": 3,
      "next": "map"
    },
    "5.1": {
      "type": "story",
      "image": "platform_bg1",
      "body": "Вам скоро возвращаться домой.\nПогуляйте в последний раз.",
      "next": "platform5",
      "hold": 7500
    },
    "platform5": {
      "type": "game",
      "game": "platform",
      "next": "5.2"
    },
    "5.2": {
      "type": "story",
      "image": "platform_bg4",
      "body": "Вы собрали множество материалов, должны получиться классные рилзы.",
      "next": "home",
      "hold": 7500
    },
    "home": {
      "type": "question",
      "image": "intro3",
      "body": "Поехать домой?",
      "next": "traffic5",
      "no": "map"
    },
    "traffic5": {
      "type": "game",
      "game": "home",
      "next": "win5"
    },
    "win5": {
      "type": "victory",
      "image": "reward_map",
      "body": "Вы составили свою карту острова.\n+10 к опыту каждого персонажа.",
      "reward": "ОПЫТ",
      "chapter": 4,
      "next": "epilogue"
    },
    "epilogue": {
      "type": "epilogue",
      "image": "reward_map",
      "body": "Вы составили свою карту острова.\n\nГЕРОИ ПОЛУОСТРОВА",
      "next": "title"
    }
  }
};
