import { RequirePersonalPassword } from "@/components/RequirePersonalPassword";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/hooks/use-theme";
import { IndexWithSplash } from "@/components/IndexWithSplash";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Plans from "./pages/Plans";
import PlanForm from "./pages/PlanForm";
import PlanDetails from "./pages/PlanDetails";
import Users from "./pages/Users";
import RegionalCatalog from "./pages/RegionalCatalog";
import Account from "./pages/Account";
import Support from "./pages/Support";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="light" storageKey="sesisenai-theme">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<IndexWithSplash />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<RequirePersonalPassword><Dashboard /></RequirePersonalPassword>} />
            <Route path="/plans" element={<RequirePersonalPassword><Plans /></RequirePersonalPassword>} />
            <Route path="/plans/new" element={<RequirePersonalPassword><PlanForm /></RequirePersonalPassword>} />
            <Route path="/plans/:id" element={<RequirePersonalPassword><PlanDetails /></RequirePersonalPassword>} />
            <Route path="/plans/:id/edit" element={<RequirePersonalPassword><PlanForm /></RequirePersonalPassword>} />
            <Route path="/users" element={<RequirePersonalPassword><Users /></RequirePersonalPassword>} />
            <Route path="/regional" element={<RequirePersonalPassword><RegionalCatalog /></RequirePersonalPassword>} />
            <Route path="/account" element={<RequirePersonalPassword><Account /></RequirePersonalPassword>} />
            <Route path="/support" element={<RequirePersonalPassword><Support /></RequirePersonalPassword>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
