// Générer un code aléatoire de 6 chiffres
export function generateAuthCode() {
    return Math.floor(100000 + Math.random() * 900000).toString()
}

// Générer un token de session sécurisé
export function generateSessionToken() {
    const crypto = require('crypto')
    return crypto.randomBytes(32).toString('hex')
}

// Créer un cookie de session (format pour Set-Cookie header)
export function createSessionCookie(token) {
    const maxAge = 60 * 60 * 24 * 365 * 10 // 10 ans (connexion indéfinie)
    // En production, utiliser Secure (HTTPS uniquement)
    // En développement, ne pas utiliser Secure pour permettre HTTP
    const secure = process.env.NODE_ENV === 'production' ? 'Secure;' : ''
    // Path=/ pour que le cookie soit accessible sur tout le site
    // SameSite=Lax pour permettre les requêtes cross-site (comme les redirections)
    return `dossiers_session=${token}; HttpOnly; ${secure} SameSite=Lax; Max-Age=${maxAge}; Path=/;`
}

// Supprimer le cookie de session
export function deleteSessionCookie() {
    return 'dossiers_session=; HttpOnly; SameSite=Lax; Max-Age=0; Path=/'
}

// Parser les cookies
export function parseCookies(req) {
    if (!req || !req.headers) {
        return {}
    }
    
    if (req.headers.cookie) {
        const cookies = {}
        // Gérer les cookies séparés par ';'
        req.headers.cookie.split(';').forEach(cookie => {
            const trimmed = cookie.trim()
            if (trimmed) {
                const [name, ...rest] = trimmed.split('=')
                if (name) {
                    // Décoder la valeur du cookie (au cas où elle serait encodée)
                    cookies[name.trim()] = decodeURIComponent(rest.join('=') || '')
                }
            }
        })
        return cookies
    }
    return {}
}

