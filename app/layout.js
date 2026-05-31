import "./globals.css";

export const metadata = {
  title: "FounderRadar — Company Intelligence Platform",
  description: "Research any company instantly. Get key contacts, outreach templates, interview prep, market intel, and actionable insights — all from a single search.",
  keywords: "company research, lead intelligence, job hunting, networking, sales prospecting, company analysis",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div className="bg-grid" />
        <nav className="navbar">
          <a href="/" className="navbar-brand">
            📡 <span>FounderRadar</span>
          </a>
          <div className="flex items-center gap-sm">
            <span className="badge badge-accent">Powered by Anakin Wire</span>
          </div>
        </nav>
        <main style={{ paddingTop: '60px' }}>
          {children}
        </main>
      </body>
    </html>
  );
}
