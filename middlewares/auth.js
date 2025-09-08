import jwt from 'jsonwebtoken'
import User from '../models/User'
import dbConnect from '../lib/dbConnect'

// Middleware pour vérifier l'authentification
export const requireAuth = async (req, res, next) => {
    try {
        // Récupérer le token depuis les headers
        const authHeader = req.headers.authorization
        const token = authHeader && authHeader.startsWith('Bearer ') 
            ? authHeader.slice(7) 
            : req.body.token || req.query.token

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Token d\'authentification requis'
            })
        }

        // Vérifier le token
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        
        // Se connecter à la base de données
        await dbConnect()
        
        // Récupérer l'utilisateur
        const user = await User.findById(decoded.userId).select('-otpCode -otpExpiresAt -otpAttempts')
        
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Utilisateur non trouvé'
            })
        }

        if (!user.isActive) {
            return res.status(403).json({
                success: false,
                message: 'Compte désactivé'
            })
        }

        // Ajouter l'utilisateur à la requête
        req.user = user
        req.userId = user._id

        next()

    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Token invalide'
            })
        }
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token expiré'
            })
        }

        console.error('Erreur middleware auth:', error)
        return res.status(500).json({
            success: false,
            message: 'Erreur serveur d\'authentification'
        })
    }
}

// Middleware optionnel pour récupérer l'utilisateur si connecté
export const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization
        const token = authHeader && authHeader.startsWith('Bearer ') 
            ? authHeader.slice(7) 
            : req.body.token || req.query.token

        if (!token) {
            req.user = null
            req.userId = null
            return next()
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        
        await dbConnect()
        
        const user = await User.findById(decoded.userId).select('-otpCode -otpExpiresAt -otpAttempts')
        
        if (user && user.isActive) {
            req.user = user
            req.userId = user._id
        } else {
            req.user = null
            req.userId = null
        }

        next()

    } catch (error) {
        // En cas d'erreur, continuer sans utilisateur
        req.user = null
        req.userId = null
        next()
    }
}