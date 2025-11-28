import mongoose from 'mongoose'

const EstimationVoitureSchema = new mongoose.Schema({
    brand: { type: String, required: true },
    model: { type: String, required: true },
    year: { type: Number, required: true },
    bodyType: { type: String, required: true },
    fuelType: { type: String, required: true },
    horsepower: { type: Number, required: true },
    transmission: { type: String, required: true },
    doors: { type: String, required: true },
    mileage: { type: Number, required: true },

    sellingTimeframe: { type: String, required: true },
    buyerPreference: { type: String, required: true },
    email: { type: String, required: true },

    status: { 
        type: String, 
        enum: ['step1', 'step2', 'step3', 'pending', 'analyzed', 'sent', 'accepted', 'completed', 'expired'], 
        default: 'step1' 
    },

    additionalInfo: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },

    emailsSent: { type: Boolean, default: false },
    emailsSentAt: { type: Date },
    clientEmailId: { type: String },
    adminEmailId: { type: String },

    finalEstimation: {
        amount: { type: Number },
        details: { type: String },
        sentAt: { type: Date },
        sentBy: { type: String }
    },

    adminEstimation: {
        finalPrice: { type: Number },
        message: { type: String },
        conditions: { type: String },
        sentAt: { type: Date },
        clientResponse: { 
            type: String, 
            enum: ['pending', 'accepted', 'declined'],
            default: 'pending'
        },
        responseAt: { type: Date },
        validUntil: { type: Date },
        reminderSent: { type: Boolean, default: false },
        reminderSentAt: { type: Date }
    },

    saleStatus: {
        type: String,
        enum: ['not_started', 'in_progress', 'photos_uploaded', 'under_review', 'approved', 'completed', 'paid', 'cancelled'],
        default: 'not_started'
    },

    payment: {
        feesPaid: { type: Boolean, default: false },
        feesAmount: { type: Number },
        feesPaidAt: { type: Date },
        paymentMethod: { type: String },
        paymentId: { type: String },
        paymentDetails: { type: mongoose.Schema.Types.Mixed }
    },

    vehiclePhotos: {
        interior: {
            type: [String],
            default: []
        },
        exterior: {
            type: [String],
            default: []
        },
        uploadedAt: { type: Date },
        reviewedAt: { type: Date },
        reviewStatus: {
            type: String,
            enum: ['pending', 'approved', 'rejected'],
            default: 'pending'
        },
        reviewNotes: { type: String }
    },

    emailHistory: {
        type: [{
            type: { 
                type: String, 
                enum: ['estimation', 'reminder', 'sale_update', 'custom'],
                required: true 
            },
            sentAt: { type: Date, default: Date.now },
            subject: { type: String },
            success: { type: Boolean, default: false },
            errorMessage: { type: String },
            messageId: { type: String }
        }],
        default: []
    },

    notes: { type: String },

    isExpired: {
        type: Boolean,
        default: false
    },
    daysRemaining: {
        type: Number,
        default: 7
    }
}, {
    timestamps: true
})

EstimationVoitureSchema.pre('save', function(next) {
    // Initialiser emailHistory si nécessaire
    if (!this.emailHistory || !Array.isArray(this.emailHistory)) {
        this.emailHistory = []
    }

    if (this.adminEstimation?.sentAt && !this.adminEstimation?.validUntil) {
        this.adminEstimation.validUntil = new Date(this.adminEstimation.sentAt)
        this.adminEstimation.validUntil.setDate(this.adminEstimation.validUntil.getDate() + 7)
    }

    if (this.adminEstimation?.validUntil) {
        const now = new Date()
        this.isExpired = now > this.adminEstimation.validUntil
        
        if (!this.isExpired) {
            const diffTime = this.adminEstimation.validUntil - now
            this.daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        } else {
            this.daysRemaining = 0
            if (this.status === 'sent' && this.adminEstimation.clientResponse === 'pending') {
                this.status = 'expired'
            }
        }
    }

    next()
})

EstimationVoitureSchema.methods.addEmailToHistory = function(type, subject, success, errorMessage = null, messageId = null) {
    this.emailHistory.push({
        type,
        subject,
        success,
        errorMessage,
        messageId
    })
    return this.save()
}

EstimationVoitureSchema.methods.setAdminEstimation = function(finalPrice, message, conditions = '') {
    this.adminEstimation = {
        finalPrice,
        message,
        conditions,
        sentAt: new Date(),
        clientResponse: 'pending'
    }
    this.status = 'sent'
    return this.save()
}

EstimationVoitureSchema.methods.acceptEstimation = function() {
    this.adminEstimation.clientResponse = 'accepted'
    this.adminEstimation.responseAt = new Date()
    this.status = 'accepted'
    this.saleStatus = 'in_progress'
    return this.save()
}

EstimationVoitureSchema.methods.declineEstimation = function() {
    this.adminEstimation.clientResponse = 'declined'
    this.adminEstimation.responseAt = new Date()
    this.status = 'completed'
    return this.save()
}

EstimationVoitureSchema.index({ status: 1, createdAt: -1 })
EstimationVoitureSchema.index({ email: 1 })
EstimationVoitureSchema.index({ 'adminEstimation.validUntil': 1 })

export default mongoose.models.EstimationVoiture || mongoose.model('EstimationVoiture', EstimationVoitureSchema)

