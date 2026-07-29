import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import { Layout } from "./components/Layout";
import Login from "./pages/Login";
import Customers from "./pages/Customers";
import CustomerDetail from "./pages/CustomerDetail";
import Products from "./pages/Products";
import Challans from "./pages/Challans";
import ChallanCreate from "./pages/ChallanCreate";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<Layout />}>
            <Route path="/" element={<Navigate to="/customers" replace />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/customers/:id" element={<CustomerDetail />} />
            <Route path="/products" element={<Products />} />
            <Route path="/challans" element={<Challans />} />
            <Route path="/challans/new" element={<ChallanCreate />} />
          </Route>
          <Route path="*" element={<Navigate to="/customers" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
