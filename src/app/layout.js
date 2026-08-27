
import "./globals.css";
import Link from "next/link";

export const metadata = { title: "KrishiSetu | Better farming, better returns", description: "India's trusted agricultural marketplace" };

export default function RootLayout({ children }) {
  
  return <html lang="en">
    <body>
       
      {children}
      </body>
    </html>;
}