import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import Landing from "@/pages/Landing";
import Host from "@/pages/Host";
import NotFound from "@/pages/not-found";

// Nuevas páginas
import Lobby from "@/pages/host/Lobby";
import GameDashboard from "@/pages/host/GameDashboard";
import JoinGame from "@/pages/join/JoinGame";
import PlayerGame from "@/pages/player/PlayerGame";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />

      {/* Host */}
      <Route path="/host" component={Host} />
      <Route path="/host/lobby/:code" component={Lobby} />
      <Route path="/host/game/:code" component={GameDashboard} />

      {/* Jugador */}
      <Route path="/join" component={JoinGame} />
      <Route path="/play/:code" component={PlayerGame} />

      {/* 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
