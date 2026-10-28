import './globals.css';
import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'MediQueue — Doctor Appointments', description: 'Find doctors and manage your clinic queue' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
