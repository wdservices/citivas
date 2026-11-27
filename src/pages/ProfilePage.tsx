import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, User, Camera, Edit, MapPin, Phone, Mail, Calendar, Shield, Bell, CheckCircle, Hotel, MapPin as MapPinIcon, Clock, CreditCard } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { getUserProfile, updateUserProfile } from "@/lib/firebase";
import { useMyPropertyBookings } from "@/lib/useFirestore";
import { useToast } from "@/hooks/use-toast";
import { useRegion } from "@/contexts/RegionContext";
import StampIcon from "@/components/StampIcon";
import { BookingsListSkeleton } from "@/components/ui/ListingSkeletons";

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();
  const { locationName } = useRegion();

  // Editable profile fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [bio, setBio] = useState("");

  // Get user information from auth context
  const nameParts = (user?.name || "").split(" ");
  const displayName = `${firstName || nameParts[0] || "User"} ${lastName || nameParts.slice(1).join(" ") || ""}`.trim();
  const userEmail = user?.email || '';
  const userAvatar = user?.photoURL || '';
  const isEmailVerified = true; // Default to verified for custom User type
  const creationTime = undefined;
  const lastSignInTime = undefined;
  const providerId = 'email';

  const { data: myBookings = [], isLoading: bookingsLoading } = useMyPropertyBookings(user?.id || null);
  
  // Get initials for fallback avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Format date for display
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Get provider display name
  const getProviderName = (providerId: string) => {
    switch (providerId) {
      case 'google.com':
        return 'Google';
      case 'facebook.com':
        return 'Facebook';
      case 'password':
      case 'email':
        return 'Email/Password';
      default:
        return 'Unknown';
    }
  };

  const userStats = [
    { label: "Places Visited", value: "47", icon: MapPin },
    { label: "Reviews Written", value: "23", icon: "📝" },
    { label: "Photos Shared", value: "156", icon: "📸" },
    { label: "Member Since", value: creationTime ? new Date(creationTime).getFullYear().toString() : "2024", icon: Calendar }
  ];

  // Load profile from Firestore
  useEffect(() => {
    const loadProfile = async () => {
      if (!user?.id) return;
      try {
        const data = await getUserProfile(user.id);
        if (data) {
          setFirstName(String(data.firstName || ""));
          setLastName(String(data.lastName || ""));
          setPhone(String(data.phoneNumber || ""));
          setLocation(String(data.location || ""));
          setBio(String(data.bio || ""));
        } else {
          // Prefill from auth when no profile doc yet
          const name = user.name || "";
          const parts = name.split(" ");
          setFirstName(parts[0] || "");
          setLastName(parts.slice(1).join(" ") || "");
        }
      } catch (err) {
        console.error("Failed to load profile:", err);
      }
    };
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const handleSave = async () => {
    if (!user?.id) return;
    try {
      await updateUserProfile(user.id, {
        firstName,
        lastName,
        displayName: `${firstName} ${lastName}`.trim(),
        email: user.email || null,
        photoURL: user.photoURL || null,
        phoneNumber: phone,
        location,
        bio,
      });
      toast({ title: "Profile updated", description: "Your changes have been saved." });
      setIsEditing(false);
    } catch (err: any) {
      console.error("Profile save failed:", err);
      toast({
        title: "Failed to save",
        description: String(err?.message || "Please try again."),
      });
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Ivory header band */}
      <div className="border-b border-border bg-background">
        <div className="px-4 py-8 max-w-4xl mx-auto relative">
          <Button
            variant="ghost"
            className="text-foreground hover:bg-muted mb-4"
            onClick={() => navigate("/explore")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          <div className="flex items-center gap-4">
            <div className="relative group">
              {userAvatar ? (
                <Avatar className="h-20 w-20 border-2 border-dashed border-primary/50">
                  <AvatarImage src={userAvatar} alt={displayName} />
                  <AvatarFallback className="bg-muted text-foreground text-2xl">
                    {getInitials(displayName)}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <StampIcon icon={User} tone="primary" size="lg" />
              )}
              <Button
                size="icon"
                variant="secondary"
                className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full"
              >
                <Camera className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="font-display text-2xl font-extrabold truncate">{displayName}</h1>
                {isEmailVerified && (
                  <Badge className="bg-success/15 text-success border-0 hover:bg-success/20">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Verified
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground mb-2 truncate">{userEmail}</p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="absolute top-4 right-4 rounded-full"
            onClick={() => setIsEditing(!isEditing)}
          >
            <Edit className="h-4 w-4 mr-2" />
            {isEditing ? "Cancel" : "Edit"}
          </Button>
        </div>
      </div>

      <div className="px-4 py-6 max-w-4xl mx-auto">
        {/* User Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {userStats.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-4 text-center">
                <div className="text-2xl mb-2">{typeof stat.icon === 'string' ? stat.icon : <stat.icon className="h-6 w-6 mx-auto text-primary" />}</div>
                <p className="text-2xl font-bold text-primary">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="w-full justify-start gap-6 bg-transparent border-b border-border rounded-none h-auto p-0">
            <TabsTrigger value="profile" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 pb-3">Overview</TabsTrigger>
            <TabsTrigger value="preferences" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 pb-3">Bookings</TabsTrigger>
            <TabsTrigger value="privacy" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 pb-3">Reviews</TabsTrigger>
            <TabsTrigger value="notifications" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 pb-3">Security</TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>
                  Update your personal details and contact information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <div className="flex items-center gap-2">
                    <Input 
                      id="email" 
                      defaultValue={userEmail} 
                      disabled={true}
                      className="flex-1"
                    />
                    {isEmailVerified && (
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Verified
                      </Badge>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="provider">Sign-in Method</Label>
                  <Input 
                    id="provider" 
                    defaultValue={getProviderName(providerId)} 
                    disabled={true}
                  />
                </div>

                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={!isEditing}
                  />
                </div>

                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    disabled={!isEditing}
                  />
                </div>

                <div>
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    disabled={!isEditing}
                    rows={3}
                  />
                </div>

                {isEditing && (
                  <div className="flex gap-2 pt-4">
                    <Button onClick={handleSave}>
                      Save Changes
                    </Button>
                    <Button variant="outline" onClick={() => setIsEditing(false)}>
                      Cancel
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Account Information */}
            <Card>
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
                <CardDescription>
                  Your account details and authentication information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Account Created</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{formatDate(creationTime)}</span>
                    </div>
                  </div>
                  <div>
                    <Label>Last Sign In</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{formatDate(lastSignInTime)}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>User ID</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-mono text-muted-foreground truncate">
                        {user?.id || 'N/A'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <Label>Email Status</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <Badge variant={isEmailVerified ? "default" : "secondary"} className="text-xs">
                        {isEmailVerified ? "Verified" : "Unverified"}
                      </Badge>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <Label>Authentication Provider</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{getProviderName(providerId)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Bookings Tab */}
          <TabsContent value="preferences" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  My Bookings
                </CardTitle>
                <CardDescription>
                  Your property reservations and booking history
                </CardDescription>
              </CardHeader>
              <CardContent>
                {bookingsLoading ? (
                  <BookingsListSkeleton count={3} />
                ) : myBookings.length === 0 ? (
                  <div className="text-center py-12">
                    <Hotel className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-2">No bookings yet</p>
                    <p className="text-sm text-muted-foreground mb-4">When you book a property, it will appear here.</p>
                    <Button variant="outline" onClick={() => navigate("/explore")}>
                      Browse Properties
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {myBookings.map((booking: any) => (
                      <div key={booking.id} className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                        <div className="flex gap-4">
                          {booking.roomImage && (
                            <img
                              src={booking.roomImage}
                              alt={booking.roomName}
                              className="w-24 h-24 rounded-lg object-cover flex-shrink-0"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <h4 className="font-semibold truncate">{booking.propertyTitle}</h4>
                              <Badge
                                variant={booking.status === "Confirmed" ? "default" : "secondary"}
                                className="flex-shrink-0"
                              >
                                {booking.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground flex items-center gap-1 mb-2">
                              <Hotel className="h-3 w-3" /> {booking.roomName}
                            </p>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {booking.checkIn} → {booking.checkOut}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {booking.nights} night{booking.nights !== 1 ? "s" : ""}
                              </span>
                              <span className="flex items-center gap-1">
                                <CreditCard className="h-3 w-3" />
                                ₦{(booking.totalPaid || 0).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                              Ref: <span className="font-mono">{booking.bookingRef}</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Privacy Tab */}
          <TabsContent value="privacy" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Privacy Settings
                </CardTitle>
                <CardDescription>
                  Control who can see your information and activity
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Public Profile</Label>
                    <p className="text-sm text-muted-foreground">Allow others to find and view your profile</p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Show Reviews</Label>
                    <p className="text-sm text-muted-foreground">Display your reviews and ratings publicly</p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Show Check-ins</Label>
                    <p className="text-sm text-muted-foreground">Let others see places you've visited</p>
                  </div>
                  <Switch />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Data Analytics</Label>
                    <p className="text-sm text-muted-foreground">Help improve the app with usage analytics</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notification Settings
                </CardTitle>
                <CardDescription>
                  Choose what notifications you want to receive
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Push Notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive notifications on your device</p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label>New Events</Label>
                    <p className="text-sm text-muted-foreground">Get notified about new events near you</p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Special Offers</Label>
                    <p className="text-sm text-muted-foreground">Receive deals and promotions</p>
                  </div>
                  <Switch />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Review Reminders</Label>
                    <p className="text-sm text-muted-foreground">Remind me to review places I visit</p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Email Updates</Label>
                    <p className="text-sm text-muted-foreground">Weekly updates for {locationName}</p>
                  </div>
                  <Switch />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ProfilePage;