// app/layout.tsx
import './globals.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it">
      <body className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col">
        {children}
      </body>
    </html>
  );
}