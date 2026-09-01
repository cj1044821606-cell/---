import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { useIdentity } from "@client/src/hooks/use-identity";

/** 根路由：按身份解析结果的默认落地页跳转；接口不可用时兜底到物料库。 */
const RootRedirect: React.FC = () => {
  const navigate = useNavigate();
  const { identity, loading } = useIdentity();

  useEffect(() => {
    if (loading) {
      return;
    }
    if (identity) {
      navigate(
        identity.defaultLanding === "inbox" ? "/inbox" : "/library",
        { replace: true },
      );
      return;
    }
    navigate("/library", { replace: true });
  }, [identity, loading, navigate]);

  return null;
};

export default RootRedirect;
