/**
 * Layout for /login — renders WITHOUT sidebar and header.
 * The root layout already provides AuthProvider, so this just passes through.
 */
export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
