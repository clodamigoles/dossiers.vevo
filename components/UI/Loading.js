import Image from "next/image"

import { APP_NAME } from "@/constants/config"

export default function Loading() {
    return (
        <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center">
            <div className="mb-8">
                <div className="w-16 h-16 bg-yellow-500 rounded-full flex items-center justify-center">
                    <Image
                        src="/images/logo.png"
                        width={64}
                        height={64}
                        alt={`Logo ${APP_NAME}`}
                    />
                </div>
            </div>
            <div className="text-center">
                <h2 className="text-lg font-semibold text-white mb-2">
                    Chargement en cours...
                </h2>
                <p className="text-sm text-gray-400">
                    Préparation de votre dossier
                </p>
            </div>
            <div className="flex space-x-1 mt-4">
                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
        </div>
    )
}