import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../Supabase";

const ProfileRedirect = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const redirect = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        navigate(`/profile/${user.id}`);
      } else {
        navigate("/login");
      }
    };

    redirect();
  }, [navigate]);

  return <div>Redirecting to your profile...</div>;
};

export default ProfileRedirect;