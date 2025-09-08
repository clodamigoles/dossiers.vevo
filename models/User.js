import mongoose from 'mongoose'

const UserSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    firstName: {
        type: String,
        trim: true
    },
    lastName: {
        type: String,
        trim: true
    },
    phone: {
        type: String,
        trim: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    lastLoginAt: {
        type: Date
    },
    
    // Code OTP pour connexion
    otpCode: {
        type: String
    },
    otpExpiresAt: {
        type: Date
    },
    otpAttempts: {
        type: Number,
        default: 0
    },
    loginHistory: [{
        loginAt: { type: Date, default: Date.now },
        ipAddress: { type: String },
        userAgent: { type: String },
        success: { type: Boolean, default: true }
    }],
    createdFrom: {
        type: String,
        enum: ['estimation', 'dossier', 'manual'],
        default: 'estimation'
    },
    preferences: {
        emailNotifications: { type: Boolean, default: true },
        smsNotifications: { type: Boolean, default: false }
    }

}, {
    timestamps: true
})

UserSchema.index({ email: 1 })
UserSchema.index({ otpCode: 1, otpExpiresAt: 1 })

UserSchema.methods.generateOTP = function() {
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString()
    
    this.otpCode = otpCode
    this.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000)
    this.otpAttempts = 0
    
    return otpCode
}

UserSchema.methods.verifyOTP = function(code) {
    if (new Date() > this.otpExpiresAt) {
        return { success: false, message: 'Code expiré' }
    }

    if (this.otpAttempts >= 5) {
        return { success: false, message: 'Trop de tentatives, demandez un nouveau code' }
    }
    
    if (this.otpCode !== code) {
        this.otpAttempts += 1
        return { success: false, message: 'Code incorrect' }
    }
    
    this.otpCode = undefined
    this.otpExpiresAt = undefined
    this.otpAttempts = 0
    this.lastLoginAt = new Date()
    
    return { success: true, message: 'Code validé' }
}

UserSchema.methods.addLoginHistory = function(ipAddress, userAgent, success = true) {
    this.loginHistory.push({
        ipAddress,
        userAgent,
        success
    })
    
    if (this.loginHistory.length > 50) {
        this.loginHistory = this.loginHistory.slice(-50)
    }
    
    return this.save()
}

UserSchema.methods.isOTPValid = function() {
    return this.otpCode && this.otpExpiresAt && new Date() < this.otpExpiresAt
}

export default mongoose.models.User || mongoose.model('User', UserSchema)