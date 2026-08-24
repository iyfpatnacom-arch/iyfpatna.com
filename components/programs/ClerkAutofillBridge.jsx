"use client";

import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";

export function ClerkAutofillBridge({ onAutofill }) {
  const { user, isLoaded } = useUser();

  useEffect(() => {
    if (!isLoaded || !user) return;
    onAutofill({
      name: user.fullName ?? "",
      email: user.primaryEmailAddress?.emailAddress ?? "",
      phone: user.primaryPhoneNumber?.phoneNumber ?? "",
    });
  }, [isLoaded, user, onAutofill]);

  return null;
}
