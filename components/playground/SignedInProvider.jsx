"use client";

import { createContext, useContext } from "react";
import { useAuth } from "@clerk/nextjs";

/**
 * "Is there a session to sync to?" — answerable on a build with no Clerk keys.
 *
 * The tools need this to decide whether to mirror a change to the server, and
 * they must keep working when the answer is no *and* when Clerk is not
 * installed at all, which is how this site runs before keys are set. `useAuth`
 * throws outside a `ClerkProvider`, and a hook cannot be called conditionally,
 * so the condition is moved up a level: `ClerkProbe` either exists in the tree
 * or it does not, and the context default carries the signed-out answer when
 * it does not.
 *
 * `children` is passed through as a slot, so a server component can wrap
 * server-rendered tool markup in this without either side becoming the other's
 * problem.
 */

const SignedInContext = createContext(false);

/** True when there is a Clerk session. Always false without Clerk keys. */
export function useSignedIn() {
  return useContext(SignedInContext);
}

function ClerkProbe({ children }) {
  const { isSignedIn } = useAuth();
  return (
    <SignedInContext.Provider value={Boolean(isSignedIn)}>
      {children}
    </SignedInContext.Provider>
  );
}

export function SignedInProvider({ clerkConfigured, children }) {
  if (!clerkConfigured) return children;
  return <ClerkProbe>{children}</ClerkProbe>;
}
