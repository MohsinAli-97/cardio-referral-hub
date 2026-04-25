import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { DataProvider } from "./contexts/DataContext";
import { PricingProvider } from "./contexts/PricingContext";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Referrals from "./pages/Referrals";
import Reports from "./pages/Reports";
import Invoices from "./pages/Invoices";
import Clinicians from "./pages/Clinicians";
import InsuranceFees from "./pages/InsuranceFees";
import InsuranceAnalysis from "./pages/InsuranceAnalysis";
import PricingManagement from "./pages/PricingManagement";
import ClinicianTestMatrix from "./pages/ClinicianTestMatrix";

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/referrals" component={Referrals} />
        <Route path="/reports" component={Reports} />
        <Route path="/invoices" component={Invoices} />
        <Route path="/clinicians" component={Clinicians} />
        <Route path="/insurance-fees" component={InsuranceFees} />
        <Route path="/insurance-analysis" component={InsuranceAnalysis} />
        <Route path="/pricing" component={PricingManagement} />
        <Route path="/test-matrix" component={ClinicianTestMatrix} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <DataProvider>
            <PricingProvider>
              <Toaster />
              <Router />
            </PricingProvider>
          </DataProvider>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
