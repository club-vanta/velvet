import { useState } from "react";
import { Link } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { api } from "@/api/client";

export function SignupPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsPending(true);
    try {
      const { error, response } = await api.POST("/auth/register", {
        body: { username, password },
      });
      if (error) {
        if (response.status === 409) {
          setError("El nombre de usuario ya está en uso.");
        } else {
          setError("Algo salió mal. Intentá de nuevo.");
        }
      } else {
        setSuccess(true);
      }
    } catch {
      setError("Algo salió mal. Intentá de nuevo.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-xl leading-none">
              V
            </span>
          </div>
          <div className="text-center space-y-0.5">
            <h1 className="text-2xl font-semibold">Alter Tracker</h1>
            <p className="text-sm text-muted-foreground">Crear cuenta</p>
          </div>
        </div>

        {success ? (
          <div className="space-y-4">
            <Alert>
              <AlertDescription>
                Te registraste correctamente! Un administrador estará viendo tu
                solicitud de registro, cualquier consulta contactarse a{" "}
                <a
                  href="mailto:contacto@clubvanta.com"
                  className="underline underline-offset-2"
                >
                  contacto@clubvanta.com
                </a>
                .
              </AlertDescription>
            </Alert>
            <Link
              to="/"
              className={buttonVariants({
                variant: "outline",
                className: "w-full",
              })}
            >
              Volver al inicio
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="username" className="text-sm font-medium">
                Username
              </label>
              <Input
                id="username"
                type="text"
                autoComplete="username"
                autoCapitalize="none"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isPending}
                required
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isPending}
                  required
                  minLength={15}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Mínimo 15 caracteres.
              </p>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "Registrando…" : "Registrarse"}
            </Button>
          </form>
        )}

        {!success && (
          <p className="text-center text-xs text-muted-foreground">
            ¿Ya tenés cuenta?{" "}
            <Link to="/" className="underline underline-offset-2">
              Iniciá sesión
            </Link>
          </p>
        )}
      </div>
    </main>
  );
}
