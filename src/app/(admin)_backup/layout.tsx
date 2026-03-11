import { AuthProvider } from "@/contexts/auth-context";

export default function AdminGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthProvider>{children}</AuthProvider>;
}
