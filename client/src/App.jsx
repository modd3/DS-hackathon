import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { RoleProvider } from './context/RoleContext.jsx'
import Dashboard from './pages/Dashboard.jsx'
import JourneyList from './pages/JourneyList.jsx'
import JourneyDetail from './pages/JourneyDetail.jsx'
import Incidents from './pages/Incidents.jsx'
import SystemHealth from './pages/SystemHealth.jsx'
import Analytics from './pages/Analytics.jsx'
import Admin from './pages/Admin.jsx'

function App() {
  return (
    <RoleProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/journeys" element={<JourneyList />} />
          <Route path="/journeys/:journeyId" element={<JourneyDetail />} />
          <Route path="/incidents" element={<Incidents />} />
          <Route path="/system" element={<SystemHealth />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </Router>
    </RoleProvider>
  )
}

export default App