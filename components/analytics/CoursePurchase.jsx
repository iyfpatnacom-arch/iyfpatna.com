"use client";

import { useEffect } from "react";
import posthog from "posthog-js";

const fired = (orderId) => `iyf:posthog-course-completed:${orderId}`;

/** Reports a server-verified course payment once from the enrollee's browser. */
export function CoursePurchase({ orderId, courseSlug, amount, currency, enrollmentMode }) {
  useEffect(() => {
    try {
      if (sessionStorage.getItem(fired(orderId))) return;
      sessionStorage.setItem(fired(orderId), "1");
    } catch {
      /* Storage blocked — capture remains safe because the order is verified. */
    }

    posthog.capture("course_enrollment_completed", {
      order_id: orderId,
      course_slug: courseSlug,
      amount: Number(amount) || 0,
      currency,
      enrollment_mode: enrollmentMode,
    });
  }, [orderId, courseSlug, amount, currency, enrollmentMode]);

  return null;
}
