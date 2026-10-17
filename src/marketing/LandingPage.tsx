import { MarketingNav } from './components/MarketingNav'
import { HeroSection } from './components/HeroSection'
import { ProblemSolution } from './components/ProblemSolution'
import { HowItWorks } from './components/HowItWorks'
import { ProductDemo } from './components/ProductDemo'
import { Architecture } from './components/Architecture'
import { BuiltOnArc } from './components/BuiltOnArc'
import { FinalCta } from './components/FinalCta'
import { MarketingFooter } from './components/MarketingFooter'

export function LandingPage() {
  return (
    <div id="top" className="min-h-dvh" style={{ background: 'var(--bg)' }}>
      <MarketingNav />
      <main>
        <HeroSection />
        <ProblemSolution />
        <HowItWorks />
        <ProductDemo />
        <Architecture />
        <BuiltOnArc />
        <FinalCta />
      </main>
      <MarketingFooter />
    </div>
  )
}
