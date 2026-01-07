import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { Web3Provider } from "./contexts/Web3Context";
import { LanguageProvider } from "./contexts/LanguageContext";
import { ReferralProvider } from "./contexts/ReferralContext";
import Home from "./pages/Home";
import Nodes from "./pages/Nodes";
import Yield from "./pages/Yield";
import Team from "./pages/Team";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/nodes"} component={Nodes} />
      <Route path={"/yield"} component={Yield} />
      <Route path={"/team"} component={Team} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <Web3Provider>
        <ReferralProvider>
          <LanguageProvider>
          <ThemeProvider
            defaultTheme="light"
            // switchable
          >
            <TooltipProvider>
              <Toaster />
              <Router />
            </TooltipProvider>
          </ThemeProvider>
          </LanguageProvider>
        </ReferralProvider>
      </Web3Provider>
    </ErrorBoundary>
  );
}

export default App;
