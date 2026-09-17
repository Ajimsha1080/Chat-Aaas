import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ChatWidget } from '../components/widget/ChatWidget'

const mockWidgetContext = {
  currentCompany: {
    id: 'comp-test-widget',
    name: 'Widget Test Co',
    agent: {
      name: 'SupportBot',
      role: 'Support Specialist',
      greetingMessage: 'Hello! How can I help you today?',
      avatarUrl: 'https://example.com/avatar.png'
    },
    widgetSettings: {
      themeMode: 'light',
      primaryColor: '#4f46e5',
      position: 'bottom-right'
    }
  },
  knowledgeItems: [],
  integrations: [],
  actions: []
}

vi.mock('../context', () => ({
  useApp: () => mockWidgetContext
}))

vi.mock('../context/useApp', () => ({
  useApp: () => mockWidgetContext
}))

vi.mock('../services/soundService', () => ({
  soundService: {
    playMessageSound: vi.fn(),
    playPopupSound: vi.fn()
  }
}))

vi.mock('../services/aiEngine', () => ({
  AIAgentEngine: {
    processMessage: vi.fn().mockResolvedValue({
      message: 'This is an AI generated response.',
      reasoningSteps: [],
      toolTraces: []
    })
  }
}))

describe('ChatWidget UI Component', () => {
  it('renders greeting message when widget is loaded in inline preview mode', () => {
    render(<ChatWidget isInlinePreview={true} />)
    expect(screen.getByText('Hello! How can I help you today?')).toBeInTheDocument()
  })

  it('submits a user message and receives AI response', async () => {
    render(<ChatWidget isInlinePreview={true} />)

    const input = screen.getByPlaceholderText(/Ask anything/i)
    fireEvent.change(input, { target: { value: 'How do I reset my password?' } })

    const form = input.closest('form')!
    fireEvent.submit(form)

    expect(screen.getByText('How do I reset my password?')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('This is an AI generated response.')).toBeInTheDocument()
    })
  })
})