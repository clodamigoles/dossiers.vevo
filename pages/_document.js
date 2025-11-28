import { Html, Head, Main, NextScript } from "next/document"

export default function Document() {
    return (
        <Html lang="fr" className="dark">
            <Head>
                <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes" />
                <meta name="theme-color" content="#0a0a0a" />
            </Head>
            <body className="bg-background text-foreground antialiased">
                <Main />
                <NextScript />
            </body>
        </Html>
    )
}