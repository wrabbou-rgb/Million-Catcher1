import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useGameSocket } from "@/hooks/use-game-socket";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Watermark } from "@/components/Watermark";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export default function JoinGame() {
  const [roomCode, setRoomCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  const { joinRoom, gameState, socketId } = useGameSocket();
  const [, setLocation] = useLocation();
  const [hasJoined, setHasJoined] = useState(false);

  // ✅ Cuando recibimos gameState con nuestro socketId en la lista, redirigimos
  useEffect(() => {
    if (!gameState?.roomCode || !socketId || hasJoined) return;

    // Buscamos por socketId (campo correcto del servidor)
    const me = gameState.players.find(
      (p: any) => p.socketId === socketId || p.id === socketId,
    );

    if (me) {
      setHasJoined(true);
      setLocation(`/play/${gameState.roomCode}`);
    }
  }, [gameState, socketId, hasJoined, setLocation]);

  const handleJoin = () => {
    if (!roomCode || !playerName) return;
    joinRoom(roomCode.toUpperCase(), playerName);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleJoin();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative">
      <Watermark />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Card className="glass-panel border-none">
          <CardHeader className="text-center pb-8">
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-secondary to-primary bg-clip-text text-transparent">
              Unir-se a la Partida
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="roomCode">Codi de Sala</Label>
              <Input
                id="roomCode"
                placeholder="Ex: ABC123"
                maxLength={6}
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                onKeyDown={handleKeyDown}
                className="bg-black/20 border-white/10 h-14 text-center text-2xl font-mono tracking-widest uppercase focus:ring-secondary/50 placeholder:tracking-normal placeholder:text-lg"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="playerName">El teu Nom</Label>
              <Input
                id="playerName"
                placeholder="Ex: Maria"
                maxLength={12}
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                onKeyDown={handleKeyDown}
                className="bg-black/20 border-white/10 h-12 text-lg focus:ring-secondary/50"
              />
            </div>

            <Button
              className="w-full h-14 text-xl font-bold bg-gradient-to-r from-secondary to-secondary/80 hover:to-secondary text-black"
              onClick={handleJoin}
              disabled={!roomCode || !playerName}
            >
              Entrar
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
