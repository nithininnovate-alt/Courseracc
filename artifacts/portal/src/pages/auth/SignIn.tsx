import { SignIn } from "@clerk/react";
import cguLogo from "@assets/cropped-cgu_logo-768x244_1782643160003.png";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function SignInPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/30 p-4 gap-8">
      <img src={cguLogo} alt="Central Global University" className="h-14 w-auto" />
      <SignIn
        routing="path"
        path={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/sign-up`}
      />
    </div>
  );
}
