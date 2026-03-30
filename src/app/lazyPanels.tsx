import { lazy } from 'react'

export const AssistantPanel = lazy(async () => {
  const m = await import('../assistant/AssistantPanel')
  return { default: m.AssistantPanel }
})
export const NetworkToolsPanel = lazy(async () => {
  const m = await import('../network/NetworkToolsPanel')
  return { default: m.NetworkToolsPanel }
})
export const WeatherPanel = lazy(async () => {
  const m = await import('../weather/WeatherPanel')
  return { default: m.WeatherPanel }
})
export const IrcDockPanel = lazy(async () => {
  const m = await import('../irc/IrcDockPanel')
  return { default: m.IrcDockPanel }
})
export const P2PLibraryPanel = lazy(async () => {
  const m = await import('../p2p/P2PLibraryPanel')
  return { default: m.P2PLibraryPanel }
})
export const AgentHubPanel = lazy(async () => {
  const m = await import('../design-panels/AgentHub')
  return { default: m.AgentHubPanel }
})
