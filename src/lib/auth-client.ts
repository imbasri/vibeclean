import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
});

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  getSession,
} = authClient;

export async function logout() {
  await signOut({
    fetchOptions: {
      onSuccess: () => {
        window.location.href = "/";
      },
    },
  });
}
