import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { authAPI } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, AlertCircle, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    healthCenter: "",
  });
  const [healthCenters, setHealthCenters] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, register, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) navigate("/dashboard", { replace: true });
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (!isRegister) return;

    const fetchCenters = async () => {
      try {
        const { data } = await authAPI.getHealthCenters();
        setHealthCenters(data.healthCenters);
      } catch {
        // silently fail
      }
    };
    fetchCenters();
  }, [isRegister]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isRegister) {
        await register(formData);
      } else {
        await login(formData.email, formData.password);
      }
      navigate("/dashboard");
    } catch (err) {
      const status = err?.response?.status;
      const isTransient = err?.code === "ERR_NETWORK" || status === 502 || status === 503 || status === 504;
      if (isTransient) {
        setError("Server is waking up. Please wait a few seconds and try again.");
      } else {
        setError(err.response?.data?.message || "An error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen flex">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[42%] relative overflow-hidden" style={{ background: 'hsl(222 47% 11%)' }}>
        {/* Subtle dot pattern */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: '32px 32px',
          }}
        />

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Top logo */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg" style={{ background: 'hsl(166 56% 38%)' }}>
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-white font-bold text-lg tracking-tight">MedVault</span>
            </div>
          </div>

          {/* Middle content */}
          <div className="max-w-md">
            <h2 className="text-4xl xl:text-5xl font-bold text-white leading-[1.15]">
              Smarter inventory
              <br />
              for healthier
              <br />
              <span style={{ color: 'hsl(166 56% 55%)' }}>communities.</span>
            </h2>
          </div>

          {/* Bottom */}
          <div className="flex items-center gap-2" style={{ color: 'hsl(220 15% 40%)' }}>
            <span className="text-xs">Barangay Cupang Health Center</span>
            <span className="text-xs">·</span>
            <span className="text-xs">Muntinlupa City</span>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-background">
        <div className="w-full max-w-[400px]">
          {/* Mobile-only logo */}
          <div className="flex flex-col items-center mb-8 lg:hidden">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl mb-3" style={{ background: 'hsl(166 56% 38%)' }}>
              <Shield className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-foreground">MedVault</h1>
          </div>

          <div className="mb-8">
            <h1 className="text-[26px] font-bold text-foreground tracking-tight">
              {isRegister ? "Create your account" : "Welcome back"}
            </h1>
            <p className="text-sm text-muted-foreground mt-2">
              {isRegister
                ? "Register to access the inventory management system"
                : "Sign in to your MedVault account to continue"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="flex items-center gap-2.5 p-3.5 rounded-lg bg-red-50 text-red-600 text-sm border border-red-100">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {isRegister && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="firstName" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    First Name
                  </Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => updateField("firstName", e.target.value)}
                    className="h-11"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lastName" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Last Name
                  </Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => updateField("lastName", e.target.value)}
                    className="h-11"
                    required
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={formData.email}
                onChange={(e) => updateField("email", e.target.value)}
                className="h-11"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={(e) => updateField("password", e.target.value)}
                className="h-11"
                required
              />
            </div>

            {isRegister && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Health Center
                </Label>
                <Select
                  value={formData.healthCenter}
                  onValueChange={(value) => updateField("healthCenter", value)}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select health center" />
                  </SelectTrigger>
                  <SelectContent>
                    {healthCenters.map((hc) => (
                      <SelectItem key={hc._id} value={hc._id}>
                        {hc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button type="submit" className="w-full h-11 text-[13px] font-semibold" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  Please wait...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  {isRegister ? "Create Account" : "Sign In"}
                  <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <span className="text-sm text-muted-foreground">
              {isRegister ? "Already have an account?" : "Don't have an account?"}
            </span>{" "}
            <button
              type="button"
              onClick={() => {
                setIsRegister(!isRegister);
                setError("");
              }}
              className="text-sm font-semibold hover:underline underline-offset-4"
              style={{ color: 'hsl(166 56% 38%)' }}
            >
              {isRegister ? "Sign in instead" : "Create one"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
