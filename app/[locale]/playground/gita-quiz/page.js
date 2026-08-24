import { setRequestLocale, getTranslations } from "next-intl/server";
import { dbConnect } from "@/lib/db/connect";
import QuizQuestion from "@/models/QuizQuestion";
import { toPlain } from "@/lib/serialize";
import { clerkConfigured } from "@/lib/auth-config";
import { GitaQuiz } from "@/components/playground/GitaQuiz";

export const dynamic = "force-dynamic";

export default async function GitaQuizPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("playground.quiz");

  await dbConnect();
  const questions = await QuizQuestion.find({}).sort({ chapter: 1 }).lean();

  return (
    <div className="mx-auto max-w-xl px-5 py-14 md:px-10 md:py-20">
      <h1 className="text-3xl font-extrabold text-foreground md:text-4xl">{t("title")}</h1>
      <p className="mt-2 text-foreground/60">{t("subtitle")}</p>

      {questions.length === 0 ? (
        <p className="mt-10 text-center text-foreground/50">{t("empty")}</p>
      ) : (
        <GitaQuiz questions={toPlain(questions)} clerkConfigured={clerkConfigured} />
      )}
    </div>
  );
}
