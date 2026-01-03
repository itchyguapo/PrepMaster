import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

export function useAdminAuth() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/admin/check?supabaseId=${user.id}`);
        if (res.ok) {
          const data = await res.json();
          setIsAdmin(data.isAdmin || false);
        } else {
          setIsAdmin(false);
        }
      } catch (error) {
        console.error("Error checking admin status:", error);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    void checkAdminStatus();
  }, [user]);

  return { isAdmin, loading };
}

