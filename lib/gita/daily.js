/**
 * Gita Daily — one verse a day, the same one for everybody.
 *
 * The "same one for everybody" is the whole mechanic. There is no server here
 * and no puzzle table: the verse is a pure function of the date, so two people
 * comparing scores over WhatsApp are provably comparing the same puzzle, and
 * the whole game keeps working with the phone offline and the database down.
 *
 * Selection is a stride through the corpus rather than `index % length`, which
 * would walk the verses in the order they happen to be written in the file.
 * The stride is coprime with the corpus size, so every verse comes up exactly
 * once before any repeats — adding a verse reshuffles the future, which is
 * fine, and never causes a repeat inside a cycle, which is what matters.
 */

import { VERSES } from "./verses.js";

/** Day zero. Puzzle numbering starts here so the numbers stay small and shareable. */
const EPOCH = Date.UTC(2026, 0, 1);
const IST_OFFSET_MS = 330 * 60000;
const MS_PER_DAY = 86400000;

/** Guesses allowed. Enough to win by narrowing; few enough that clues matter. */
export const MAX_GUESSES = 5;

/**
 * Coprime with the corpus size, so the walk visits every verse before
 * repeating. Asserted below rather than trusted: adding verses changes the
 * corpus size, and a stride that shares a factor with it would silently start
 * showing a third of the collection over and over.
 */
const STRIDE = 17;
const OFFSET = 7;

function greatestCommonDivisor(a, b) {
  return b === 0 ? a : greatestCommonDivisor(b, a % b);
}

/** True when the stride will visit every verse. Exported so a test can assert it. */
export function strideIsCoprime(size = VERSES.length) {
  return greatestCommonDivisor(STRIDE, size) === 1;
}

/** The Patna calendar date of an instant, as "YYYY-MM-DD". */
export function istDayKey(now = Date.now()) {
  return new Date(now + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/** The puzzle number for a Patna date. Day 1 is 1 January 2026. */
export function puzzleNumberFor(dayKey) {
  const [y, m, d] = dayKey.split("-").map(Number);
  return Math.floor((Date.UTC(y, m - 1, d) - EPOCH) / MS_PER_DAY) + 1;
}

/** The verse for a puzzle number. */
export function verseForPuzzle(number) {
  const size = VERSES.length;
  // JavaScript's % keeps the sign of the dividend, and a puzzle number can be
  // negative for anyone whose clock is set before the epoch.
  const index = (((number * STRIDE + OFFSET) % size) + size) % size;
  return VERSES[index];
}

/** Today's puzzle: its number and its verse. */
export function todaysPuzzle(now = Date.now()) {
  const dayKey = istDayKey(now);
  const number = puzzleNumberFor(dayKey);
  return { dayKey, number, verse: verseForPuzzle(number) };
}

/** The chapters a guess may choose from — derived from the corpus, not assumed. */
export function guessableChapters() {
  const chapters = [...new Set(VERSES.map((verse) => verse.chapter))];
  const min = Math.min(...chapters);
  const max = Math.max(...chapters);
  return Array.from({ length: max - min + 1 }, (_, index) => min + index);
}

/**
 * Which chapters are still possible, given the guesses so far.
 *
 * Every guess returns "earlier" or "later", so each one cuts the range. The
 * board greys out what has been ruled out — the information was already given,
 * and making the player hold it in their head is not difficulty, it is just
 * bookkeeping.
 */
export function remainingChapters(guesses, answer) {
  let low = -Infinity;
  let high = Infinity;
  for (const guess of guesses) {
    if (guess < answer) low = Math.max(low, guess);
    else if (guess > answer) high = Math.min(high, guess);
  }
  return guessableChapters().filter(
    (chapter) => chapter > low && chapter < high && !guesses.includes(chapter)
  );
}

/** "later" | "earlier" | "correct" for one guess. */
export function directionOf(guess, answer) {
  if (guess === answer) return "correct";
  return guess < answer ? "later" : "earlier";
}

/**
 * The shareable result.
 *
 * Arrows rather than Wordle's coloured squares, because the feedback here is
 * directional rather than positional — and they carry no information about the
 * answer itself, so a result posted in a group chat cannot spoil the puzzle for
 * anyone who has not played yet.
 */
export function shareGrid(guesses, answer) {
  return guesses
    .map((guess) => {
      const direction = directionOf(guess, answer);
      if (direction === "correct") return "🟩";
      return direction === "later" ? "🔺" : "🔻";
    })
    .join("");
}

/** "3/5", or "X/5" when the puzzle was not solved. */
export function scoreLabel(guesses, answer) {
  const won = guesses.includes(answer);
  return `${won ? guesses.length : "X"}/${MAX_GUESSES}`;
}

/** Milliseconds until the next puzzle appears (midnight in Patna). */
export function msUntilNextPuzzle(now = Date.now()) {
  const sinceMidnight = (now + IST_OFFSET_MS) % MS_PER_DAY;
  return MS_PER_DAY - sinceMidnight;
}
