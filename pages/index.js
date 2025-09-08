import React, { useEffect } from 'react'
import { useRouter } from 'next/router'

import { useUser } from '@/contexts/UserContext'
import Loading from '@/components/UI/Loading'
import Dashboard from '@/components/Pages/Dashboard'

const Home = () => {
    const { loading, mounted, user } = useUser()
    const router = useRouter()

    useEffect(() => {
        if (mounted && !user && !loading) {
            router.push('/login')
        }
    }, [mounted, user, loading, router])

    const Navigator = () => {
        if (!mounted) return null
        return user ? <Dashboard /> : null
    }

    return (
        <>
            {loading ? <Loading /> : <Navigator />}
        </>
    )
}

export default Home