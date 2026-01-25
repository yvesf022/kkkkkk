import "../styles/globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Sidebar from "@/components/layout/Sidebar";
import { UIProvider } from "@/components/layout/uiStore";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <UIProvider>
          <Header />
          <main className="container">
            <div className="pageGrid">
              <div>{children}</div>
              <Sidebar />
            </div>
          </main>
          <Footer />
        </UIProvider>
      </body>
    </html>
  );
}
