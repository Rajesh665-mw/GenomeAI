import { Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import PatientDashboard from "./pages/PatientDashboard";
import DoctorDashboard from "./pages/DoctorDashboard";
import AnalysisResultsPage from "./pages/AnalysisResultsPage";
import PreventiveGuidancePage from "./pages/PreventiveGuidancePage";
import ReportPage from "./pages/ReportPage";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";
import "./index.css";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/patient"
        element={
          <ProtectedRoute allow={["patient"]}>
            <PatientDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/patient/analysis/:analysisId"
        element={
          <ProtectedRoute allow={["patient"]}>
            <AnalysisResultsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/patient/analysis/:analysisId/guidance"
        element={
          <ProtectedRoute allow={["patient"]}>
            <PreventiveGuidancePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/patient/analysis/:analysisId/report"
        element={
          <ProtectedRoute allow={["patient"]}>
            <ReportPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/doctor"
        element={
          <ProtectedRoute allow={["doctor"]}>
            <DoctorDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/doctor/analysis/:analysisId"
        element={
          <ProtectedRoute allow={["doctor"]}>
            <AnalysisResultsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/doctor/analysis/:analysisId/guidance"
        element={
          <ProtectedRoute allow={["doctor"]}>
            <PreventiveGuidancePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/doctor/analysis/:analysisId/report"
        element={
          <ProtectedRoute allow={["doctor"]}>
            <ReportPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
