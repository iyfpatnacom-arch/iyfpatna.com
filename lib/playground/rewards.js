/**
 * The japa counter's rewards.
 *
 * The design rule these follow: a reward may only ever be granted for chanting
 * that actually happened. There is no currency, no streak that can be bought
 * back, no daily-login prize and nothing that expires — because the moment a
 * badge can be obtained by opening an app rather than by chanting, the badge
 * is measuring the wrong thing and the tool starts quietly teaching people to
 * game it.
 *
 * So every rule below reads only from the chanting log, and several of them
 * read the calendar too: chanting on Ekadashi or on a festival is a real
 * distinction in the practice, and the panchang can tell whether it happened
 * without anyone having to claim it.
 *
 * Names are bilingual data, like the festivals — a badge's name is part of the
 * record, not a label on a button.
 *
 * Each rule is `evaluate(stats) -> { current, target }`. Unlocking, progress
 * and ordering are derived from that one pair, so a new badge is one entry.
 */

export const REWARDS = [
  {
    key: "first_round",
    emoji: "🌱",
    name: { en: "First round", hi: "पहली माला" },
    hint: { en: "Chant one full round.", hi: "एक पूरी माला जपिए।" },
    evaluate: (s) => ({ current: s.lifetimeRounds, target: 1 }),
  },
  {
    key: "four_rounds",
    emoji: "🪷",
    name: { en: "Four in a day", hi: "एक दिन में चार" },
    hint: {
      en: "Four rounds in a single day.",
      hi: "एक ही दिन में चार माला।",
    },
    evaluate: (s) => ({ current: s.bestDayRounds, target: 4 }),
  },
  {
    key: "sixteen_rounds",
    emoji: "🔱",
    name: { en: "Sixteen rounds", hi: "सोलह माला" },
    hint: {
      en: "The initiated standard, in one day.",
      hi: "दीक्षित भक्तों का मानक, एक दिन में।",
    },
    evaluate: (s) => ({ current: s.bestDayRounds, target: 16 }),
  },
  {
    key: "brahma_muhurta",
    emoji: "🌄",
    name: { en: "Brahma-muhurta", hi: "ब्रह्म मुहूर्त" },
    hint: {
      en: "Start chanting before 6am, five times.",
      hi: "पाँच बार सुबह 6 बजे से पहले जप आरंभ कीजिए।",
    },
    evaluate: (s) => ({ current: s.earlyDays, target: 5 }),
  },
  {
    key: "week_streak",
    emoji: "🔥",
    name: { en: "Seven days running", hi: "लगातार सात दिन" },
    hint: {
      en: "Chant every day for a week.",
      hi: "एक सप्ताह तक प्रतिदिन जप कीजिए।",
    },
    evaluate: (s) => ({ current: s.bestStreak, target: 7 }),
  },
  {
    key: "month_streak",
    emoji: "🗓️",
    name: { en: "A full month", hi: "पूरा महीना" },
    hint: {
      en: "Thirty days without a gap.",
      hi: "तीस दिन, बिना नागा।",
    },
    evaluate: (s) => ({ current: s.bestStreak, target: 30 }),
  },
  {
    key: "ekadashi",
    emoji: "🌘",
    name: { en: "Ekadashi chanter", hi: "एकादशी जप" },
    hint: {
      en: "Chant on three Ekadashi days.",
      hi: "तीन एकादशियों पर जप कीजिए।",
    },
    evaluate: (s) => ({ current: s.ekadashiDays, target: 3 }),
  },
  {
    key: "ekadashi_sixty_four",
    emoji: "🌕",
    name: { en: "Sixty-four on Ekadashi", hi: "एकादशी पर चौंसठ" },
    hint: {
      en: "Sixty-four rounds on an Ekadashi day.",
      hi: "एकादशी के दिन चौंसठ माला।",
    },
    evaluate: (s) => ({ current: s.bestEkadashiRounds, target: 64 }),
  },
  {
    key: "festival",
    emoji: "🎉",
    name: { en: "Festival day", hi: "उत्सव का दिन" },
    hint: {
      en: "Chant on a festival in the calendar.",
      hi: "पंचांग के किसी उत्सव पर जप कीजिए।",
    },
    evaluate: (s) => ({ current: s.festivalDays, target: 1 }),
  },
  {
    key: "hundred_lifetime",
    emoji: "💯",
    name: { en: "One hundred rounds", hi: "सौ माला" },
    hint: { en: "A hundred rounds in total.", hi: "कुल मिलाकर सौ माला।" },
    evaluate: (s) => ({ current: s.lifetimeRounds, target: 100 }),
  },
  {
    key: "thousand_lifetime",
    emoji: "🏔️",
    name: { en: "One thousand rounds", hi: "एक हज़ार माला" },
    hint: { en: "A thousand rounds in total.", hi: "कुल मिलाकर एक हज़ार माला।" },
    evaluate: (s) => ({ current: s.lifetimeRounds, target: 1000 }),
  },
  {
    key: "hundred_eight_days",
    emoji: "📿",
    name: { en: "One hundred and eight days", hi: "एक सौ आठ दिन" },
    hint: {
      en: "Chant on 108 separate days.",
      hi: "एक सौ आठ अलग-अलग दिनों पर जप।",
    },
    evaluate: (s) => ({ current: s.daysChanted, target: 108 }),
  },
];

/**
 * Every reward with its state resolved.
 *
 * Unlocked ones come first, then the ones nearest to unlocking — so the grid
 * opens on what has been earned and what is within reach, rather than on a
 * wall of padlocks.
 */
export function resolveRewards(stats) {
  return REWARDS.map((reward) => {
    const { current, target } = reward.evaluate(stats);
    return {
      ...reward,
      current: Math.min(current, target),
      target,
      unlocked: current >= target,
      progress: target === 0 ? 1 : Math.min(1, current / target),
    };
  }).sort((a, b) => {
    if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
    return b.progress - a.progress;
  });
}
