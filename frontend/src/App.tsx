import React, { useState } from 'react';
import { ArrowRight, Search, FileText, CheckCircle } from 'lucide-react';
import { Button } from './components/ui/Button';
import { Card } from './components/ui/Card';
import { Input } from './components/ui/Input';

function App() {
  const [activeTab, setActiveTab] = useState<'student' | 'officer' | 'admin'>('student');

  return (
    <div className="min-h-screen bg-background text-foreground font-serif bg-texture-noise">
      
      {/* Navigation */}
      <nav className="rule-thin py-6 px-6 md:px-12 flex justify-between items-center sticky top-0 bg-background/95 backdrop-blur-sm z-50">
        <div className="font-display font-bold text-2xl tracking-tighter uppercase">
          TribalScholar
        </div>
        <div className="hidden md:flex gap-8 items-center font-mono text-sm tracking-widest uppercase">
          <a href="#schemes" className="hover:underline underline-offset-4 focus-visible:outline-none focus-visible:border-b-2 focus-visible:border-foreground">Schemes</a>
          <a href="#process" className="hover:underline underline-offset-4 focus-visible:outline-none focus-visible:border-b-2 focus-visible:border-foreground">Process</a>
          <a href="#stats" className="hover:underline underline-offset-4 focus-visible:outline-none focus-visible:border-b-2 focus-visible:border-foreground">Impact</a>
        </div>
        <Button variant="ghost" className="hidden md:flex">Sign In <ArrowRight className="ml-2 w-4 h-4" /></Button>
      </nav>

      {/* Hero Section */}
      <header className="px-6 md:px-12 py-24 md:py-40 bg-texture-horizontal relative">
        <div className="max-w-6xl mx-auto">
          <div className="w-16 h-16 border-4 border-foreground mb-12 flex items-center justify-center">
            <div className="w-4 h-4 bg-foreground"></div>
          </div>
          <h1 className="text-6xl md:text-8xl lg:text-9xl font-display leading-[0.85] tracking-tighter uppercase mb-8">
            Empowering <br />
            <span className="italic">Scholars.</span>
          </h1>
          <p className="text-xl md:text-3xl max-w-2xl leading-relaxed mb-12">
            The authoritative platform for tribal fellowship applications. Precision screening, definitive results.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button>Apply Now <ArrowRight className="ml-3 w-4 h-4" /></Button>
            <Button variant="secondary">View Fellowships</Button>
          </div>
        </div>
      </header>

      <div className="rule-thick"></div>

      {/* Editorial Content / Features */}
      <section id="process" className="px-6 md:px-12 py-24 md:py-32">
        <div className="max-w-6xl mx-auto grid md:grid-cols-12 gap-12">
          <div className="md:col-span-5">
            <h2 className="text-4xl md:text-5xl font-display uppercase tracking-tight mb-8">
              A System of <br/> Uncompromising <br/> Accuracy.
            </h2>
            <div className="w-full h-1 bg-foreground mb-8"></div>
            <p className="text-lg leading-relaxed mb-6 first-letter:text-6xl first-letter:font-display first-letter:float-left first-letter:mr-3 first-letter:mt-1 first-letter:leading-none">
              By replacing subjective manual checks with automated optical character recognition and cryptographic verification, TribalScholar removes the friction from fellowship distribution.
            </p>
            <p className="text-lg leading-relaxed">
              Every document is scanned, cross-referenced, and validated locally. No exceptions.
            </p>
          </div>
          
          <div className="md:col-span-7 grid sm:grid-cols-2 gap-8">
            <Card className="group hover:bg-foreground hover:text-background flex flex-col justify-between">
              <Search strokeWidth={1} className="w-12 h-12 mb-16" />
              <div>
                <h3 className="font-mono uppercase tracking-widest font-bold mb-4">Discovery</h3>
                <p className="text-mutedForeground group-hover:text-borderLight transition-colors">Find schemes perfectly tailored to your demographic and academic history.</p>
              </div>
            </Card>
            <Card className="group hover:bg-foreground hover:text-background flex flex-col justify-between">
              <FileText strokeWidth={1} className="w-12 h-12 mb-16" />
              <div>
                <h3 className="font-mono uppercase tracking-widest font-bold mb-4">Verification</h3>
                <p className="text-mutedForeground group-hover:text-borderLight transition-colors">Instant SC/ST certificate validation via state registries and local AI models.</p>
              </div>
            </Card>
            <Card className="group hover:bg-foreground hover:text-background flex flex-col justify-between sm:col-span-2">
              <CheckCircle strokeWidth={1} className="w-12 h-12 mb-16" />
              <div>
                <h3 className="font-mono uppercase tracking-widest font-bold mb-4">Disbursement</h3>
                <p className="text-mutedForeground group-hover:text-borderLight transition-colors">Approved applications flow directly into the disbursement ledger without human delay.</p>
              </div>
            </Card>
          </div>
        </div>
      </section>

      <div className="rule-ultra"></div>

      {/* Inverted Stats Section */}
      <section id="stats" className="bg-foreground text-background px-6 md:px-12 py-32 bg-[url('data:image/svg+xml,%3Csvg width=\'100%25\' height=\'100%25\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cdefs%3E%3Cpattern id=\'lines\' width=\'6\' height=\'6\' patternUnits=\'userSpaceOnUse\'%3E%3Cpath d=\'M 6 0 L 6 6 M 0 6 L 6 6\' fill=\'none\' stroke=\'%23ffffff\' stroke-width=\'0.5\' stroke-opacity=\'0.1\'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width=\'100%25\' height=\'100%25\' fill=\'url(%23lines)\'/%3E%3C/svg%3E')]">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-16 md:gap-8 text-center divide-y md:divide-y-0 md:divide-x divide-borderLight/30">
            <div className="pt-8 md:pt-0">
              <div className="text-7xl md:text-8xl font-display mb-4">48h</div>
              <div className="font-mono uppercase tracking-widest text-sm text-borderLight">Average Approval Time</div>
            </div>
            <div className="pt-8 md:pt-0">
              <div className="text-7xl md:text-8xl font-display mb-4">100%</div>
              <div className="font-mono uppercase tracking-widest text-sm text-borderLight">Audit Trail Precision</div>
            </div>
            <div className="pt-8 md:pt-0">
              <div className="text-7xl md:text-8xl font-display mb-4">₹2B+</div>
              <div className="font-mono uppercase tracking-widest text-sm text-borderLight">Funds Disbursed</div>
            </div>
          </div>
        </div>
      </section>

      <div className="rule-thick"></div>

      {/* Interactive Form Demo Area */}
      <section className="px-6 md:px-12 py-24 md:py-32 bg-texture-diagonal">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-4xl font-display uppercase tracking-tight mb-12 text-center">Eligibility Check</h2>
          <Card className="shadow-none bg-background">
            <form className="space-y-8" onSubmit={(e) => e.preventDefault()}>
              <Input label="Applicant Name" placeholder="Enter your full legal name" />
              <Input label="Certificate ID" placeholder="e.g. SC-2023-9981" />
              <div className="pt-4">
                <Button className="w-full">Validate Credentials</Button>
              </div>
            </form>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="rule-ultra py-12 px-6 md:px-12 bg-background text-center md:text-left">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="font-display font-bold text-xl uppercase tracking-widest">
            TribalScholar
          </div>
          <div className="flex gap-6 font-mono text-xs uppercase tracking-widest">
            <a href="#" className="hover:underline">Privacy Policy</a>
            <a href="#" className="hover:underline">Terms of Service</a>
            <a href="#" className="hover:underline">Contact</a>
          </div>
        </div>
      </footer>

    </div>
  );
}

export default App;
