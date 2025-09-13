import mongoose from 'mongoose'

const DossierVenteSchema = new mongoose.Schema({
    // Référence à l'estimation originale
    estimationId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'EstimationVoiture',
        required: true 
    },
    
    // Informations du propriétaire
    owner: {
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

    // Photos de la voiture
    carPhotos: {
        exterior: [{ 
            url: { type: String, required: true },
            description: { type: String },
            uploadedAt: { type: Date, default: Date.now }
        }],
        interior: [{ 
            url: { type: String, required: true },
            description: { type: String },
            uploadedAt: { type: Date, default: Date.now }
        }],
        documents: [{ 
            url: { type: String, required: true },
            type: { type: String, enum: ['carte_grise', 'controle_technique', 'factures', 'other'] },
            description: { type: String },
            uploadedAt: { type: Date, default: Date.now }
        }]
    },

    // Informations de vente
    saleInfo: {
        askingPrice: { type: Number, required: true }, // Prix demandé par le propriétaire
        finalPrice: { type: Number }, // Prix final accepté
        negotiable: { type: Boolean, default: true },
        urgentSale: { type: Boolean, default: false },
        availableForViewing: { type: Boolean, default: true },
        preferredContactMethod: { 
            type: String, 
            enum: ['phone', 'email', 'both'],
            default: 'both'
        }
    },

    // Statut du dossier de vente
    status: {
        type: String,
        enum: [
            'draft',           // Brouillon
            'active',          // Actif - recherche d'acheteur
            'buyer_found',     // Acheteur trouvé
            'negotiating',     // En négociation
            'sold',            // Vendu
            'cancelled',       // Annulé
            'expired'          // Expiré
        ],
        default: 'draft'
    },

    // Étapes de recherche d'acheteur
    searchSteps: {
        onlineListingCreated: { 
            completed: { type: Boolean, default: false },
            completedAt: { type: Date },
            platforms: [{ type: String }] // leboncoin, autoscout24, etc.
        },
        professionalPhotos: {
            completed: { type: Boolean, default: false },
            completedAt: { type: Date },
            photographerId: { type: String }
        },
        marketingCampaign: {
            completed: { type: Boolean, default: false },
            completedAt: { type: Date },
            campaignType: { type: String }
        },
        buyerInterest: {
            totalInquiries: { type: Number, default: 0 },
            scheduledViewings: { type: Number, default: 0 },
            offers: [{
                buyerId: { type: String },
                amount: { type: Number },
                conditions: { type: String },
                status: { 
                    type: String, 
                    enum: ['pending', 'accepted', 'declined', 'countered'],
                    default: 'pending'
                },
                createdAt: { type: Date, default: Date.now }
            }]
        }
    },

    // Historique des communications
    communications: [{
        type: { 
            type: String, 
            enum: ['email', 'sms', 'phone', 'platform_message'],
            required: true 
        },
        direction: {
            type: String,
            enum: ['inbound', 'outbound'],
            required: true
        },
        subject: { type: String },
        content: { type: String },
        from: { type: String },
        to: { type: String },
        sentAt: { type: Date, default: Date.now },
        readAt: { type: Date },
        responseRequired: { type: Boolean, default: false }
    }],

    // Informations sur l'acheteur final
    buyer: {
        name: { type: String },
        email: { type: String },
        phone: { type: String },
        finalOffer: { type: Number },
        paymentMethod: { 
            type: String, 
            enum: ['cash', 'bank_transfer', 'check', 'financing'],
        },
        saleDate: { type: Date },
        contractSigned: { type: Boolean, default: false }
    },

    // Métadonnées
    metadata: {
        viewCount: { type: Number, default: 0 },
        favoriteCount: { type: Number, default: 0 },
        averageTimeOnListing: { type: Number }, // en secondes
        sourcePlatform: { type: String },
        conversionRate: { type: Number } // taux de conversion visiteurs -> acheteurs
    },

    // Dates importantes
    createdAt: { type: Date, default: Date.now },
    activatedAt: { type: Date },
    soldAt: { type: Date },
    expiresAt: { 
        type: Date,
        default: function() {
            const date = new Date();
            date.setMonth(date.getMonth() + 3); // Expire après 3 mois
            return date;
        }
    },

    // Notes internes
    internalNotes: [{ 
        content: { type: String },
        author: { type: String },
        createdAt: { type: Date, default: Date.now },
        private: { type: Boolean, default: true }
    }]
}, {
    timestamps: true
})

// Middleware pour gérer l'expiration
DossierVenteSchema.pre('save', function(next) {
    if (this.expiresAt && new Date() > this.expiresAt && this.status === 'active') {
        this.status = 'expired'
    }
    next()
})

// Méthodes du schéma
DossierVenteSchema.methods.activate = function() {
    this.status = 'active'
    this.activatedAt = new Date()
    return this.save()
}

DossierVenteSchema.methods.addCommunication = function(type, direction, content, from, to, subject = null) {
    this.communications.push({
        type,
        direction,
        content,
        from,
        to,
        subject
    })
    return this.save()
}

DossierVenteSchema.methods.addOffer = function(buyerId, amount, conditions = '') {
    this.searchSteps.buyerInterest.offers.push({
        buyerId,
        amount,
        conditions
    })
    this.searchSteps.buyerInterest.totalInquiries += 1
    return this.save()
}

DossierVenteSchema.methods.markAsSold = function(buyerInfo, finalPrice) {
    this.status = 'sold'
    this.soldAt = new Date()
    this.buyer = {
        ...buyerInfo,
        finalOffer: finalPrice,
        saleDate: new Date()
    }
    this.saleInfo.finalPrice = finalPrice
    return this.save()
}

DossierVenteSchema.methods.incrementViewCount = function() {
    this.metadata.viewCount += 1
    return this.save()
}

// Index pour les performances
DossierVenteSchema.index({ estimationId: 1 })
DossierVenteSchema.index({ status: 1 })
DossierVenteSchema.index({ 'owner.email': 1 })
DossierVenteSchema.index({ createdAt: -1 })
DossierVenteSchema.index({ expiresAt: 1 })

export default mongoose.models.DossierVente || mongoose.model('DossierVente', DossierVenteSchema)