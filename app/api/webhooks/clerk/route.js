import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db/connect";
import User from "@/models/User";

export async function POST(request) {
  if (!process.env.CLERK_WEBHOOK_SIGNING_SECRET) {
    return NextResponse.json(
      { error: "CLERK_WEBHOOK_SIGNING_SECRET not configured" },
      { status: 501 }
    );
  }

  const { verifyWebhook } = await import("@clerk/nextjs/webhooks");
  let event;
  try {
    event = await verifyWebhook(request);
  } catch (err) {
    console.error("[webhooks:clerk] verification failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "user.created") {
    const { id, first_name, last_name, email_addresses, phone_numbers } = event.data;
    await dbConnect();
    await User.findOneAndUpdate(
      { clerkId: id },
      {
        $setOnInsert: {
          clerkId: id,
          name: [first_name, last_name].filter(Boolean).join(" "),
          email: email_addresses?.[0]?.email_address ?? "",
          phone: phone_numbers?.[0]?.phone_number ?? "",
        },
      },
      { upsert: true }
    );
  }

  return NextResponse.json({ ok: true });
}
