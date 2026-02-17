import { useState } from "react";
import { useLocation } from "wouter";
import { useGameSocket } from "@/hooks/use-game-socket";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { Watermark } from "@/components/Watermark";
import { motion } from "framer-motion";

export default function CreateRoom() {
  const [hostName, setHostName] = useState("");
  const [maxPlayers, setMaxPlayers] = useState("10");
  const [isCreating, setIsCreating] = useState(false);
  const { createRoom, gameState } = useGameSocket();
  const [, setLocation] = useLocation();

  // If room created successfully (gameState populated), redirect to lobby
  if (gameState?.roomCode) {
    setLocation(`/host/lobby/${gameState.roomCode}`);
  }

  const handleCreate = () => {
    if (!hostName) return;
    setIsCreating(true);
    createRoom(hostName, parseInt(maxPlayers));
    // isCreating stays true until redirect or error
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative">
      <Watermark />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="glass-panel border-none">
          <CardHeader className="text-center pb-8">
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Configurar Sala
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="hostName">Nom del Fitrió</Label>
              <Input
                id="hostName"
                placeholder="Ex: Presentador"
                value={hostName}
                onChange={(e) => setHostName(e.target.value)}
                className="bg-black/20 border-white/10 h-12 text-lg focus:ring-primary/50"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="maxPlayers">Màxim de Jugadors</Label>
              <Input
                id="maxPlayers"
                type="number"
                min="2"
                max="30"
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(e.target.value)}
                className="bg-black/20 border-white/10 h-12 text-lg focus:ring-primary/50"
              />
            </div>

            <Button 
              className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-primary to-primary/80 hover:to-primary"
              onClick={handleCreate}
              disabled={isCreating || !hostName}
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Creant...
                </>
              ) : (
                "Crear Sala"
              )}
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
