"use client";

import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

export function MemberGrid({ members }) {
  return (
    <div className="mt-6 grid grid-cols-4 gap-4 md:grid-cols-8">
      {members.map((member) => (
        <div key={member.seed} className="group relative flex flex-col items-center gap-2">
          <Avatar className="h-16 w-16 border-2 border-glass/10 transition-transform group-hover:scale-105 group-hover:border-brand-gold/60">
            <AvatarImage src={`https://picsum.photos/seed/${member.seed}/160/160`} alt={member.name} />
            <AvatarFallback>{member.name.slice(0, 2)}</AvatarFallback>
          </Avatar>
          <div className="pointer-events-none absolute -top-9 z-10 scale-90 rounded-lg border border-glass/10 bg-popover px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap text-foreground opacity-0 shadow-lg transition-all group-hover:scale-100 group-hover:opacity-100">
            {member.name}
            <span className="block text-[10px] font-normal text-foreground/50">
              {member.role}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
