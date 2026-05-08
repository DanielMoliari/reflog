'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:17642'

const COMPARE_ROWS = [
  { label: 'Repositories tracked',  free: '5',       pro: 'Unlimited' },
  { label: 'Commit history',        free: '30 days', pro: 'All time'  },
  { label: 'Real-time sync',        free: false,     pro: true        },
  { label: 'Advanced analytics',    free: false,     pro: true        },
  { label: 'API access',            free: false,     pro: true        },
  { label: 'Public profile & card', free: true,      pro: true        },
  { label: 'Weekly digest email',   free: true,      pro: true        },
  { label: 'Priority support',      free: false,     pro: true        },
]

const FREE_FEATURES  = ['5 tracked repositories', '30-day history', 'Public profile & card', 'Weekly digest email']
const FREE_LOCKED    = ['Real-time sync', 'Advanced analytics', 'API access', 'Priority support']
const PRO_FEATURES   = ['Unlimited repositories', 'Full commit history', 'Real-time sync', 'Advanced analytics', 'API access', 'Priority support', 'Public profile & card', 'Weekly digest email']

export function PricingSection() {
  const [annual, setAnnual] = useState(false)

  const monthlyPrice = 8
  const annualMonthly = 6
  const annualTotal = annualMonthly * 12

  return (
    <section id="pricing" className="px-6 py-28">
      <div className="mx-auto max-w-3xl">
        <div className="mb-12 text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-cyan-400">Pricing</p>
          <h2 className="text-4xl font-bold tracking-tight">Simple, transparent pricing</h2>
          <p className="mt-4 text-slate-500">Start free. Upgrade when you need more.</p>

          {/* Billing toggle */}
          <div className="mt-8 inline-flex items-center gap-3 rounded-full border border-border bg-surface p-1">
            <button
              onClick={() => setAnnual(false)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                !annual ? 'bg-surface-2 text-slate-100' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                annual ? 'bg-surface-2 text-slate-100' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              Annual
              <span className="rounded-full bg-cyan-500/15 px-2 py-0.5 text-[10px] font-bold text-cyan-400">
                SAVE 25%
              </span>
            </button>
          </div>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 items-stretch">
          {/* Free card */}
          <div className="relative flex flex-col rounded-2xl border border-border bg-surface p-7">
            <div className="mb-5">
              <h3 className="text-base font-bold text-slate-300">Free</h3>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="tabular text-4xl font-black text-slate-100">$0</span>
              </div>
              <p className="mt-1 text-xs text-slate-600">No credit card required</p>
            </div>
            <ul className="mb-6 space-y-2.5">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-sm text-slate-400">
                  <Check className="h-3.5 w-3.5 shrink-0 text-slate-600" />
                  {f}
                </li>
              ))}
              {FREE_LOCKED.map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-sm text-slate-700 line-through decoration-slate-800">
                  <span className="h-3.5 w-3.5 shrink-0 text-center text-slate-800 leading-none">—</span>
                  {f}
                </li>
              ))}
            </ul>
            <Button asChild variant="outline" className="mt-auto w-full">
              <a href={`${API_URL}/api/v1/auth/github`}>Get started free</a>
            </Button>
          </div>

          {/* Pro card */}
          <div className="relative flex flex-col rounded-2xl border border-cyan-500/40 bg-gradient-to-b from-cyan-500/10 to-bg p-7">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-cyan-500 px-3 py-0.5 text-[11px] font-bold text-black tracking-wide">
              MOST POPULAR
            </div>
            <div className="mb-5">
              <h3 className="text-base font-bold text-slate-300">Pro</h3>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="tabular text-4xl font-black text-slate-100">
                  ${annual ? annualMonthly : monthlyPrice}
                </span>
                <span className="text-slate-500">/mo</span>
              </div>
              {annual ? (
                <p className="mt-1 text-xs text-cyan-500">
                  Billed ${annualTotal}/yr — you save $24
                </p>
              ) : (
                <p className="mt-1 text-xs text-slate-600">
                  Or ${annualMonthly}/mo billed annually
                </p>
              )}
            </div>
            <ul className="mb-6 space-y-2.5">
              {PRO_FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-sm text-slate-300">
                  <Check className="h-3.5 w-3.5 shrink-0 text-cyan-400" />
                  {f}
                </li>
              ))}
            </ul>
            <Button asChild className="mt-auto w-full">
              <a href={`${API_URL}/api/v1/auth/github`}>
                {annual ? `Get Pro — $${annualTotal}/yr` : 'Get started'}
              </a>
            </Button>
          </div>
        </div>

        {/* Comparison table */}
        <div className="mt-10 overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-2">
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-widest text-slate-500">Feature</th>
                <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-widest text-slate-500">Free</th>
                <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-widest text-cyan-400">Pro</th>
              </tr>
            </thead>
            <tbody>
              {COMPARE_ROWS.map(({ label, free, pro }, i) => (
                <tr key={label} className={`border-b border-border last:border-0 ${i % 2 === 0 ? 'bg-surface' : 'bg-surface-2/50'}`}>
                  <td className="px-5 py-3 text-slate-400">{label}</td>
                  <td className="px-5 py-3 text-center">
                    {typeof free === 'boolean' ? (
                      free
                        ? <Check className="mx-auto h-4 w-4 text-slate-500" />
                        : <span className="text-slate-700">—</span>
                    ) : (
                      <span className="text-slate-500">{free}</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-center">
                    {typeof pro === 'boolean' ? (
                      pro
                        ? <Check className="mx-auto h-4 w-4 text-cyan-400" />
                        : <span className="text-slate-700">—</span>
                    ) : (
                      <span className="font-medium text-cyan-400">{pro}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
