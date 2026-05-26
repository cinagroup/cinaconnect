import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CinaConnect — Service Status",
  description: "Public health status page for CinaConnect services",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
