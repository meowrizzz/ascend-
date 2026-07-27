/* =========================================================
   Ascend — i18n
   Flat key dictionaries + t(key, vars). Language switches at
   runtime (no reload). User-facing strings live here, not in
   components. Add languages by extending DICT.
   ========================================================= */
'use strict';

const LANGS = [
  { id: 'ru', label: 'Русский', flag: '🇷🇺' },
  { id: 'en', label: 'English', flag: '🇬🇧' },
];

const DICT = {
  ru: {
    'app.tagline': 'Строю новую версию себя',

    // Nav
    'nav.home': 'Главная', 'nav.habits': 'Привычки', 'nav.stats': 'Статистика',
    'nav.achievements': 'Награды', 'nav.profile': 'Профиль',
    'crisis.fab': 'Мне хочется сорваться',

    // Common
    'common.cancel': 'Отмена', 'common.save': 'Сохранить', 'common.close': 'Закрыть',
    'common.delete': 'Удалить', 'common.continue': 'Продолжить', 'common.back': 'Назад',
    'common.next': 'Далее', 'common.done': 'Готово', 'common.skip': 'Пропустить',
    'common.add': 'Добавить', 'common.edit': 'Редактировать', 'common.noData': 'Данных пока нет',
    'common.soon': 'Скоро',

    // Onboarding
    'ob.w.title': 'Добро пожаловать в Ascend', 'ob.w.desc': 'Создай личную систему привычек, развития и контроля прогресса.',
    'ob.w.start': 'Начать', 'ob.w.skip': 'Пропустить знакомство',
    'ob.goals.title': 'Что ты хочешь изменить?', 'ob.goals.desc': 'Выбери одно или несколько направлений. Это можно поменять позже.',
    'ob.habits.title': 'Выбери привычки', 'ob.habits.desc': 'Ничего не добавляется без твоего подтверждения. Отметь то, что подходит.',
    'ob.habits.none': 'Можно пропустить и добавить привычки позже.',
    'ob.person.title': 'Персонализация', 'ob.person.desc': 'Всё по желанию — имя указывать не обязательно.',
    'ob.priv.title': 'Конфиденциальность', 'ob.priv.desc': 'Выбери, где хранить данные.',
    'ob.priv.local': 'Локальный режим', 'ob.priv.localDesc': 'Данные остаются только в этом браузере. Регистрация не нужна, синхронизации между устройствами нет.',
    'ob.priv.cloud': 'Облачный режим', 'ob.priv.cloudDesc': 'Аккаунт и синхронизация между устройствами. Появится в следующем обновлении.',
    'ob.done.title': 'Всё готово', 'ob.done.desc': 'Твоя система собрана. Прогресс важнее идеальности.',
    'ob.done.goals': 'Направления', 'ob.done.habits': 'Привычки', 'ob.done.firstGoal': 'Первая маленькая цель',
    'ob.done.firstGoalText': 'Отметить одно действие сегодня', 'ob.done.enter': 'Войти в Ascend',
    'ob.step': 'Шаг {n} из {total}',

    // Settings / profile fields
    'set.displayName': 'Отображаемое имя', 'set.displayNameHint': 'Необязательно',
    'set.motto': 'Девиз', 'set.language': 'Язык', 'set.theme': 'Тема', 'set.animations': 'Анимации',
    'set.firstDay': 'Первый день недели', 'set.timeFormat': 'Формат времени', 'set.missions': 'Ежедневные миссии',
    'set.notifications': 'Уведомления', 'set.privacyScreen': 'Скрывать чувствительные данные при открытии',
    'set.privacyScreenHint': 'Сначала показывать нейтральный экран, приватные элементы открываешь сам.',
    'anim.full': 'Полные', 'anim.reduced': 'Умеренные', 'anim.off': 'Выключены',
    'day.mon': 'Понедельник', 'day.sun': 'Воскресенье', 'tf.24': '24 часа', 'tf.12': '12 часов',
    'set.title': 'Настройки', 'set.section.profile': 'Профиль', 'set.section.prefs': 'Предпочтения',
    'set.section.privacy': 'Приватность', 'set.editProfile': 'Имя и девиз',

    // Home
    'home.buildingBetter': 'Строю новую версию себя',
    'home.myStats': 'Мои показатели', 'home.allHabits': 'Все привычки',
    'home.journalTitle': 'Дневник дня', 'home.journalDone': 'Дневник заполнен',
    'home.journalSub': 'Отметь настроение, сон и мысли', 'home.journalDoneSub': 'Отличная осознанность сегодня',
    'home.open': 'Открыть', 'home.change': 'Изменить',
    'empty.startTitle': 'Начни свой путь', 'empty.startSub': 'Здесь появятся твои показатели. Добавь первую привычку из каталога или создай свою.',
    'empty.addHabit': '＋ Добавить привычку', 'reveal.private': 'Показать приватные',

    // Level / stats
    'level.to': 'до Level {n}', 'stat.discipline': 'Дисциплина', 'stat.strength': 'Сила',
    'stat.knowledge': 'Интеллект', 'stat.resilience': 'Устойчивость',

    // Habits
    'habits.title': 'Привычки', 'habits.add': '＋ Добавить', 'habits.good': '💪 Полезные',
    'habits.limit': '🛡 Ограничить', 'habits.archive': '🗄 Архив',
    'habits.emptyGoodT': 'Пока нет полезных привычек', 'habits.emptyGoodS': 'Добавь первую полезную привычку и начни прокачку.',
    'habits.emptyLimitT': 'Нет привычек для ограничения', 'habits.emptyLimitS': 'Добавь то, что хочешь контролировать — из каталога или своё.',
    'habits.emptyArchT': 'Архив пуст', 'habits.emptyArchS': 'Архивированные привычки сохраняют историю и появятся здесь.',
    'habits.fromCatalog': '＋ Из каталога', 'habits.restore': 'Вернуть', 'habits.relapse': 'Срыв',
    'habits.private': 'Приватная', 'habits.streak': 'серия', 'habits.record': 'рекорд', 'habits.goal': 'цель',
    'habits.limitWord': 'лимит', 'habits.today': 'сегодня', 'habits.inArchive': '🗄 в архиве',

    // Catalog / form
    'cat.title': 'Добавить привычку', 'cat.good': '💪 Полезные', 'cat.limit': '🛡 Ограничить',
    'cat.custom': '✨ Своя', 'cat.search': 'Поиск привычки...', 'cat.nothing': 'Ничего не найдено',
    'cat.customHint': 'Создай привычку с нуля: имя, тип, иконку, цвет, цель и режим отслеживания.',
    'cat.startCustom': '✨ Создать свою привычку',
    'form.setup': 'Настройка привычки', 'form.name': 'Название', 'form.namePh': 'Например: Отжимания',
    'form.type': 'Тип', 'form.typeGood': '💪 Полезная', 'form.typeLimit': '🛡 Ограничить',
    'form.mode': 'Режим отслеживания', 'form.icon': 'Иконка', 'form.color': 'Цвет',
    'form.goal': 'Цель', 'form.goalDays': 'Цель (дней)', 'form.dailyLimit': 'Дневной лимит',
    'form.unit': 'Единица', 'form.stat': 'Прокачивает характеристику', 'form.statNone': '— нет',
    'form.start': 'Дата начала', 'form.private': 'Приватная привычка',
    'form.privateHint': 'Скрыть настоящее название за нейтральным на главном экране.',
    'form.alias': 'Нейтральное название', 'form.aliasPh': 'Личная цель',
    'form.addBtn': 'Добавить привычку', 'form.saveBtn': 'Сохранить', 'form.needName': 'Введи название привычки',
    'mode.done': '✅ Выполнение', 'mode.count': '🔢 Количество', 'mode.duration': '⏱ Время', 'mode.abstinence': '🛡 Воздержание',
    'mode.done.hint': 'Отметка «выполнено» раз в день', 'mode.count.hint': 'Число за день (повторы, страницы, стаканы)',
    'mode.duration.hint': 'Минуты за день (учёба, чтение, экран)', 'mode.abstinence.hint': 'Дни без. Растущая серия чистых дней',

    // Menu
    'menu.edit': 'Редактировать', 'menu.archive': 'Архивировать', 'menu.unarchive': 'Вернуть из архива',
    'menu.delete': 'Удалить', 'menu.makePrivate': 'Сделать приватной', 'menu.makePublic': 'Убрать приватность',
    'del.title': 'Удалить привычку?', 'del.body': 'Удалить привычку «{name}»? Связанная с ней история и статистика будут удалены.',
    'del.toast': 'Привычка удалена',

    // Relapse (compassionate)
    'rel.title': 'Отметить срыв?', 'rel.body': 'Один сложный день не отменяет весь прогресс. Отметь причину и выбери следующий шаг — рекорд сохранится.',
    'rel.trigger': 'Что стало триггером? (необязательно)', 'rel.do': 'Отметить срыв',
    'rel.toastT': 'Продолжи с текущей точки', 'rel.toastS': 'Прогресс не потерян. Анализируй причину и продолжай путь.',

    // Stats
    'stats.title': 'Статистика', 'stats.emptyT': 'Здесь появится ваша статистика',
    'stats.emptyS': 'Добавь привычки и заполняй дневник — графики, серии и триггеры соберутся автоматически.',
    'stats.cleanDays': 'Дней чистоты', 'stats.cleanDaysSub': 'сумма серий воздержания',
    'stats.relapses': 'Срывов всего', 'stats.relapsesSub': 'и ты продолжаешь',
    'stats.workouts': 'Тренировок', 'stats.workoutsSub': 'тело крепнет',
    'stats.journalRec': 'Записей в дневнике', 'stats.journalRecSub': 'осознанность',
    'stats.moodEnergy': 'Настроение и энергия', 'stats.last14': 'Последние 14 дней',
    'stats.mood': 'Настроение', 'stats.energy': 'Энергия',
    'stats.progressDays': 'Дни прогресса', 'stats.progressSub': 'Текущая серия воздержания',
    'stats.triggers': 'Мои триггеры', 'stats.triggersSub': 'Что чаще всего мешает контролю',
    'stats.weekly': 'Недельный отчёт', 'stats.weeklySub': 'По имеющимся записям',

    // Achievements
    'ach.title': 'Достижения', 'ach.progress': 'Открыто {n} из {total} · собери коллекцию',
    'ach.unlocked': '✓ Открыто', 'ach.unlockedKicker': 'Достижение открыто',
    'ach.unlockedDesc': 'Ты становишься сильнее.',

    // Profile
    'profile.path': '🧭 Мой путь', 'profile.reasons': '💚 Почему я начал',
    'profile.reasonsSub': 'Твои причины — топливо в трудный момент', 'profile.addReason': 'Добавить причину...',
    'profile.reasonsEmpty': 'Пока пусто. Добавь первую причину.',
    'profile.fillJournal': 'Заполнить дневник', 'profile.jToday': 'Сегодня заполнен', 'profile.jNot': 'Ещё не заполнен',
    'profile.settings': 'Настройки', 'profile.plan': 'Тариф и Premium', 'profile.planSub': 'Текущий тариф: {plan}',
    'profile.dataMgmt': 'Управление данными',
    'data.export': 'Скачать резервную копию', 'data.exportSub': 'JSON-файл на устройство',
    'data.import': 'Восстановить из резервной копии', 'data.importSub': 'Загрузить ранее сохранённый файл',
    'data.reset': 'Сбросить весь прогресс', 'data.resetSub': 'Обнулить XP, серии, дневник — привычки остаются',
    'data.wipe': 'Удалить все данные', 'data.wipeSub': 'Полностью очистить приложение',
    'data.hint': 'Данные хранятся только в этом браузере. Делай резервные копии, чтобы не потерять прогресс.',
    'data.privacyExportWarn': 'Резервная копия содержит личные данные (в т.ч. приватные привычки и дневник). Храни файл в надёжном месте.',

    // Plans
    'plan.title': 'Тарифы', 'plan.sub': 'Бесплатная версия остаётся полезной. Premium — по желанию.',
    'plan.free.name': 'Бесплатный', 'plan.premium.name': 'Premium', 'plan.lifetime.name': 'Навсегда',
    'plan.current': 'Текущий тариф', 'plan.choose': 'Выбрать Premium', 'plan.month': 'мес', 'plan.year': 'год',
    'plan.paymentsSoon': 'Оплата появится позже. Сейчас доступно всё, что не требует сервера.',
    'plan.f.habits8': 'До 8 активных привычек', 'plan.f.streaks': 'Серии и прогресс',
    'plan.f.journal': 'Дневник состояния', 'plan.f.basicStats': 'Базовая статистика',
    'plan.f.achievements': 'Достижения и уровни', 'plan.f.levels': 'Система уровней',
    'plan.f.guest': 'Гостевой режим', 'plan.f.export': 'Экспорт данных',
    'plan.f.crisis': 'Кризисный режим', 'plan.f.weeklyBasic': 'Базовый недельный отчёт',
    'plan.f.achievements2': 'Достижения',
    'plan.p.unlimited': 'Без лимита на привычки', 'plan.p.analytics': 'Расширенная аналитика',
    'plan.p.sync': 'Синхронизация устройств', 'plan.p.history': 'Полная история',
    'plan.p.themes': 'Дополнительные темы', 'plan.p.reports': 'Расширенные отчёты',
    'plan.p.missions': 'Свои наборы миссий', 'plan.p.achievements': 'Больше достижений',
    'plan.p.ai': 'AI-инсайты (по желанию)', 'plan.p.backup': 'Автоматические копии',
    'plan.limitReached': 'Достигнут лимит бесплатного тарифа', 'plan.limitBody': 'На бесплатном тарифе доступно до {n} активных привычек. Заархивируй ненужные или перейди на Premium.',
    'plan.viewPlans': 'Посмотреть Premium',

    // Missions
    'mission.title': 'Сегодняшние миссии', 'mission.sub': 'Небольшие шаги на день',
    'mission.done': 'Выполнено', 'mission.empty': 'На сегодня миссий нет. Добавь привычку с расписанием на сегодня.',
    'mission.off': 'Миссии выключены в настройках.',

    // Toasts
    'toast.saved': 'Сохранено локально', 'toast.habitAdded': 'Новая привычка добавлена',
    'toast.habitUpdated': 'Привычка обновлена', 'toast.archived': 'В архиве', 'toast.restored': 'Восстановлено',
    'toast.reset': 'Прогресс сброшен', 'toast.wiped': 'Все данные удалены', 'toast.exported': 'Резервная копия скачана',
    'toast.imported': 'Резервная копия восстановлена', 'toast.langChanged': 'Язык изменён',

    // Crisis
    'crisis.title': 'Стоп. Ты сильнее этого.', 'crisis.sub': 'Желание — это волна. Оно нарастает и уходит.',
    'crisis.why': 'Почему я начал', 'crisis.win': '💚 Я справился', 'crisis.timerLbl': 'Дыши глубоко. Волна отступает.',
    'crisis.wonT': 'Ты справился', 'crisis.wonS': 'Сила воли +1. Гордись собой.',
  },

  en: {
    'app.tagline': 'Building a better version of myself',

    'nav.home': 'Home', 'nav.habits': 'Habits', 'nav.stats': 'Stats',
    'nav.achievements': 'Awards', 'nav.profile': 'Profile',
    'crisis.fab': 'I feel the urge',

    'common.cancel': 'Cancel', 'common.save': 'Save', 'common.close': 'Close',
    'common.delete': 'Delete', 'common.continue': 'Continue', 'common.back': 'Back',
    'common.next': 'Next', 'common.done': 'Done', 'common.skip': 'Skip',
    'common.add': 'Add', 'common.edit': 'Edit', 'common.noData': 'No data yet', 'common.soon': 'Soon',

    'ob.w.title': 'Welcome to Ascend', 'ob.w.desc': 'Build your own system for habits, growth and progress.',
    'ob.w.start': 'Get started', 'ob.w.skip': 'Skip the intro',
    'ob.goals.title': 'What do you want to change?', 'ob.goals.desc': 'Pick one or more directions. You can change this later.',
    'ob.habits.title': 'Choose habits', 'ob.habits.desc': 'Nothing is added without your confirmation. Tick what fits.',
    'ob.habits.none': 'You can skip and add habits later.',
    'ob.person.title': 'Personalize', 'ob.person.desc': 'All optional — a name is not required.',
    'ob.priv.title': 'Privacy', 'ob.priv.desc': 'Choose where your data lives.',
    'ob.priv.local': 'Local mode', 'ob.priv.localDesc': 'Data stays in this browser only. No sign-up, no cross-device sync.',
    'ob.priv.cloud': 'Cloud mode', 'ob.priv.cloudDesc': 'Account and cross-device sync. Coming in a future update.',
    'ob.done.title': 'All set', 'ob.done.desc': 'Your system is ready. Progress over perfection.',
    'ob.done.goals': 'Directions', 'ob.done.habits': 'Habits', 'ob.done.firstGoal': 'First small goal',
    'ob.done.firstGoalText': 'Check one action today', 'ob.done.enter': 'Enter Ascend',
    'ob.step': 'Step {n} of {total}',

    'set.displayName': 'Display name', 'set.displayNameHint': 'Optional',
    'set.motto': 'Motto', 'set.language': 'Language', 'set.theme': 'Theme', 'set.animations': 'Animations',
    'set.firstDay': 'First day of week', 'set.timeFormat': 'Time format', 'set.missions': 'Daily missions',
    'set.notifications': 'Notifications', 'set.privacyScreen': 'Hide sensitive data on open',
    'set.privacyScreenHint': 'Show a neutral screen first; you open private items yourself.',
    'anim.full': 'Full', 'anim.reduced': 'Reduced', 'anim.off': 'Off',
    'day.mon': 'Monday', 'day.sun': 'Sunday', 'tf.24': '24-hour', 'tf.12': '12-hour',
    'set.title': 'Settings', 'set.section.profile': 'Profile', 'set.section.prefs': 'Preferences',
    'set.section.privacy': 'Privacy', 'set.editProfile': 'Name & motto',

    'home.buildingBetter': 'Building a better version of myself',
    'home.myStats': 'My metrics', 'home.allHabits': 'All habits',
    'home.journalTitle': 'Daily journal', 'home.journalDone': 'Journal completed',
    'home.journalSub': 'Log mood, sleep and thoughts', 'home.journalDoneSub': 'Great awareness today',
    'home.open': 'Open', 'home.change': 'Edit',
    'empty.startTitle': 'Start your journey', 'empty.startSub': 'Your metrics will appear here. Add your first habit from the catalog or create your own.',
    'empty.addHabit': '＋ Add habit', 'reveal.private': 'Show private',

    'level.to': 'to Level {n}', 'stat.discipline': 'Discipline', 'stat.strength': 'Strength',
    'stat.knowledge': 'Knowledge', 'stat.resilience': 'Resilience',

    'habits.title': 'Habits', 'habits.add': '＋ Add', 'habits.good': '💪 Positive',
    'habits.limit': '🛡 Limit', 'habits.archive': '🗄 Archive',
    'habits.emptyGoodT': 'No positive habits yet', 'habits.emptyGoodS': 'Add your first positive habit and start leveling up.',
    'habits.emptyLimitT': 'No habits to limit', 'habits.emptyLimitS': 'Add what you want to control — from the catalog or your own.',
    'habits.emptyArchT': 'Archive is empty', 'habits.emptyArchS': 'Archived habits keep their history and show up here.',
    'habits.fromCatalog': '＋ From catalog', 'habits.restore': 'Restore', 'habits.relapse': 'Slip',
    'habits.private': 'Private', 'habits.streak': 'streak', 'habits.record': 'best', 'habits.goal': 'goal',
    'habits.limitWord': 'limit', 'habits.today': 'today', 'habits.inArchive': '🗄 archived',

    'cat.title': 'Add habit', 'cat.good': '💪 Positive', 'cat.limit': '🛡 Limit',
    'cat.custom': '✨ Custom', 'cat.search': 'Search habits...', 'cat.nothing': 'Nothing found',
    'cat.customHint': 'Build a habit from scratch: name, type, icon, color, goal and tracking mode.',
    'cat.startCustom': '✨ Create custom habit',
    'form.setup': 'Habit setup', 'form.name': 'Name', 'form.namePh': 'e.g. Push-ups',
    'form.type': 'Type', 'form.typeGood': '💪 Positive', 'form.typeLimit': '🛡 Limit',
    'form.mode': 'Tracking mode', 'form.icon': 'Icon', 'form.color': 'Color',
    'form.goal': 'Goal', 'form.goalDays': 'Goal (days)', 'form.dailyLimit': 'Daily limit',
    'form.unit': 'Unit', 'form.stat': 'Boosts stat', 'form.statNone': '— none',
    'form.start': 'Start date', 'form.private': 'Private habit',
    'form.privateHint': 'Hide the real name behind a neutral one on the home screen.',
    'form.alias': 'Neutral name', 'form.aliasPh': 'Personal goal',
    'form.addBtn': 'Add habit', 'form.saveBtn': 'Save', 'form.needName': 'Enter a habit name',
    'mode.done': '✅ Check-in', 'mode.count': '🔢 Count', 'mode.duration': '⏱ Time', 'mode.abstinence': '🛡 Abstinence',
    'mode.done.hint': 'A once-a-day “done” check', 'mode.count.hint': 'A number per day (reps, pages, glasses)',
    'mode.duration.hint': 'Minutes per day (study, reading, screen)', 'mode.abstinence.hint': 'Days without. A growing clean streak',

    'menu.edit': 'Edit', 'menu.archive': 'Archive', 'menu.unarchive': 'Restore from archive',
    'menu.delete': 'Delete', 'menu.makePrivate': 'Make private', 'menu.makePublic': 'Remove privacy',
    'del.title': 'Delete habit?', 'del.body': 'Delete “{name}”? Its history and statistics will be removed.',
    'del.toast': 'Habit deleted',

    'rel.title': 'Log a slip?', 'rel.body': 'One hard day does not undo all your progress. Note the cause and pick the next step — your best streak stays.',
    'rel.trigger': 'What was the trigger? (optional)', 'rel.do': 'Log the slip',
    'rel.toastT': 'Continue from here', 'rel.toastS': 'Progress is not lost. Reflect on the cause and keep going.',

    'stats.title': 'Stats', 'stats.emptyT': 'Your statistics will appear here',
    'stats.emptyS': 'Add habits and fill the journal — charts, streaks and triggers build automatically.',
    'stats.cleanDays': 'Clean days', 'stats.cleanDaysSub': 'sum of abstinence streaks',
    'stats.relapses': 'Total slips', 'stats.relapsesSub': 'and you keep going',
    'stats.workouts': 'Workouts', 'stats.workoutsSub': 'body gets stronger',
    'stats.journalRec': 'Journal entries', 'stats.journalRecSub': 'awareness',
    'stats.moodEnergy': 'Mood and energy', 'stats.last14': 'Last 14 days',
    'stats.mood': 'Mood', 'stats.energy': 'Energy',
    'stats.progressDays': 'Progress days', 'stats.progressSub': 'Current abstinence streak',
    'stats.triggers': 'My triggers', 'stats.triggersSub': 'What challenges control the most',
    'stats.weekly': 'Weekly report', 'stats.weeklySub': 'Based on available records',

    'ach.title': 'Achievements', 'ach.progress': 'Unlocked {n} of {total} · collect them all',
    'ach.unlocked': '✓ Unlocked', 'ach.unlockedKicker': 'Achievement unlocked',
    'ach.unlockedDesc': 'You are getting stronger.',

    'profile.path': '🧭 My path', 'profile.reasons': '💚 Why I started',
    'profile.reasonsSub': 'Your reasons are fuel for hard moments', 'profile.addReason': 'Add a reason...',
    'profile.reasonsEmpty': 'Empty for now. Add your first reason.',
    'profile.fillJournal': 'Fill the journal', 'profile.jToday': 'Filled today', 'profile.jNot': 'Not filled yet',
    'profile.settings': 'Settings', 'profile.plan': 'Plan & Premium', 'profile.planSub': 'Current plan: {plan}',
    'profile.dataMgmt': 'Data management',
    'data.export': 'Download backup', 'data.exportSub': 'JSON file to your device',
    'data.import': 'Restore from backup', 'data.importSub': 'Load a previously saved file',
    'data.reset': 'Reset all progress', 'data.resetSub': 'Zero XP, streaks, journal — habits stay',
    'data.wipe': 'Delete all data', 'data.wipeSub': 'Completely clear the app',
    'data.hint': 'Data is stored in this browser only. Make backups so you don’t lose progress.',
    'data.privacyExportWarn': 'The backup contains personal data (including private habits and journal). Keep the file safe.',

    'plan.title': 'Plans', 'plan.sub': 'The free version stays useful. Premium is optional.',
    'plan.free.name': 'Free', 'plan.premium.name': 'Premium', 'plan.lifetime.name': 'Lifetime',
    'plan.current': 'Current plan', 'plan.choose': 'Choose Premium', 'plan.month': 'mo', 'plan.year': 'yr',
    'plan.paymentsSoon': 'Payments arrive later. For now everything that needs no server is available.',
    'plan.f.habits8': 'Up to 8 active habits', 'plan.f.streaks': 'Streaks and progress',
    'plan.f.journal': 'State journal', 'plan.f.basicStats': 'Basic statistics',
    'plan.f.achievements': 'Achievements and levels', 'plan.f.levels': 'Level system',
    'plan.f.guest': 'Guest mode', 'plan.f.export': 'Data export',
    'plan.f.crisis': 'Crisis mode', 'plan.f.weeklyBasic': 'Basic weekly report',
    'plan.f.achievements2': 'Achievements',
    'plan.p.unlimited': 'Unlimited habits', 'plan.p.analytics': 'Advanced analytics',
    'plan.p.sync': 'Device sync', 'plan.p.history': 'Full history',
    'plan.p.themes': 'Extra themes', 'plan.p.reports': 'Advanced reports',
    'plan.p.missions': 'Custom mission sets', 'plan.p.achievements': 'More achievements',
    'plan.p.ai': 'AI insights (optional)', 'plan.p.backup': 'Automatic backups',
    'plan.limitReached': 'Free plan limit reached', 'plan.limitBody': 'The free plan allows up to {n} active habits. Archive some or upgrade to Premium.',
    'plan.viewPlans': 'View Premium',

    'mission.title': 'Today’s missions', 'mission.sub': 'Small steps for the day',
    'mission.done': 'Done', 'mission.empty': 'No missions today. Add a habit scheduled for today.',
    'mission.off': 'Missions are disabled in settings.',

    'toast.saved': 'Saved locally', 'toast.habitAdded': 'New habit added',
    'toast.habitUpdated': 'Habit updated', 'toast.archived': 'Archived', 'toast.restored': 'Restored',
    'toast.reset': 'Progress reset', 'toast.wiped': 'All data deleted', 'toast.exported': 'Backup downloaded',
    'toast.imported': 'Backup restored', 'toast.langChanged': 'Language changed',

    'crisis.title': 'Stop. You are stronger than this.', 'crisis.sub': 'The urge is a wave. It rises and passes.',
    'crisis.why': 'Why I started', 'crisis.win': '💚 I made it', 'crisis.timerLbl': 'Breathe deeply. The wave recedes.',
    'crisis.wonT': 'You made it', 'crisis.wonS': 'Willpower +1. Be proud of yourself.',
  },
};

