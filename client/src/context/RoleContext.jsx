import React, { createContext, useContext, useState } from 'react'

export const ROLES = {
  ADMIN: {
    label: 'Admin',
    color: 'text-sky-400',
    permissions: ['journey.read','journey.update','sla.read','sla.manage','alerts.read','admin.users.manage','system.read'],
  },
  REGIONAL_MANAGER: {
    label: 'Regional Manager',
    color: 'text-amber-400',
    permissions: ['journey.read','sla.read','alerts.read'],
  },
  SALES_ENGINEER: {
    label: 'Sales Engineer',
    color: 'text-emerald-400',
    permissions: ['journey.read','journey.update'],
  },
  BACKEND_DESIGNER: {
    label: 'Backend Designer',
    color: 'text-purple-400',
    permissions: ['journey.read','journey.update','sla.read'],
  },
}

const RoleContext = createContext(null)

export function RoleProvider({ children }) {
  const [role, setRole] = useState('ADMIN')

  function can(permission) {
    return ROLES[role]?.permissions.includes(permission) ?? false
  }

  return (
    <RoleContext.Provider value={{ role, setRole, can, roleInfo: ROLES[role] }}>
      {children}
    </RoleContext.Provider>
  )
}

export function useRole() {
  return useContext(RoleContext)
}