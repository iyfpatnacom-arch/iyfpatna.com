import { setRequestLocale } from "next-intl/server";

export const dynamic = "force-dynamic";
import { dbConnect } from "@/lib/db/connect";
import Program from "@/models/Program";
import Festival from "@/models/Festival";
import { toPlain } from "@/lib/serialize";
import { DesktopHome } from "@/components/home/DesktopHome";
import { MobileHome } from "@/components/home/MobileHome";

export default async function HomePage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);

  await dbConnect();
  const [programs, festival] = await Promise.all([
    Program.find({ isActive: true }).sort({ order: 1 }).limit(3).lean(),
    Festival.findOne({ isCurrent: true }).lean(),
  ]);

  const plainPrograms = toPlain(programs);
  const plainFestival = festival ? toPlain(festival) : null;

  return (
    <>
      <div className="hidden md:block">
        <DesktopHome programs={plainPrograms} festival={plainFestival} />
      </div>
      <div className="md:hidden">
        <MobileHome programs={plainPrograms} festival={plainFestival} />
      </div>
    </>
  );
}
