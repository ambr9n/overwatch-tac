import { NavLink, useNavigate } from "react-router-dom";
import { useState, useEffect, type FC } from "react";
import { supabase } from "../Supabase";
import "./Navbar.css";

const Navbar: FC = () => {
  const [user, setUser] = useState<any | null>(null);
  const [profileData, setProfileData] = useState<{ username: string; profile_image_link: string; user_id: string } | null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const navigate = useNavigate();

  const DEFAULT_AVATAR = "https://i.imgur.com/HeIi0wU.png";

  const fetchProfileFromDB = async (userId: string) => {
    const { data, error } = await supabase
      .from("Users")
      .select("username, profile_image_link, user_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!error && data) {
      setProfileData({
        username: data.username,
        profile_image_link: data.profile_image_link || DEFAULT_AVATAR,
        user_id: data.user_id,
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

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (userSearch.trim().length > 0) {
        const { data } = await supabase
          .from("Users")
          .select("user_id, username, profile_image_link")
          .ilike("username", `%${userSearch}%`)
          .limit(5);
        
        if (data) {
          const sorted = [...data].sort((a, b) => {
            const aIndex = a.username.toLowerCase().indexOf(userSearch.toLowerCase());
            const bIndex = b.username.toLowerCase().indexOf(userSearch.toLowerCase());
            if (aIndex !== bIndex) return aIndex - bIndex;
            return a.username.localeCompare(b.username);
          });
          setSearchResults(sorted.slice(0, 5));
        } else {
          setSearchResults([]);
        }
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [userSearch]);

  return (
    <div className="navbar" style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div className="nav-left" style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
        <NavLink to="/" end className="nav-link">Home</NavLink>
        <NavLink to="/tacmap" className="nav-link">Tac Map</NavLink>
        <NavLink to="/saves" className="nav-link">Saves</NavLink>
        <NavLink to="/teams" className="nav-link">Teams</NavLink>
        <NavLink to="/forum" className="nav-link">Forum</NavLink>
      </div>

      <div className="nav-right" style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
        {/* Search bar moved to right-hand container, positioned to the left of the profile/auth buttons */}
        <div style={{ position: 'relative', width: '25ch', marginRight: '20px' }}>
          <input 
            type="text" 
            maxLength={25}
            value={userSearch} 
            onChange={(e) => setUserSearch(e.target.value)} 
            placeholder="Search..." 
            style={{ width: "100%", padding: "8px 16px", borderRadius: "20px", background: "#111", border: "1px solid #282828", color: "white", boxSizing: 'border-box', outline: 'none' }} 
          />
          {searchResults.length > 0 && (
            <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#161616", border: "1px solid #282828", borderRadius: "0 0 10px 10px", zIndex: 100, overflow: 'hidden', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
              {searchResults.map(user => (
                <div 
                  key={user.user_id} 
                  onClick={() => { navigate(`/profile/${user.user_id}`); setUserSearch(""); }}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px", cursor: "pointer", borderBottom: "1px solid #222" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#222")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <img src={user.profile_image_link || DEFAULT_AVATAR} style={{ width: 24, height: 24, borderRadius: "50%", objectFit: "cover" }} />
                  <span style={{ fontWeight: "bold", color: "white", fontSize: '14px' }}>{user.username}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {user && profileData ? (
          <NavLink to={`/profile/${profileData.user_id}`} className="nav-link login profile-link">
            <img
              src={profileData.profile_image_link || DEFAULT_AVATAR}
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
            {profileData.username || "Profile"}
          </NavLink>
        ) : (
          <>
            <NavLink to="/auth" className="nav-link signup">Sign Up</NavLink>
            <NavLink to="/login" className="nav-link login">Log In</NavLink>
          </>
        )}
      </div>
    </div>
  );
};

export default Navbar;