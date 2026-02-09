import React, { createContext, useContext, useReducer, useEffect } from 'react'

const AgentContext = createContext(null)
const AgentDispatchContext = createContext(null)

function agentReducer(state, action) {
    switch (action.type) {
        case 'SET_SKILLS':
            return { ...state, skills: action.payload }
        case 'SET_AGENTS':
            return { ...state, agents: action.payload, loading: false }
        case 'ADD_AGENT':
            return { ...state, agents: [...state.agents, action.payload] }
        case 'UPDATE_AGENT':
            return {
                ...state,
                agents: state.agents.map(a =>
                    a.id === action.payload.id ? action.payload : a
                )
            }
        case 'DELETE_AGENT':
            return {
                ...state,
                agents: state.agents.filter(a => a.id !== action.payload)
            }
        case 'ADD_SKILL':
            return { ...state, skills: [...state.skills, action.payload] }
        case 'UPDATE_SKILL':
            return {
                ...state,
                skills: state.skills.map(s =>
                    s.id === action.payload.id ? action.payload : s
                )
            }
        case 'DELETE_SKILL':
            return {
                ...state,
                skills: state.skills.filter(s => s.id !== action.payload)
            }
        default:
            return state
    }
}

// API helper functions for skills
export const skillsApi = {
    async list() {
        const res = await fetch('/api/skills')
        if (!res.ok) throw new Error('Failed to fetch skills')
        const data = await res.json()
        return data.skills || []
    },
    async get(id) {
        const res = await fetch(`/api/skills/${id}`)
        if (!res.ok) throw new Error('Failed to fetch skill')
        return res.json()
    },
    async create(skill) {
        const res = await fetch('/api/skills', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(skill)
        })
        if (!res.ok) throw new Error('Failed to create skill')
        return res.json()
    },
    async update(id, skill) {
        const res = await fetch(`/api/skills/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(skill)
        })
        if (!res.ok) throw new Error('Failed to update skill')
        return res.json()
    },
    async delete(id) {
        const res = await fetch(`/api/skills/${id}`, { method: 'DELETE' })
        if (!res.ok) throw new Error('Failed to delete skill')
        return res.json()
    }
}

// API helper functions for agents
export const agentsApi = {
    async list() {
        const res = await fetch('/api/agents')
        if (!res.ok) throw new Error('Failed to fetch agents')
        const data = await res.json()
        return data.agents || []
    },
    async get(id) {
        const res = await fetch(`/api/agents/${id}`)
        if (!res.ok) throw new Error('Failed to fetch agent')
        return res.json()
    },
    async create(agent) {
        const res = await fetch('/api/agents', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(agent)
        })
        if (!res.ok) throw new Error('Failed to create agent')
        return res.json()
    },
    async update(id, agent) {
        const res = await fetch(`/api/agents/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(agent)
        })
        if (!res.ok) throw new Error('Failed to update agent')
        return res.json()
    },
    async delete(id) {
        const res = await fetch(`/api/agents/${id}`, { method: 'DELETE' })
        if (!res.ok) throw new Error('Failed to delete agent')
        return res.json()
    }
}

export function AgentProvider({ children }) {
    const [state, dispatch] = useReducer(agentReducer, {
        agents: [],
        skills: [],
        loading: true
    })

    // Load agents and skills from backend API
    useEffect(() => {
        Promise.all([
            agentsApi.list(),
            skillsApi.list()
        ])
            .then(([agents, skills]) => {
                dispatch({ type: 'SET_AGENTS', payload: agents })
                dispatch({ type: 'SET_SKILLS', payload: skills })
            })
            .catch(err => {
                console.error('Failed to load data from API:', err)
                dispatch({ type: 'SET_AGENTS', payload: [] })
                dispatch({ type: 'SET_SKILLS', payload: [] })
            })
    }, [])

    return (
        <AgentContext.Provider value={state}>
            <AgentDispatchContext.Provider value={dispatch}>
                {children}
            </AgentDispatchContext.Provider>
        </AgentContext.Provider>
    )
}

export function useAgents() {
    return useContext(AgentContext)
}

export function useAgentDispatch() {
    return useContext(AgentDispatchContext)
}
