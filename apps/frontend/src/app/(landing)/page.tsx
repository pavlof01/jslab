import { PiBracketsCurlyBold } from "react-icons/pi";
import { FaProjectDiagram } from "react-icons/fa";
import { FaRegCirclePlay, FaBolt } from "react-icons/fa6";
import { MdOutlineAccountCircle, MdMailOutline } from "react-icons/md";
import Logo from "@/components/Logo";
import { Button } from "@chakra-ui/react";
import { BsRocketTakeoff } from "react-icons/bs";
import Link from "next/link";

const MY_GH = "https://github.com/pavlof01";

export default function LandingPage() {
  return (
    <section className="bg-background-light dark:bg-background-dark text-background-dark dark:text-white antialiased">
      <main>
        <section className="relative overflow-hidden pt-14 pb-16 px-5 sm:px-6 md:px-20 text-center">
          <div className="max-w-4xl mx-auto flex flex-col items-center gap-10">
            <h1 className="text-6xl md:text-8xl font-extrabold leading-[1.05] tracking-tight">
              Understand the Engine. <br />
              <span className="text-primary">Explore the Spec.</span>
            </h1>
            <div className="flex flex-col items-center gap-6">
              <Button
                asChild
                colorPalette="brand"
                variant="solid"
                fontWeight="700"
                rounded="2xl"
                size="2xl"
                fontSize="xl"
              >
                <Link href="/playground">
                  Get Started Free <BsRocketTakeoff className="text-sm" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
        <section className="py-16 px-6 md:px-20 border-t border-white/5 bg-background-dark/30">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-primary text-xs font-bold uppercase tracking-[0.3em] mb-4">The Methodology</h2>
              <h3 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">From Spec Text to Visual Flow</h3>
              <p className="text-white/60 max-w-2xl mx-auto text-base leading-relaxed">
                We transform complex ECMAScript prose into executable models that reveal internal JavaScript behavior.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6 relative">
              <div className="flex flex-col p-8 rounded-2xl bg-white/[0.02] border border-white/10 group hover:border-primary/30 transition-colors">
                <div className="size-12 bg-primary/10 rounded-xl flex items-center justify-center mb-6 text-primary">
                  <PiBracketsCurlyBold className="text-2xl" />
                </div>
                <h4 className="text-lg font-bold mb-2">1. Specification Parsing</h4>
                <p className="text-white/60 text-sm leading-relaxed mb-6">
                  Automated ingestion of ECMA-262 standards into machine-readable data structures.
                </p>
              </div>
              <div className="flex flex-col p-8 rounded-2xl bg-white/[0.02] border border-white/10 group hover:border-primary/30 transition-colors">
                <div className="size-12 bg-primary/10 rounded-xl flex items-center justify-center mb-6 text-primary">
                  <FaProjectDiagram className="text-2xl" />
                </div>
                <h4 className="text-lg font-bold mb-2">2. Logic Mapping</h4>
                <p className="text-white/60 text-sm leading-relaxed mb-6">
                  Translating abstract prose into high-fidelity reactive flowcharts and state machines.
                </p>
              </div>
              <div className="flex flex-col p-8 rounded-2xl bg-white/[0.02] border border-white/10 group hover:border-primary/30 transition-colors">
                <div className="size-12 bg-primary/10 rounded-xl flex items-center justify-center mb-6 text-primary">
                  <FaRegCirclePlay className="text-2xl" />
                </div>
                <h4 className="text-lg font-bold mb-2">3. Runtime Tracing</h4>
                <p className="text-white/60 text-sm leading-relaxed mb-6">
                  Real-time tracking of internal method calls, environment records, and memory states.
                </p>
              </div>
            </div>
          </div>
        </section>
        <section className="py-20 px-6 md:px-20">
          <div className="max-w-4xl mx-auto bg-primary rounded-[2.5rem] p-12 md:p-16 text-center text-background-dark shadow-[0_30px_60px_-15px_rgba(249,227,26,0.3)]">
            <h2 className="text-4xl md:text-5xl font-extrabold mb-6 leading-tight tracking-tight">
              Ready to debug the specification?
            </h2>
            <p className="text-lg font-semibold mb-10 opacity-70 max-w-xl mx-auto">
              Join developers and engine contributors using JSLab to master the language.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                asChild
                colorPalette="brand"
                variant="solid"
                bgColor="black"
                color="white"
                rounded="2xl"
                size="2xl"
                fontSize="xl"
              >
                <Link href="/abstract-functions-visualizer">
                  Launch Explorer <FaBolt />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <footer className="bg-background-dark border-t border-white/5 pt-16 pb-10 px-6 md:px-20">
        <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-12 mb-16">
          <div className="md:col-span-2">
            <div className="w-auto mb-6">
              <Logo />
            </div>
            <p className="text-white/40 text-sm max-w-sm leading-relaxed mb-8">
              An open-source project dedicated to making the ECMAScript standard accessible to every developer.
            </p>
            <div className="flex gap-6">
              <a
                className="text-white/40 hover:text-primary transition-colors"
                href={MY_GH}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MdOutlineAccountCircle className="text-2xl" />
              </a>
              <a className="text-white/40 hover:text-primary transition-colors" href="mailto:pavlof01@gmail.com">
                <MdMailOutline className="text-2xl" />
              </a>
            </div>
          </div>
          <div>
            <h5 className="font-extrabold mb-6 text-sm uppercase tracking-widest text-primary/80">Platform</h5>
            <ul className="flex flex-col gap-4 text-sm text-white/50">
              <li>
                <span className="opacity-50 pointer-events-none cursor-not-allowed flex items-center gap-2">
                  Interactive Trace
                  <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded">WIP</span>
                </span>
              </li>
              <li>
                <span className="opacity-50 pointer-events-none cursor-not-allowed flex items-center gap-2">
                  Standard Library
                  <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded">WIP</span>
                </span>
              </li>
              <li>
                <span className="opacity-50 pointer-events-none cursor-not-allowed flex items-center gap-2">
                  Visualizer Engine
                  <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded">WIP</span>
                </span>
              </li>
              <li>
                <span className="opacity-50 pointer-events-none cursor-not-allowed flex items-center gap-2">
                  API Docs
                  <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded">WIP</span>
                </span>
              </li>
            </ul>
          </div>
          <div>
            <h5 className="font-extrabold mb-6 text-sm uppercase tracking-widest text-primary/80">Community</h5>
            <ul className="flex flex-col gap-4 text-sm text-white/50">
              <li>
                <span className="opacity-50 pointer-events-none cursor-not-allowed flex items-center gap-2">
                  Contributing
                  <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded">WIP</span>
                </span>
              </li>
              <li>
                <span className="opacity-50 pointer-events-none cursor-not-allowed flex items-center gap-2">
                  Discord Server
                  <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded">WIP</span>
                </span>
              </li>
              <li>
                <span className="opacity-50 pointer-events-none cursor-not-allowed flex items-center gap-2">
                  Sponsorship
                  <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded">WIP</span>
                </span>
              </li>
              <li>
                <span className="opacity-50 pointer-events-none cursor-not-allowed flex items-center gap-2">
                  Contact Us
                  <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded">WIP</span>
                </span>
              </li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] text-white/30 uppercase tracking-[0.2em] font-bold">
          <p>© {new Date().getFullYear()} JSLab Project. Not affiliated with ECMA International.</p>
          <div className="flex gap-8">
            <a className="hover:text-white transition-colors" href="#">
              Privacy
            </a>
            <a className="hover:text-white transition-colors" href="#">
              Terms
            </a>
          </div>
        </div>
      </footer>
    </section>
  );
}
