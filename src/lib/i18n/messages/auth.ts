// Login, signup and password recovery.
// Every key needs an English and a Spanish string; `es` is typed against `en`
// so a missing translation fails the typecheck.

export const en = {
  // Login
  staffPortal: "Staff portal",
  username: "Username",
  password: "Password",
  signingIn: "Signing in…",
  signIn: "Sign in",
  noAccount: "Don't have an account?",
  signUpLink: "Sign up",
  // Signup
  createAccount: "Create account",
  minChars: "Minimum 15 characters.",
  signingUp: "Signing up…",
  signUp: "Sign up",
  alreadyHaveAccount: "Already have an account?",
  signInLink: "Sign in",
  signupSuccess:
    "You've registered successfully! You can now log in with your credentials.",
  backToLogin: "Back to login",
  usernameInUse: "Username is already taken.",
  somethingWentWrong: "Something went wrong. Please try again.",
  // Password recovery
  forgotPassword: "Forgot your password?",
  forgotPasswordTitle: "Recover your account",
  recoveryCodeLabel: "Recovery code",
  verifyCode: "Verify code",
  verifying: "Verifying…",
  invalidRecoveryCode: "Invalid or expired code.",
  newPassword: "New password",
  setNewPassword: "Set new password",
  settingPassword: "Saving…",
  passwordChanged:
    "Congratulations {0}, you've successfully changed your password!",
  forgotPasswordButton: "Forgot password",
  recoveryCodeDialogTitle: "Generate recovery code for",
  recoveryCodeDialogBody:
    "This will invalidate any existing code for this user. Continue?",
  generatingCode: "Generating…",
  generateCode: "Generate code",
  recoveryCodeGeneratedTitle: "Recovery code for {0}:",
  copyCode: "Copy",
  codeCopied: "Copied!",
  failedGenerateCode: "Failed to generate recovery code",
};

export const es: Record<keyof typeof en, string> = {
  // Login
  staffPortal: "Portal de staff",
  username: "Usuario",
  password: "Contraseña",
  signingIn: "Iniciando sesión…",
  signIn: "Iniciar sesión",
  noAccount: "¿No tenés cuenta?",
  signUpLink: "Registrate",
  // Signup
  createAccount: "Crear cuenta",
  minChars: "Mínimo 15 caracteres.",
  signingUp: "Registrando…",
  signUp: "Registrarse",
  alreadyHaveAccount: "¿Ya tenés cuenta?",
  signInLink: "Iniciá sesión",
  signupSuccess:
    "¡Te registraste correctamente! Ya podés iniciar sesión con tus credenciales.",
  backToLogin: "Volver al inicio",
  usernameInUse: "El nombre de usuario ya está en uso.",
  somethingWentWrong: "Algo salió mal. Intentá de nuevo.",
  // Password recovery
  forgotPassword: "¿Olvidaste tu contraseña?",
  forgotPasswordTitle: "Recuperar cuenta",
  recoveryCodeLabel: "Código de recuperación",
  verifyCode: "Verificar código",
  verifying: "Verificando…",
  invalidRecoveryCode: "Código inválido o expirado.",
  newPassword: "Nueva contraseña",
  setNewPassword: "Establecer contraseña",
  settingPassword: "Guardando…",
  passwordChanged: "¡Felicitaciones {0}, cambiaste tu contraseña con éxito!",
  forgotPasswordButton: "Olvidó su contraseña",
  recoveryCodeDialogTitle: "Generar código de recuperación para",
  recoveryCodeDialogBody:
    "Esto invalidará cualquier código previo de este usuario. ¿Continuar?",
  generatingCode: "Generando…",
  generateCode: "Generar código",
  recoveryCodeGeneratedTitle: "Código de recuperación para {0}:",
  copyCode: "Copiar",
  codeCopied: "¡Copiado!",
  failedGenerateCode: "Error al generar código",
};