// Goal + character-stat labels (used by config-driven lists)
Object.assign(DICT.ru, {
  'goal.discipline': 'Развить дисциплину', 'goal.sport': 'Начать заниматься спортом',
  'goal.study': 'Больше учиться', 'goal.sleep': 'Улучшить режим сна',
  'goal.digital': 'Меньше в телефоне', 'goal.limit': 'Ограничить нежелательное',
  'goal.mood': 'Отслеживать настроение', 'goal.custom': 'Своя система',
});
Object.assign(DICT.en, {
  'goal.discipline': 'Build discipline', 'goal.sport': 'Start exercising',
  'goal.study': 'Study more', 'goal.sleep': 'Improve sleep',
  'goal.digital': 'Less phone time', 'goal.limit': 'Limit the unwanted',
  'goal.mood': 'Track mood', 'goal.custom': 'My own system',
});

// ---- Extended keys (levels, journal, triggers, path, crisis, achievements, imports) ----
Object.assign(DICT.ru, {
  'app.you': 'Ты',
  'lt.novice': 'Новичок', 'lt.explorer': 'Исследователь', 'lt.warrior': 'Воин дисциплины',
  'lt.master': 'Мастер контроля', 'lt.ascendant': 'Восходящий', 'lt.legend': 'Легенда',
  'journal.urge': 'Желание сорваться', 'journal.sleepH': 'Часов сна', 'journal.sleepQ': 'Качество сна',
  'journal.good': 'Что сегодня сделал хорошо?', 'journal.hard': 'Что было сложно?',
  'journal.helped': 'Что помогло сохранить контроль?', 'journal.triggers': 'Триггеры дня', 'journal.notes': 'Свободные заметки',
  'trig.boredom': 'Скука', 'trig.stress': 'Стресс', 'trig.lonely': 'Одиночество', 'trig.tired': 'Усталость',
  'trig.night': 'Ночь', 'trig.social': 'Соцсети', 'trig.mood': 'Плохое настроение',
  'insight.evening': 'По имеющимся записям, сложные моменты чаще случаются вечером и ночью. Возможно, стоит планировать раннее завершение дня.',
  'insight.top': 'По имеющимся записям, чаще всего отмечается триггер «{name}». Возможно, стоит подготовить план для таких ситуаций.',
  'path.day': 'День', 'path.d1t': 'Начало пути', 'path.d1d': 'Ты начал строить свою систему',
  'path.d7t': 'Первая неделя', 'path.d7d': 'Семь дней осознанности позади',
  'path.d30t': 'Месяц привычки', 'path.d30d': 'Регулярность меняет характер',
  'path.d90t': 'Новый уровень', 'path.d90d': 'Устойчивая система сформирована',
  'breath.in': 'Вдох…', 'breath.hold': 'Задержка…', 'breath.out': 'Выдох…', 'breath.pause': 'Пауза…',
  'crisis.sub2': 'Переживи 10 минут вместе со мной.', 'crisis.defaultReason': 'Хочу стать лучше и уважать себя',
  'crisis.held': 'Ты выстоял 💚',
  'qa.pushups': '20 отжиманий', 'qa.walk': 'Прогулка', 'qa.shower': 'Холодный душ', 'qa.music': 'Музыка',
  'qa.study': 'Учёба', 'qa.call': 'Позвонить другу', 'qa.toastT': 'Отличный выбор', 'qa.toastS': 'Действие переключает мозг',
  'import.errT': 'Ошибка восстановления', 'import.errBody': 'Не удалось восстановить данные. Выбранный файл повреждён или имеет неподдерживаемый формат.',
  'import.confirmT': 'Восстановить данные?', 'import.confirmBody': 'Текущие данные будут заменены содержимым резервной копии. Это действие нельзя отменить.',
  'import.created': 'Создана', 'import.restore': 'Восстановить',
  'reset.body': 'История, серии, XP, дневник и достижения будут удалены. Это действие нельзя отменить. Сохранятся: имя, настройки и список привычек (с обнулёнными показателями).',
  'wipe.body': 'Будут полностью удалены: прогресс, привычки, профиль, настройки, дневник, достижения и история. Приложение вернётся к состоянию нового пользователя.',
  'wipe.confirm': 'Для подтверждения введите слово', 'wipe.word': 'УДАЛИТЬ',
  'wipe.deleting': 'Удаление данных в облаке…', 'wipe.cloudErr': 'Не удалось удалить данные в облаке. Локальные данные не тронуты. Попробуйте ещё раз.',
  'ach.all': 'Все',
  'cat.start': 'Начало', 'cat.streaks': 'Серии', 'cat.consistency': 'Постоянство', 'cat.sport': 'Спорт',
  'cat.learning': 'Обучение', 'cat.journal': 'Дневник', 'cat.mindfulness': 'Осознанность', 'cat.recovery': 'Восстановление',
  'cat.levels': 'Уровни', 'cat.xp': 'XP', 'cat.universal': 'Универсальные', 'cat.hidden': 'Скрытые',
  'acd.start': 'Первые шаги в системе', 'acd.streaks': 'Держи серию как можно дольше', 'acd.consistency': 'Регулярность решает',
  'acd.sport': 'Тренировки и активность', 'acd.learning': 'Обучение и развитие', 'acd.journal': 'Записи состояния',
  'acd.mindfulness': 'Прохождение сложных моментов', 'acd.recovery': 'Возвращение после срыва', 'acd.levels': 'Рост уровня',
  'acd.xp': 'Накопленный опыт', 'acd.universal': 'Общая активность', 'acd.hidden': 'Секретное достижение',
  'achg.firstHabit': 'Первая привычка', 'achg.firstCheck': 'Первая отметка', 'achg.firstJournal': 'Первая запись',
  'achg.firstWeek': 'Первая неделя', 'achg.streak': '{n} дней серии', 'achg.checkins': '{n} выполнений',
  'achg.sport': '{n} тренировок', 'achg.learn': '{n} единиц знаний', 'achg.journal': '{n} записей дневника',
  'achg.crisis': 'Кризис пройден ×{n}', 'achg.recovery': 'Возврат ×{n}', 'achg.level': 'Уровень {n}',
  'achg.xp': '{n} XP', 'achg.habits': '{n} привычек', 'achg.clean': '{n} чистых дней',
  'achg.hBalance': 'Баланс силы', 'achg.hComeback': 'Второе дыхание', 'achg.hDedication': 'Преданность пути',
  'jh.title': 'История дневника', 'jh.short': 'История', 'jh.empty': 'Пока нет записей дневника',
  'jh.emptySub': 'Первая запись появится после сохранения дня', 'jh.today': 'сегодня',
  'jh.noText': 'Без заметок', 'jh.count': 'Записей: {n}',
  'rank.novice': 'Новичок', 'rank.start': 'Начало пути', 'rank.apprentice': 'Ученик',
  'rank.advanced': 'Продвинутый', 'rank.master': 'Мастер', 'rank.elite': 'Элита',
  'statd.discipline': 'Растёт благодаря стабильному выполнению целей и контролю действий.',
  'statd.strength': 'Растёт благодаря тренировкам и физическим нагрузкам.',
  'statd.knowledge': 'Растёт благодаря обучению, чтению и развитию навыков.',
  'statd.resilience': 'Растёт благодаря прохождению трудных моментов и осознанности.',
  'statg.discipline': 'Ежедневные привычки, воздержание, дневник',
  'statg.strength': 'Тренировки, спорт, физические цели',
  'statg.knowledge': 'Чтение, учёба, новые навыки',
  'statg.resilience': 'Кризисные победы, воздержание, рефлексия',
  'stat.about': 'Что развивает', 'stat.linked': 'Связанные привычки', 'stat.trend': 'Динамика развития',
  'stat.trendDelta': 'рост +{n} п.п.', 'stat.noTrend': 'Динамика появится со временем', 'stat.rankLabel': 'Ранг',
  'fb.small': 'Небольшой прогресс', 'fb.good': 'Хороший вклад', 'fb.strong': 'Сильное действие', 'fb.up': 'Характеристика растёт',
  'start.beginning': 'Начало пути', 'start.firstStep': 'Первый шаг сделан',
  'home.starterHint': 'Прогресс появится после первых действий',
  'stats.startedS': 'Твой прогресс появится после первых действий', 'stats.doFirst': 'Отметить действие',
});
Object.assign(DICT.en, {
  'app.you': 'You',
  'lt.novice': 'Novice', 'lt.explorer': 'Explorer', 'lt.warrior': 'Discipline Warrior',
  'lt.master': 'Control Master', 'lt.ascendant': 'Ascendant', 'lt.legend': 'Legend',
  'journal.urge': 'Urge to slip', 'journal.sleepH': 'Hours of sleep', 'journal.sleepQ': 'Sleep quality',
  'journal.good': 'What did you do well today?', 'journal.hard': 'What was hard?',
  'journal.helped': 'What helped you stay in control?', 'journal.triggers': 'Triggers of the day', 'journal.notes': 'Free notes',
  'trig.boredom': 'Boredom', 'trig.stress': 'Stress', 'trig.lonely': 'Loneliness', 'trig.tired': 'Fatigue',
  'trig.night': 'Night', 'trig.social': 'Social media', 'trig.mood': 'Low mood',
  'insight.evening': 'Based on your records, hard moments tend to happen in the evening and at night. You might plan an earlier wind-down.',
  'insight.top': 'Based on your records, the most frequent trigger is “{name}”. You might prepare a plan for such situations.',
  'path.day': 'Day', 'path.d1t': 'The beginning', 'path.d1d': 'You started building your system',
  'path.d7t': 'First week', 'path.d7d': 'Seven days of awareness done',
  'path.d30t': 'A month in', 'path.d30d': 'Consistency reshapes character',
  'path.d90t': 'New level', 'path.d90d': 'A stable system has formed',
  'breath.in': 'Inhale…', 'breath.hold': 'Hold…', 'breath.out': 'Exhale…', 'breath.pause': 'Pause…',
  'crisis.sub2': 'Ride out 10 minutes with me.', 'crisis.defaultReason': 'I want to grow and respect myself',
  'crisis.held': 'You held on 💚',
  'qa.pushups': '20 push-ups', 'qa.walk': 'Walk', 'qa.shower': 'Cold shower', 'qa.music': 'Music',
  'qa.study': 'Study', 'qa.call': 'Call a friend', 'qa.toastT': 'Great choice', 'qa.toastS': 'Action shifts the brain',
  'import.errT': 'Restore failed', 'import.errBody': 'Could not restore data. The selected file is corrupted or in an unsupported format.',
  'import.confirmT': 'Restore data?', 'import.confirmBody': 'Your current data will be replaced with the backup. This cannot be undone.',
  'import.created': 'Created', 'import.restore': 'Restore',
  'reset.body': 'History, streaks, XP, journal and achievements will be removed. This cannot be undone. Kept: name, settings and your habit list (with zeroed metrics).',
  'wipe.body': 'This will fully delete: progress, habits, profile, settings, journal, achievements and history. The app returns to a new-user state.',
  'wipe.confirm': 'Type the word to confirm', 'wipe.word': 'DELETE',
  'wipe.deleting': 'Deleting cloud data…', 'wipe.cloudErr': 'Could not delete cloud data. Local data was left untouched. Please try again.',
  'ach.all': 'All',
  'cat.start': 'Start', 'cat.streaks': 'Streaks', 'cat.consistency': 'Consistency', 'cat.sport': 'Sport',
  'cat.learning': 'Learning', 'cat.journal': 'Journal', 'cat.mindfulness': 'Mindfulness', 'cat.recovery': 'Recovery',
  'cat.levels': 'Levels', 'cat.xp': 'XP', 'cat.universal': 'Universal', 'cat.hidden': 'Hidden',
  'acd.start': 'First steps in the system', 'acd.streaks': 'Hold the streak as long as you can', 'acd.consistency': 'Consistency wins',
  'acd.sport': 'Training and activity', 'acd.learning': 'Learning and growth', 'acd.journal': 'State entries',
  'acd.mindfulness': 'Getting through hard moments', 'acd.recovery': 'Coming back after a slip', 'acd.levels': 'Level growth',
  'acd.xp': 'Accumulated experience', 'acd.universal': 'Overall activity', 'acd.hidden': 'Secret achievement',
  'achg.firstHabit': 'First habit', 'achg.firstCheck': 'First check-in', 'achg.firstJournal': 'First entry',
  'achg.firstWeek': 'First week', 'achg.streak': '{n}-day streak', 'achg.checkins': '{n} check-ins',
  'achg.sport': '{n} workouts', 'achg.learn': '{n} knowledge units', 'achg.journal': '{n} journal entries',
  'achg.crisis': 'Crisis passed ×{n}', 'achg.recovery': 'Comeback ×{n}', 'achg.level': 'Level {n}',
  'achg.xp': '{n} XP', 'achg.habits': '{n} habits', 'achg.clean': '{n} clean days',
  'achg.hBalance': 'Balance of power', 'achg.hComeback': 'Second wind', 'achg.hDedication': 'Devotion to the path',
  'jh.title': 'Journal history', 'jh.short': 'History', 'jh.empty': 'No journal entries yet',
  'jh.emptySub': 'Your first entry appears after you save a day', 'jh.today': 'today',
  'jh.noText': 'No notes', 'jh.count': 'Entries: {n}',
  'rank.novice': 'Beginner', 'rank.start': 'Getting started', 'rank.apprentice': 'Apprentice',
  'rank.advanced': 'Advanced', 'rank.master': 'Master', 'rank.elite': 'Elite',
  'statd.discipline': 'Grows from steadily completing goals and controlling your actions.',
  'statd.strength': 'Grows from training and physical activity.',
  'statd.knowledge': 'Grows from learning, reading and building skills.',
  'statd.resilience': 'Grows from getting through hard moments and self-awareness.',
  'statg.discipline': 'Daily habits, abstinence, journaling',
  'statg.strength': 'Workouts, sport, physical goals',
  'statg.knowledge': 'Reading, studying, new skills',
  'statg.resilience': 'Crisis wins, abstinence, reflection',
  'stat.about': 'What develops it', 'stat.linked': 'Linked habits', 'stat.trend': 'Growth over time',
  'stat.trendDelta': '+{n} pts growth', 'stat.noTrend': 'A trend will appear over time', 'stat.rankLabel': 'Rank',
  'fb.small': 'Small progress', 'fb.good': 'Good contribution', 'fb.strong': 'Strong action', 'fb.up': 'Character growing',
  'start.beginning': 'The beginning', 'start.firstStep': 'First step taken',
  'home.starterHint': 'Progress appears after your first actions',
  'stats.startedS': 'Your progress will appear after your first actions', 'stats.doFirst': 'Log an action',
});

let _lang = 'ru';
function setLang(l) { if (DICT[l]) _lang = l; }
function getLang() { return _lang; }

function t(key, vars) {
  const dict = DICT[_lang] || DICT.ru;
  let s = (key in dict) ? dict[key] : (DICT.ru[key] ?? key);
  if (vars) for (const k in vars) s = s.replaceAll('{' + k + '}', vars[k]);
  return s;
}

// Locale-aware "days" word
function daysWordL(n) {
  if (_lang === 'en') return n === 1 ? 'day' : 'days';
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return 'день';
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return 'дня';
  return 'дней';
}

if (typeof window !== 'undefined') {
  window.AscendI18n = { LANGS, DICT, t, setLang, getLang, daysWordL };
}
