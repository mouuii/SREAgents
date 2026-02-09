import { Routes, Route } from 'react-router-dom'
import Sidebar from './components/Layout/Sidebar'
import AgentList from './pages/AgentList'
import AgentEdit from './pages/AgentEdit'
import AgentChat from './pages/AgentChat'
import SkillList from './pages/SkillList'
import SkillEdit from './pages/SkillEdit'
import { AgentProvider } from './context/AgentContext'

function App() {
  return (
    <AgentProvider>
      <div className="app-layout">
        <Sidebar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<AgentList />} />
            <Route path="/agents/new" element={<AgentEdit />} />
            <Route path="/agents/:id" element={<AgentEdit />} />
            <Route path="/agents/:id/chat" element={<AgentChat />} />
            <Route path="/skills" element={<SkillList />} />
            <Route path="/skills/new" element={<SkillEdit />} />
            <Route path="/skills/:id" element={<SkillEdit />} />
          </Routes>
        </main>
      </div>
    </AgentProvider>
  )
}

export default App
