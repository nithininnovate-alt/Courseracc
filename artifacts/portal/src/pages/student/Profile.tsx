import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetCurrentUser,
  useUpdateCurrentUser,
  getGetCurrentUserQueryKey,
  useListEnrollments,
  useListCourses,
  type User,
} from "@workspace/api-client-react";
import { useUser } from "@clerk/react";
import { useUpload } from "@workspace/object-storage-web";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { PageHeader, LoadingCard } from "@/components/common/PageState";
import { useToast } from "@/hooks/use-toast";
import { BookOpen, Camera, Users } from "lucide-react";

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
    gender: "",
    nationality: "",
    city: "",
    address: "",
    country: "",
    fatherName: "",
    motherName: "",
  });

  useEffect(() => {
    if (user) {
      setForm({
        firstName: user.firstName ?? "",
        lastName: user.lastName ?? "",
        phone: user.phone ?? "",
        dateOfBirth: user.dateOfBirth ?? "",
        gender: user.gender ?? "",
        nationality: user.nationality ?? "",
        city: user.city ?? "",
        address: user.address ?? "",
        country: user.country ?? "",
        fatherName: user.fatherName ?? "",
        motherName: user.motherName ?? "",
      });
    }
  }, [user]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadFile, isUploading } = useUpload({
    onError: () =>
      toast({ title: "Upload failed", description: "Could not upload photo.", variant: "destructive" }),
  });

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please choose an image file.", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Too large", description: "Photo must be under 5 MB.", variant: "destructive" });
      return;
    }
    const res = await uploadFile(file);
    if (!res) return;
    updateUser.mutate(
      { data: { avatarUrl: res.objectPath } },
      {
        onSuccess: () => {
          toast({ title: "Photo updated", description: "Your profile photo has been changed." });
          qc.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });
        },
        onError: () =>
          toast({ title: "Error", description: "Could not save your photo.", variant: "destructive" }),
      },
    );
  };

  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Student";
  const initials =
    [user?.firstName?.[0], user?.lastName?.[0]].filter(Boolean).join("").toUpperCase() || "S";

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
          gender: form.gender || undefined,
          nationality: form.nationality || undefined,
          city: form.city || undefined,
          address: form.address || undefined,
          country: form.country || undefined,
          fatherName: form.fatherName || undefined,
          motherName: form.motherName || undefined,
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
              <div className="flex items-center gap-4">
                <Avatar className="w-20 h-20 border">
                  {user?.avatarUrl && (
                    <AvatarImage src={`/api/storage${user.avatarUrl}`} alt={displayName} className="object-cover" />
                  )}
                  <AvatarFallback className="text-xl font-serif">{initials}</AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <p className="font-medium">{displayName}</p>
                  {user?.studentId && (
                    <Badge variant="secondary" className="font-mono tracking-wide">
                      Student ID: {user.studentId}
                    </Badge>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading || updateUser.isPending}
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    {isUploading ? "Uploading..." : user?.avatarUrl ? "Change Photo" : "Upload Photo"}
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoChange}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={user?.email ?? ""} disabled className="h-11" />
              </div>
              {user?.studentId && (
                <div className="space-y-2">
                  <Label>Student ID</Label>
                  <Input value={user.studentId} disabled className="h-11 font-mono" />
                </div>
              )}
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
                  <Label htmlFor="fatherName">Father/Husband Name</Label>
                  <Input id="fatherName" value={form.fatherName} onChange={text("fatherName")} className="h-11" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="motherName">Mother Name</Label>
                  <Input id="motherName" value={form.motherName} onChange={text("motherName")} className="h-11" />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  <Select value={form.gender} onValueChange={(v) => setForm((f) => ({ ...f, gender: v }))}>
                    <SelectTrigger className="h-11" id="gender"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                      <SelectItem value="undisclosed">Prefer not to say</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nationality">Nationality</Label>
                  <Input id="nationality" value={form.nationality} onChange={text("nationality")} className="h-11" />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input id="city" value={form.city} onChange={text("city")} className="h-11" />
                </div>
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

          <EnrolledCoursesCard />

          <ParentDetailsCard
            user={user}
            onSaved={() => qc.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() })}
          />
        </div>
      )}
    </div>
  );
}

