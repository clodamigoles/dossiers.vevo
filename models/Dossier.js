import mongoose from 'mongoose'

const DossierSchema = new mongoose.Schema({
    // Référence à l'estimation
    estimationId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'EstimationVoiture', 
        required: true 
    },

    // Informations client
    client: {
        firstName: { type: String, required: true },
        lastName: { type: String, required: true },
        email: { type: String, required: true },
        phone: { type: String, required: true },
        address: {
            street: { type: String, required: true },
            city: { type: String, required: true },
            postalCode: { type: String, required: true },
            country: { type: String, default: 'France' }
        }
    },

    // Statut du dossier
    status: {
        type: String,
        enum: ['draft', 'active', 'documents_pending', 'ready_for_sale', 'in_negotiation', 'sold', 'cancelled'],
        default: 'draft'
    },

    // Documents uploadés
    documents: [{
        type: { 
            type: String, 
            enum: ['carte_grise', 'controle_technique', 'facture_entretien', 'assurance', 'autre'],
            required: true 
        },
        filename: { type: String, required: true },
        originalName: { type: String, required: true },
        uploadedAt: { type: Date, default: Date.now },
        verified: { type: Boolean, default: false },
        verifiedAt: { type: Date },
        verifiedBy: { type: String }
    }],

    // Messages/Communications
    messages: [{
        from: { 
            type: String, 
            enum: ['client', 'admin'],
            required: true 
        },
        message: { type: String, required: true },
        sentAt: { type: Date, default: Date.now },
        read: { type: Boolean, default: false },
        readAt: { type: Date },
        attachments: [{
            filename: { type: String },
            originalName: { type: String },
            uploadedAt: { type: Date, default: Date.now }
        }]
    }],

    // Informations de vente
    saleInfo: {
        proposedPrice: { type: Number },
        finalPrice: { type: Number },
        buyerInfo: {
            name: { type: String },
            email: { type: String },
            phone: { type: String }
        },
        saleDate: { type: Date },
        paymentMethod: { type: String },
        notes: { type: String }
    },

    // Notifications et rappels
    notifications: {
        emailSent: { type: Boolean, default: false },
        emailSentAt: { type: Date },
        reminderSent: { type: Boolean, default: false },
        reminderSentAt: { type: Date }
    },

    // Métadonnées
    lastActivity: { type: Date, default: Date.now },
    completedSteps: [{ 
        step: { type: String },
        completedAt: { type: Date }
    }],

    notes: { type: String }

}, {
    timestamps: true
})

// Index pour optimiser les requêtes
DossierSchema.index({ estimationId: 1 })
DossierSchema.index({ 'client.email': 1 })
DossierSchema.index({ status: 1, createdAt: -1 })
DossierSchema.index({ lastActivity: -1 })

// Méthodes utiles
DossierSchema.methods.addMessage = function(from, message, attachments = []) {
    this.messages.push({
        from,
        message,
        attachments
    })
    this.lastActivity = new Date()
    return this.save()
}

DossierSchema.methods.addDocument = function(type, filename, originalName) {
    this.documents.push({
        type,
        filename,
        originalName
    })
    this.lastActivity = new Date()
    return this.save()
}

DossierSchema.methods.updateStatus = function(newStatus) {
    this.status = newStatus
    this.lastActivity = new Date()
    return this.save()
}

DossierSchema.methods.markStepComplete = function(step) {
    const existingStep = this.completedSteps.find(s => s.step === step)
    if (!existingStep) {
        this.completedSteps.push({
            step,
            completedAt: new Date()
        })
    }
    this.lastActivity = new Date()
    return this.save()
}

export default mongoose.models.Dossier || mongoose.model('Dossier', DossierSchema)