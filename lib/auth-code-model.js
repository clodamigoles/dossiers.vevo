import mongoose from 'mongoose'

const AuthCodeSchema = new mongoose.Schema({
    estimationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'EstimationVoiture',
        required: true,
        index: true
    },
    email: {
        type: String,
        required: true,
        index: true
    },
    code: {
        type: String,
        required: true
    },
    expiresAt: {
        type: Date,
        required: true,
        index: { expireAfterSeconds: 0 } // Auto-suppression après expiration
    },
    used: {
        type: Boolean,
        default: false
    },
    usedAt: {
        type: Date
    },
    sessionToken: {
        type: String,
        unique: true,
        sparse: true
    }
}, {
    timestamps: true
})

// Index pour la recherche rapide
AuthCodeSchema.index({ estimationId: 1, email: 1, code: 1 })
AuthCodeSchema.index({ sessionToken: 1 })

export default mongoose.models.AuthCode || mongoose.model('AuthCode', AuthCodeSchema)



