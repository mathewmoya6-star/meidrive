import { useEffect, useState } from 'react'
import { supabase, getSession, getProfile } from '../lib/supabaseClient'

export const useAuth = () => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let mounted = true
    let authSubscription = null

    const loadUser = async () => {
      try {
        const { data: { session }, error: sessionError } = await getSession()
        
        if (sessionError) throw sessionError
        
        if (mounted) {
          setUser(session?.user || null)
          
          if (session?.user) {
            const { data: profileData, error: profileError } = await getProfile(session.user.id)
            if (!profileError && profileData) {
              setProfile(profileData)
            }
          } else {
            setProfile(null)
          }
        }
      } catch (err) {
        console.error('Auth error:', err)
        if (mounted) setError(err.message)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    loadUser()

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (mounted) {
        setUser(session?.user || null)
        
        if (session?.user) {
          const { data: profileData } = await getProfile(session.user.id)
          setProfile(profileData || null)
        } else {
          setProfile(null)
        }
        setLoading(false)
      }
    })

    authSubscription = subscription

    return () => {
      mounted = false
      if (authSubscription) {
        authSubscription.unsubscribe()
      }
    }
  }, [])

  const signIn = async (email, password) => {
    setError(null)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    return { data, error }
  }

  const signUp = async (email, password, fullName) => {
    setError(null)
    const { data, error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: { data: { full_name: fullName } }
    })
    if (error) setError(error.message)
    return { data, error }
  }

  const signOut = async () => {
    setError(null)
    const { error } = await supabase.auth.signOut()
    if (error) setError(error.message)
    return { error }
  }

  return { user, profile, loading, error, signIn, signUp, signOut }
}
