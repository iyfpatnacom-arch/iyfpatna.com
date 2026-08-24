import { setRequestLocale, getTranslations } from "next-intl/server";
import { GlassCard } from "@/components/glass/GlassCard";
import { MemberGrid } from "@/components/about/MemberGrid";

const MEMBERS = [
  { name: "Aditya Raj", role: "Coordinator", seed: "iyf-member-1" },
  { name: "Priya Sharma", role: "Kirtan Lead", seed: "iyf-member-2" },
  { name: "Rohan Kumar", role: "Seva Lead", seed: "iyf-member-3" },
  { name: "Ananya Singh", role: "Outreach", seed: "iyf-member-4" },
  { name: "Kartik Verma", role: "Campus Chapters", seed: "iyf-member-5" },
  { name: "Ishita Gupta", role: "Study Circles", seed: "iyf-member-6" },
  { name: "Saurabh Jha", role: "Media", seed: "iyf-member-7" },
  { name: "Divya Mishra", role: "Events", seed: "iyf-member-8" },
];

export default async function AboutPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("about");

  return (
    <div className="mx-auto max-w-4xl px-5 py-14 md:px-10 md:py-20">
      <span className="text-xs font-bold uppercase tracking-widest text-gold-ink">
        {t("eyebrow")}
      </span>
      <h1 className="mt-3 text-3xl font-extrabold text-foreground md:text-5xl">
        {t("title")}
      </h1>

      <div className="mt-8 overflow-hidden rounded-3xl border border-glass/10">
        <img
          src="https://picsum.photos/seed/iyf-group-photo/1200/700"
          alt=""
          className="h-64 w-full object-cover md:h-96"
        />
      </div>

      <GlassCard className="mt-8 p-6 md:p-10">
        <p className="text-base leading-relaxed text-foreground/70 md:text-lg">
          {t("body")}
        </p>
      </GlassCard>

      <div className="mt-14">
        <h2 className="text-2xl font-extrabold text-foreground">
          {t("members_title")}
        </h2>
        <p className="mt-1 text-sm text-foreground/50">{t("members_subtitle")}</p>
        <MemberGrid members={MEMBERS} />
      </div>
    </div>
  );
}
