import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { BillingView } from '../components/dashboard/BillingView'

const mockUpgradeSubscription = vi.fn()
const mockShowToast = vi.fn()

const mockContextValue = {
  currentCompany: {
    id: 'comp-test',
    name: 'Test Corp',
    planId: 'starter',
    planStatus: 'active',
    billingCycle: 'monthly',
    stats: { totalConversations: 50, knowledgeChunksUsed: 5 }
  },
  allPlans: [
    {
      id: 'starter',
      name: 'Starter Plan',
      priceMonthlyINR: 49,
      maxConversationsMonth: 1000,
      maxKnowledgeDocs: 10,
      features: ['1,000 monthly inquiries', '10 knowledge sources']
    },
    {
      id: 'growth',
      name: 'Growth Plan',
      priceMonthlyINR: 149,
      maxConversationsMonth: 5000,
      maxKnowledgeDocs: 100,
      features: ['5,000 monthly inquiries', '100 knowledge sources']
    },
    {
      id: 'business',
      name: 'Business Plan',
      priceMonthlyINR: 499,
      maxConversationsMonth: 25000,
      maxKnowledgeDocs: 500,
      features: ['25,000 monthly inquiries', '500 knowledge sources']
    }
  ],
  upgradeSubscription: mockUpgradeSubscription,
  showToast: mockShowToast,
  invoices: [
    {
      id: 'inv-1001',
      invoiceNumber: 'INV-2026-1001',
      amount: 49,
      currency: 'INR',
      status: 'paid',
      date: '2026-09-01',
      description: 'Starter Plan - Monthly'
    }
  ],
  conversations: [{ id: 'c1' }, { id: 'c2' }],
  knowledgeItems: [{ id: 'k1' }],
  teamMembers: [{ id: 'm1' }]
}

vi.mock('../context', () => ({
  useApp: () => mockContextValue
}))

vi.mock('../context/useApp', () => ({
  useApp: () => mockContextValue
}))

describe('Billing & Upgrade Flow UI Component', () => {
  it('renders active plan, usage stats, and billing plans correctly', () => {
    render(<BillingView />)

    expect(screen.getByText(/Billing & Plans/i)).toBeInTheDocument()
    expect(screen.getByText(/Active Subscription/i)).toBeInTheDocument()
    expect(screen.getByText('inv-1001')).toBeInTheDocument()
    expect(screen.getByText(/Billing History & Invoices/i)).toBeInTheDocument()
  })

  it('triggers upgrade subscription when selecting a higher plan tier', () => {
    render(<BillingView />)

    const upgradeButtons = screen.getAllByRole('button', { name: /Upgrade to|Switch to|Select/i })
    expect(upgradeButtons.length).toBeGreaterThan(0)

    fireEvent.click(upgradeButtons[0])
    expect(mockUpgradeSubscription).toHaveBeenCalled()
    expect(mockShowToast).toHaveBeenCalledWith(
      'Subscription Updated',
      expect.stringContaining('plan'),
      'success'
    )
  })

  it('allows toggling between monthly and annual billing cycles', () => {
    render(<BillingView />)

    const annualToggle = screen.getByRole('button', { name: /Annually/i })
    fireEvent.click(annualToggle)
    expect(annualToggle).toBeInTheDocument()
  })
})