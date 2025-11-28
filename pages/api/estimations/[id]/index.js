import dbConnect from '@/lib/mongodb'
import EstimationVoiture from '@/lib/estimation-model'

export default async function handler(req, res) {
    await dbConnect()
    const { id } = req.query

    try {
        const estimation = await EstimationVoiture.findById(id)
        
        if (!estimation) {
            return res.status(404).json({ 
                success: false,
                message: 'Estimation non trouvée' 
            })
        }

        return res.status(200).json({
            success: true,
            data: estimation
        })

    } catch (error) {
        console.error('Erreur API estimation:', error)
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}




