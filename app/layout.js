import "./globals.css";

export const metadata = {
  title: "FounderRadar — B2B Lead Intelligence Engine",
  description: "Turn any company name into a ready-to-send sales dossier in under 60 seconds. AI-powered research, pain extraction, and personalized outreach generation.",
  keywords: "B2B sales, lead intelligence, sales research, outbound automation, company research",
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
            <span className="badge badge-accent">Hackathon MVP</span>
          </div>
        </nav>
        <main style={{ paddingTop: '60px' }}>
          {children}
        </main>
      </body>
    </html>
  );
}
