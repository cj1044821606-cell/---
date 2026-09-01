import React from 'react';
import { Route, Routes } from 'react-router-dom';

import Layout from './components/Layout';
import RootRedirect from './components/RootRedirect';
import InboxPage from './pages/inbox/InboxPage';
import LibraryPage from './pages/library/LibraryPage';
import MaterialDetailPage from './pages/material/MaterialDetailPage';
import MinePage from './pages/mine/MinePage';
import MorePage from './pages/more/MorePage';
import UploadPage from './pages/upload/UploadPage';
import NotFound from './pages/NotFound/NotFound';

const RoutesComponent = () => {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<RootRedirect />} />
        <Route path="inbox" element={<InboxPage />} />
        <Route path="library" element={<LibraryPage />} />
        <Route path="material/:baseRecordId" element={<MaterialDetailPage />} />
        <Route path="mine" element={<MinePage />} />
        <Route path="more" element={<MorePage />} />
        <Route path="upload" element={<UploadPage />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default RoutesComponent;
