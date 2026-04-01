import { NavLink } from "react-router-dom";
import { useState, useEffect, type FC } from "react";
import { supabase } from "../Supabase";
import "./Navbar.css";

const Navbar: FC = () => {
  const [user, setUser] = useState<any | null>(null);
  const [profileData, setProfileData] = useState<{ username: string; profile_image_link: string } | null>(null);

  const DEFAULT_AVATAR = "https://i.imgur.com/HeIi0wU.png";

  const fetchProfileFromDB = async (userId: string) => {
    const { data, error } = await supabase
      .from("Users")
      .select("username, profile_image_link")
      .eq("user_id", userId)
      .maybeSingle();

    if (!error && data) {
      setProfileData({
        username: data.username,
        profile_image_link: data.profile_image_link || DEFAULT_AVATAR
      });
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        fetchProfileFromDB(user.id);
      }
    };
    initAuth();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user || null;
      setUser(currentUser);
      
      if (currentUser) {
        fetchProfileFromDB(currentUser.id);
      } else {
        setProfileData(null);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  return (
    <div className="navbar">
      <div className="nav-left">
        <NavLink to="/" end className="nav-link">Home</NavLink>
        <NavLink to="/tacmap" className="nav-link">Tac Map</NavLink>
        <NavLink to="/saves" className="nav-link">Saves</NavLink>
        <NavLink to="/forum" className="nav-link">Forum</NavLink>
      </div>

      <div className="nav-right">
        {user ? (
          <NavLink to={`/profile`} className="nav-link login profile-link">
            <img
              src={profileData?.profile_image_link || DEFAULT_AVATAR}
              alt="Profile"
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                marginRight: 10,
                objectFit: "cover",
                verticalAlign: "middle",
                border: "1px solid #e66feaff"
              }}
              onError={(e) => {
                (e.target as HTMLImageElement).src = DEFAULT_AVATAR;
              }}
            />
            {profileData?.username || "Profile"}
          </NavLink>
        ) : (
          <>
            <NavLink to="/auth" className="nav-link signup">Sign Up</NavLink>
            <NavLink to="/login" className="nav-link login">Sign In</NavLink>
          </>
        )}
      </div>
    </div>
  );
};

export default Navbar;