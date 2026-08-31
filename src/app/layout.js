
import { LoggedInNavbar } from "@/component/LoggedInNavbar";
import "./globals.css";
import Link from "next/link";

export const metadata = { title: "KrishiSetu | Better farming, better returns", description: "India's trusted agricultural marketplace" };

export default function RootLayout({ children }) {
  
  return <html lang="en">
    <body>
     
       <main className="min-h-screen">
        {children}
       </main>
       
     
      </body>
    </html>;
}