function EnrolledCoursesCard() {
  const { data: enrollments, isLoading } = useListEnrollments();
  const { data: courses } = useListCourses();
  const courseById = new Map((courses ?? []).map((c) => [c.id, c]));

  return (
    <Card className="rounded-2xl lg:col-span-2">
      <CardHeader>
        <CardTitle className="font-serif flex items-center gap-2">
          <BookOpen className="w-5 h-5" /> Enrolled Courses
        </CardTitle>
        <CardDescription>Programs you are currently enrolled in.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : !enrollments || enrollments.length === 0 ? (
          <p className="text-sm text-muted-foreground">You are not enrolled in any courses yet.</p>
        ) : (
          <ul className="space-y-4">
            {enrollments.map((e) => {
              const course = courseById.get(e.courseId);
              return (
                <li key={e.id} className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium text-primary">{course?.title ?? `Course #${e.courseId}`}</p>
                      <p className="text-xs text-muted-foreground">
                        {course?.level ? `${course.level} · ` : ""}
                        Enrolled {new Date(e.enrolledAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant={e.status === "completed" ? "default" : "secondary"} className="capitalize">
                      {e.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <Progress value={e.progress} className="h-2" />
                    <span className="text-xs text-muted-foreground w-10 text-right">{e.progress}%</span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function ParentDetailsCard({ user, onSaved }: { user: User | undefined; onSaved: () => void }) {
  const { toast } = useToast();
  const updateUser = useUpdateCurrentUser();

  const [form, setForm] = useState({
    parentName: "",
    parentRelationship: "",
    parentPhone: "",
    parentEmail: "",
    parentOccupation: "",
  });

  useEffect(() => {
    if (user) {
      setForm({
        parentName: user.parentName ?? "",
        parentRelationship: user.parentRelationship ?? "",
        parentPhone: user.parentPhone ?? "",
        parentEmail: user.parentEmail ?? "",
        parentOccupation: user.parentOccupation ?? "",
      });
    }
  }, [user]);

  const text = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSave = () => {
    updateUser.mutate(
      { data: { ...form } },
      {
        onSuccess: () => {
          toast({ title: "Saved", description: "Parent/guardian details have been updated." });
          onSaved();
        },
        onError: () =>
          toast({ title: "Error", description: "Could not save parent/guardian details.", variant: "destructive" }),
      },
    );
  };

  return (
    <Card className="rounded-2xl h-fit">
      <CardHeader>
        <CardTitle className="font-serif flex items-center gap-2">
          <Users className="w-5 h-5" /> Parent/Guardian Details
        </CardTitle>
        <CardDescription>Contact details of your parent or guardian.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="parentName">Full Name</Label>
          <Input id="parentName" value={form.parentName} onChange={text("parentName")} className="h-11" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="parentRelationship">Relationship</Label>
          <Input id="parentRelationship" placeholder="e.g. Father, Mother, Guardian" value={form.parentRelationship} onChange={text("parentRelationship")} className="h-11" />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="parentPhone">Phone</Label>
            <Input id="parentPhone" value={form.parentPhone} onChange={text("parentPhone")} className="h-11" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="parentEmail">Email</Label>
            <Input id="parentEmail" type="email" value={form.parentEmail} onChange={text("parentEmail")} className="h-11" />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="parentOccupation">Occupation</Label>
          <Input id="parentOccupation" value={form.parentOccupation} onChange={text("parentOccupation")} className="h-11" />
        </div>
        <div className="flex justify-end pt-2">
          <Button onClick={handleSave} disabled={updateUser.isPending}>
            {updateUser.isPending ? "Saving..." : "Save Details"}
          </Button>
        </div>
      </CardContent>
    </Card>
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
