import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { LearningProgressProvider } from "@/contexts/LearningProgressContext";
import RequireAuth from "@/components/RequireAuth";
import PublicHome from "./pages/PublicHome";
import Index from "./pages/Index";
import LearnMore from "./pages/LearnMore";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import SignToText from "./pages/SignToText";
import TextToSign from "./pages/TextToSign";
import NotFound from "./pages/NotFound";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import Accessibility from "./pages/Accessibility";

import LearningHub from "./pages/learning/LearningHub";
import LearningLearn from "./pages/learning/LearningLearn";
import LearnEasy from "./pages/learning/LearnEasy";
import LearnMedium from "./pages/learning/LearnMedium";
import LearnHard from "./pages/learning/LearnHard";
import LearningQuiz from "./pages/learning/LearningQuiz";
import QuizAlphabets from "./pages/learning/QuizAlphabets";
import QuizWords from "./pages/learning/QuizWords";
import QuizSentences from "./pages/learning/QuizSentences";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <LearningProgressProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<PublicHome />} />
              <Route path="/welcome" element={<Index />} />
              <Route path="/learn-more" element={<LearnMore />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route
                path="/dashboard"
                element={
                  <RequireAuth>
                    <Dashboard />
                  </RequireAuth>
                }
              />
              <Route path="/sign-to-text" element={<SignToText />} />
              <Route path="/text-to-sign" element={<TextToSign />} />

              <Route path="/learning" element={<LearningHub />} />
              <Route path="/learning/learn" element={<LearningLearn />} />
              <Route path="/learning/learn/easy" element={<LearnEasy />} />
              <Route path="/learning/learn/medium" element={<LearnMedium />} />
              <Route path="/learning/learn/hard" element={<LearnHard />} />
              <Route path="/learning/quiz" element={<LearningQuiz />} />
              <Route path="/learning/quiz/alphabets" element={<QuizAlphabets />} />
              <Route path="/learning/quiz/words" element={<QuizWords />} />
              <Route path="/learning/quiz/sentences" element={<QuizSentences />} />

              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/terms-of-service" element={<TermsOfService />} />
              <Route path="/accessibility" element={<Accessibility />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </LearningProgressProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
