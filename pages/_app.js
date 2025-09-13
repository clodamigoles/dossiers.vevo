import "@/styles/Tailwind.css"
import "@/styles/Global.css"

export default function App({ Component, pageProps }) {
    return (
        <>
            <Component {...pageProps} />
        </>
    )
}