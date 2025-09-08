import React, { createContext, useState, useContext, useEffect } from 'react'

import userServices from '@/services/userService'

const UserContext = createContext()

export const useUser= () => useContext(UserContext)

export const UserProvider = ({ children }) => {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)
    const [mounted, setMounted] = useState(false)

    const login = (userData) => {
        setUser(userData)
        localStorage.setItem('token', userData.token)
    }

    const logout = () => {
        setUser(null)
        localStorage.removeItem('token')
    }

    const verifyToken = async (token) => {
        try {
            setLoading(true)
            const response = await userServices.getUserInfos(token)
            
            if (response.status === 200 && response.data.message === "200") {
                setUser(response.data.user)
            } else {
                setUser(null)
            }
        } catch (error) {
            console.error('Erreur de vérification du token', error)
            setUser(null)
        } finally {
            setLoading(false)
            setMounted(true)
        }
    }

    useEffect(() => {
        const fetchToken = () => {
            const token = localStorage.getItem('token')
            if (token) {
                verifyToken(token)
            } else {
                setLoading(false)
                setMounted(true)
            }
        }
        fetchToken()
    }, [])

    return (
        <UserContext.Provider value={{ user, setUser, login, logout, loading, mounted }}>
            {children}
        </UserContext.Provider>
    )
}