import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { Providers } from './providers';
import { AppNav } from '@/components/navigation/app-nav';

const abcDiatype = localFont({
    src: [
        {
            path: '../fonts/ABCDiatype-Regular.woff2',
            weight: '400',
            style: 'normal',
        },
        {
            path: '../fonts/ABCDiatype-Medium.woff2',
            weight: '500',
            style: 'normal',
        },
        {
            path: '../fonts/ABCDiatype-Bold.woff2',
            weight: '700',
            style: 'normal',
        },
    ],
    variable: '--font-abc-diatype',
    display: 'swap',
});

const berkeleyMono = localFont({
    src: [
        {
            path: '../fonts/BerkeleyMono-Regular.otf',
            weight: '400',
            style: 'normal',
        },
        {
            path: '../fonts/BerkeleyMono-Bold.otf',
            weight: '700',
            style: 'normal',
        },
        {
            path: '../fonts/BerkeleyMono-Oblique.otf',
            weight: '400',
            style: 'italic',
        },
        {
            path: '../fonts/BerkeleyMono-Bold-Oblique.otf',
            weight: '700',
            style: 'italic',
        },
    ],
    variable: '--font-berkeley-mono',
    display: 'swap',
});

const inter = localFont({
    src: '../fonts/InterVariable.woff2',
    variable: '--font-inter',
    display: 'swap',
    weight: '100 900',
});

export const metadata: Metadata = {
    title: 'ConnectorKit Example',
    description: 'Example implementation of ConnectorKit React components',
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className={`${abcDiatype.variable} ${berkeleyMono.variable} ${inter.variable} antialiased`}>
                <Providers>
                    <AppNav />
                    {children}
                </Providers>
            </body>
        </html>
    );
}
