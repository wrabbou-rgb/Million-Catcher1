import { Link } from "wouter";
import { NeonButton } from "@/components/NeonButton";
import { motion } from "framer-motion";
import { Gamepad2, Users } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-10" />
      <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/50 to-background" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative z-10 text-center space-y-12 max-w-4xl mx-auto"
      >
        <div className="space-y-4">
          <h1 className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary via-purple-500 to-accent drop-shadow-[0_0_30px_rgba(6,182,212,0.5)]">
            ATRAPA UN
            <br />
            MILLÓN
          </h1>
          <p className="text-2xl text-muted-foreground font-light tracking-widest uppercase">
            Cicle Otto Edition
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-2xl mx-auto">
          <Link href="/join">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="cursor-pointer"
            >
              <div className="h-full p-8 rounded-2xl bg-slate-900/80 border border-white/10 hover:border-primary/50 transition-all group relative overflow-hidden">
                <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10 flex flex-col items-center gap-6">
                  <div className="p-6 rounded-full bg-slate-800 group-hover:bg-primary/20 transition-colors">
                    <Gamepad2 className="w-12 h-12 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-bold text-white">Unir-se</h3>
                    <p className="text-sm text-slate-400">Entra a una sala existent i juga</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </Link>

          <Link href="/host">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="cursor-pointer"
            >
              <div className="h-full p-8 rounded-2xl bg-slate-900/80 border border-white/10 hover:border-secondary/50 transition-all group relative overflow-hidden">
                <div className="absolute inset-0 bg-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10 flex flex-col items-center gap-6">
                  <div className="p-6 rounded-full bg-slate-800 group-hover:bg-secondary/20 transition-colors">
                    <Users className="w-12 h-12 text-secondary" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-bold text-white">Crear Sala</h3>
                    <p className="text-sm text-slate-400">Sigues el presentador del joc</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </Link>
        </div>
      </motion.div>

      {/* Footer Watermark */}
      <div className="absolute bottom-4 right-6 text-white/60 text-sm font-mono tracking-wider">
        Developed by Walid Rabbou
      </div>
    </div>
  );
}
