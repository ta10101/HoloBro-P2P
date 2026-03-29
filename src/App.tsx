import { RootErrorBoundary } from './components/RootErrorBoundary'
import { AppShell } from './app/AppShell'

export default function App() {
  return (
    <RootErrorBoundary>
      <AppShell />
    </RootErrorBoundary>
  )
}
