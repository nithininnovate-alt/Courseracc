import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetCurrentUser,
  useUpdateCurrentUser,
  getGetCurrentUserQueryKey,
} from "@workspace/api-client-react";
import { useUser } from "@clerk/react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader, LoadingCard } from "@/components/common/PageState";
import { useToast } from "@/hooks/use-toast";

export default function StudentProfile() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { user: clerkUser } = useUser();
  const { data: user, isLoading } = useGetCurrentUser();
  const updateUser = useUpdateCurrentUser();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    dateOfBirth: "",
    address: "",
    country: "",
  });

  useEffect(() => {
    if (user) {
      setForm({
        firstName: user.firstName ?? "",
        lastName: user.lastName ?? "",
        phone: user.phone ?? "",
        dateOfBirth: user.dateOfBirth ?? "",
        address: user.address ?? "",
        country: user.country ?? "",
      });
    }
  }, [user]);

  const text = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSave = () => {
    updateUser.mutate(
      {
        data: {
          firstName: form.firstName || undefined,
          lastName: form.lastName || undefined,
          phone: form.phone || undefined,
          dateOfBirth: form.dateOfBirth || undefined,
          address: form.address || undefined,
          country: form.country || undefined,
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Saved", description: "Your profile has been updated." });
          qc.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });
        },
        onError: () =>
          toast({ title: "Error", description: "Could not update your profile.", variant: "destructive" }),
      },
    );
  };

  return (
    <div className="space-y-8">
      <PageHeader title="My Profile" description="Manage your personal details and account security." />

      {isLoading ? (
        <LoadingCard />
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          <Card className="rounded-2xl lg:col-span-2">
            <CardHeader>
              <CardTitle className="font-serif">Personal Information</CardTitle>
              <CardDescription>Your email is managed through your sign-in provider.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={user?.email ?? ""} disabled className="h-11" />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" value={form.firstName} onChange={text("firstName")} className="h-11" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" value={form.lastName} onChange={text("lastName")} className="h-11" />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" value={form.phone} onChange={text("phone")} className="h-11" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">Date of Birth</Label>
                  <Input id="dateOfBirth" type="date" value={form.dateOfBirth} onChange={text("dateOfBirth")} className="h-11" />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input id="country" value={form.country} onChange={text("country")} className="h-11" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input id="address" value={form.address} onChange={text("address")} className="h-11" />
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <Button onClick={handleSave} disabled={updateUser.isPending}>
                  {updateUser.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <PasswordCard hasPassword={Boolean(clerkUser?.passwordEnabled)} />
        </div>
      )}
    </div>
  );
}

function PasswordCard({ hasPassword }: { hasPassword: boolean }) {
  const { toast } = useToast();
  const { user } = useUser();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  const handleChange = async () => {
    if (newPassword !== confirm) {
      toast({ title: "Mismatch", description: "New passwords do not match.", variant: "destructive" });
      return;
    }
    if (newPassword.length < 8) {
      toast({ title: "Too short", description: "Password must be at least 8 characters.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await user?.updatePassword({
        newPassword,
        ...(hasPassword ? { currentPassword } : {}),
      });
      toast({ title: "Password updated", description: "Your password has been changed." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirm("");
    } catch (err) {
      const message =
        (err as { errors?: { message?: string }[] })?.errors?.[0]?.message ??
        "Could not update password.";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="rounded-2xl h-fit">
      <CardHeader>
        <CardTitle className="font-serif">Security</CardTitle>
        <CardDescription>Change your account password.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasPassword && (
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current Password</Label>
            <Input id="currentPassword" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="h-11" />
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="newPassword">New Password</Label>
          <Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="h-11" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">Confirm New Password</Label>
          <Input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="h-11" />
        </div>
        <Button onClick={handleChange} disabled={saving || !newPassword} className="w-full">
          {saving ? "Updating..." : "Update Password"}
        </Button>
      </CardContent>
    </Card>
  );
}
